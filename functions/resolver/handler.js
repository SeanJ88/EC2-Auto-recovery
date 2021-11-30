'use strict';

const functions = require('../libs/libs.js');
const sns_topic_arn = process.env.SNS_TOPIC_ARN

module.exports.resolver = async (event, context) => {

    console.log(JSON.stringify(event))

    try {

        var alert_message = JSON.parse(JSON.stringify(event))['Records'][0]['Sns']['Message']

    } catch (e) {
        console.error('Failure parsing JSON for SNS message: $s and failed with error $s', alert_message, e);
    }

    var json_alert_message = JSON.stringify(alert_message)

    try {

        if (json_alert_message['AlarmName'].includes('StatusCheckFailed_Instance')) {

            var instance_id = json_alert_message['Tags']['InstanceID']

            functions.reboot_ec2_instance(instance_id)
        }

        var response = functions.reboot_ec2_instance(instance_id)

        if (response == false) {
            
            console.info ('reboot failed, try force stop start')

            var ebs_volumes = functions.check_ec2_ebs_type(instance_id)

            if (ebs_volumes) {
                //write code here that will stop the instance and start it again
                //If EIP on the instance then stop and start
                //if no EIP then return false and send SNS message for unable to stop due to no EIP
            }
            else {
                //EBS volume does not exist so must be an instance store send response to SNS topic.
            }
        }
        else {
            console.info('SNS Message recieved does not contain and instance_id or is not of correct Volume type')
            return {
                'statusCode': 200,
                'body': json_alert_message
            }
        }
    } catch (e) {
        console.error('Failure reboot/recovering instance $s', e);
    }
}