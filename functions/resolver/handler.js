'use strict';

const functions = require('../libs/libs.js');
const sns_topic_arn = process.env.SNS_TOPIC_ARN

module.exports.resolver = async (event, context) => {

    try {

        var alert_message = JSON.parse(event['Records'][0]['Sns']['Message'])

    } catch (e) {
        return console.error('Failure parsing JSON for SNS message: $s and failed with error $s', alert_message, e);
    }

    try {

        if (alert_message['AlarmName'] && alert_message['AlarmName'].includes('StatusCheckFailed_Instance')) {

            var alarm_name = alert_message['AlarmName'].split(",").toString()

            var instance_id = alarm_name.substring(
                alarm_name.indexOf("-") + 1, 
                alarm_name.lastIndexOf("-")
            ).split("-", 2).join("-");

            var response = await functions.reboot_ec2_instance(instance_id)

            if (response == 'Abort') {
                console.info('Auto Recovery has been disabled for this Instance, Response returned: %s', JSON.stringify(response))
                await functions.send_to_datadog('Auto Recovery has been disabled for this Instance', instance_id, sns_topic_arn)
            }
            else if (response)
            {
                console.info('Instance has successfully restarted and passed all checks, Response returned: %s', JSON.stringify(response))
                await functions.send_to_datadog('Instance has successfully restarted and passed all checks', instance_id, sns_topic_arn)          
            }

            if (response == false) {

                console.info('Reboot failed, moving to a force stop start attempt')

                var ebs_volumes = await functions.check_ec2_ebs_type(instance_id)

                if (ebs_volumes) {
                    var ec2_check_response = await functions.check_instance_criteria(instance_id)
                    await functions.send_to_datadog(ec2_check_response, instance_id, sns_topic_arn)
                }
                else {
                    console.info('No EBS volume can be found, Instance must be an Instance Store or an unknown Volume Type')
                    await functions.send_to_datadog('No EBS volume can be found, Instance must be an Instance Store or an unknown Volume Type', instance_id, sns_topic_arn)
                }
            }
        }
        else {
           return console.info('SNS Message received does not contain StatusCheckFailed_Instance')
        }
    } catch (e) {
        return console.error('Failure to reboot/recovering instance: %s',instance_id, e);
    }
}