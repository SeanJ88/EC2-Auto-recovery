const aws = require('aws-sdk')
aws.config.update({region: process.env.REGION });
const sns = new aws.SNS()
const ec2 = new aws.EC2()
const autoscale = new aws.AutoScaling()
const cw_client = new aws.CloudWatch()
const alarms = ['StatusCheckFailed_System', 'StatusCheckFailed_Instance']


async function check_ec2_tag_exists_and_add_if_not(instance_id, tags) {

    var params = { Resources: [instance_id], Tags: tags }

    try {

        var instance = {
            Filters: [
                {
                    'Name': 'tag:EC2_Auto_Recovery',
                    'Values': [
                        'Enabled'
                    ]
                }
            ],
            InstanceIds: [
                instance_id,
              ],
           };

        const describeInstances = await ec2.describeInstances(instance).promise();
        
        console.log(JSON.stringify(describeInstances))

        if (describeInstances['Reservations'] && describeInstances['Reservations'].length > 0 &&
        describeInstances['Reservations'][0]['Instances'].length > 0) {
            console.info('Tag EC2_Auto_Recovery exists')
            return false;

        } else {

            var instance = {
                Filters: [
                    {
                        'Name': 'tag:dd-monitoring',
                        'Values': [
                            'true'
                        ]
                    },
                    {
                        'Name': 'tag:dd-mute',
                        'Values': [
                            'false'
                        ]
                    },
                ],
                InstanceIds: [instance_id]
            }

            const describeInstances = await ec2.describeInstances(instance).promise();

            if (describeInstances['Reservations'] && describeInstances['Reservations'].length > 0 &&
            describeInstances['Reservations'][0]['Instances'].length > 0) {
                console.info('Tag EC2_Auto_Recovery Does not Exist, Creating Tag')
                await ec2.createTags(params).promise();
                return describeInstances['Reservations'][0]['Instances'][0]
            }
            else {
                console.info('Monitoring is Muted or Monitoring is not Enabled, Not Adding Required Tag')
                return false
            }
        }
    } catch (e) {
        console.error('Failure describing instance %s with tags: %s', instance_id, tags, e)
    }
}

async function determine_platform(imageid) {
    try {
        const image_info = await ec2.describeImages({ImageIds: [imageid]}).promise();

        if (image_info['Images'] && image_info['Images'].length > 0) {
            var platform_details = image_info['Images'][0]['PlatformDetails']

            console.info('Platform details of image: %s', platform_details)

            if (platform_details.includes('Windows') || platform_details.includes('SQL Server')) {
                return 'Windows'
            }
            if (platform_details.includes('Red Hat')) {
                return 'Red-Hat'
            }
            if (platform_details.includes('SUSE')) {
                return 'SUSE'
            }
            if (platform_details.includes('Linux/UNIX')) {
                if (image_info['Images'][0]['Description'].toLowerCase().includes('ubuntu') || image_info['Images'][0][
                    'Name'].toLowerCase().includes('ubuntu')) {
                    return 'Ubuntu'
                }
                else {
                    return 'Amazon-Linux'
                }
            }
            else {
                return 'Unknown'
            }
        }
        else {
            return 'Unknown'
        }
    }
    catch (e) {
        console.error('Failure describing image %s, %s', imageid, e)
    }
}


// Alarm Name Format: AutoAlarm-<InstanceId>-<platform>-<alarm>-<region>
// Example:  AutoAlarm-i-00e4f327736cb077f-RedHat-StatusCheckFailed_System-eu-west-2
async function create_alarm(instance_id, platform, sns_topic_arn, region) {

    for (var alarm of alarms) {

        var alarmName = `AutoAlarm-${instance_id}-${platform}-${alarm}-${region}`

        var alarmDescription = 'Alarm created by lambda function EC2-recovery-lambda-subscriber-function'

        try {
            var alarmProperties = {
                'AlarmName': alarmName,
                'AlarmDescription': alarmDescription,
                'AlarmActions': [`arn:aws:automate:${region}:ec2:recover`, sns_topic_arn],
                'MetricName': alarm,
                'Namespace': 'AWS/EC2',
                'Dimensions': [{ 'Name': 'InstanceId', 'Value': instance_id}],
                'Period': 300,
                'DatapointsToAlarm': 2,
                'EvaluationPeriods': 2,
                'Threshold': 1,
                'ComparisonOperator': 'GreaterThanOrEqualToThreshold',
                'Statistic': 'Maximum',
                'Tags': [
                    {
                        Key: 'InstanceID',
                        Value: instance_id
                    },
                    {
                        Key: 'AlarmType',
                        Value: alarm
                    },
                    {
                        Key: 'Platform',
                        Value: platform
                    },
                    {
                        Key: 'Company',
                        Value: 'DevOpsGroup'
                    } 
                ]
            }

            console.debug(alarm)

            if (alarm === 'StatusCheckFailed_Instance') {
                alarmProperties['AlarmActions'] = [sns_topic_arn]
                alarmProperties['DatapointsToAlarm'] = 3
                alarmProperties['EvaluationPeriods'] = 3
            }

            await cw_client.putMetricAlarm(alarmProperties).promise();

            console.info('Created alarm %s', alarmName)
        }

        catch (e) {
            console.error('Error creating alarm %s!: %s', alarmName, e)
        }
    }
    return alarmName
}

async function delete_alarm_if_instance_terminated(instance_id) {
    try {
        var alarmNamePrefix = `AutoAlarm-${instance_id}`;
        console.info('Call describe cloudwatch alarms to get alarms with prefix %s', alarmNamePrefix)
        const response = await cw_client.describeAlarms({AlarmNamePrefix: alarmNamePrefix}).promise();
        var alarm_list = []

        if (response['MetricAlarms']) {
            for (var alarm of response['MetricAlarms']) {
                var alarm_name = alarm['AlarmName']
                alarm_list.push(alarm_name)
            }
            await cw_client.deleteAlarms({AlarmNames: alarm_list}).promise();
            return alarm_list
        }
        console.info('No MetricAlarms in response given')
        return false
    } catch (e) {
        console.error('Error deleting alarms for %s, error code: %s', instance_id, e)
    }
}

async function reboot_ec2_instance(instance_id) {

    var instance_successfully_restarted = false;
    var instance_reachability_failed = false;
    var reboot_count = 0;

    instance = await ec2.describeInstances({
        Filters: [
            {
                'Name': 'tag:EC2_Auto_Recovery',
                'Values': [
                    'Disabled'
                ]
            }
        ],
        InstanceIds: [
            instance_id
        ]
    }).promise();

    if (instance['Reservations'] && instance['Reservations'].length > 0 &&
        instance['Reservations'][0]['Instances'].length > 0) {
        console.info('Tag EC2_Auto_Recovery has been disabled...aborting')
        return 'Abort';
    }

    await ec2.rebootInstances({ InstanceIds: [instance_id] }).promise();

    while (instance_successfully_restarted == false || instance_reachability_failed == false) {
        var response = await ec2.describeInstanceStatus({ InstanceIds: [instance_id] }).promise();

        if (response['InstanceStatuses'][0]['InstanceStatus']['Details'][0]['Name'] == 'reachability' &&
            response['InstanceStatuses'][0]['InstanceStatus']['Details'][0]['Status'] == 'failed') {
            console.info('Instance is still in a failed state, reboot instance again')
            reboot_count = reboot_count + 1
            const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));
            await sleep(10000);
            console.info(reboot_count)
            if (reboot_count == 30) {
                console.log('Instance is still in a failed state after 5 minutes after reboot, move to force start stop')
                instance_reachability_failed = true
                return false
            }
        }
        else if (response['InstanceStatuses'][0]['InstanceState']['Name'] == 'running' &&
            response['InstanceStatuses'][0]['InstanceStatus']['Details'][0]['Name'] == 'reachability' &&
            response['InstanceStatuses'][0]['InstanceStatus']['Details'][0]['Status'] == 'passed') {
            console.log('Instance is in a running state from restarting, all checks passed')
            instance_successfully_restarted = true
            return response
        }
    }
}

async function check_ec2_ebs_type(instance_id) {

    var volume_ids = []

    try {
        var instance = await ec2.describeInstances({ InstanceIds: [instance_id] }).promise();

        if (instance['Reservations'] && instance['Reservations'].length > 0 &&
            instance['Reservations'][0]['Instances'].length > 0) {
            var instance_info = instance['Reservations'][0]['Instances'][0]
        }
        else {
            console.info('No EC2 instance found')
            return false
        }

        if (instance_info['BlockDeviceMappings'] && instance_info['BlockDeviceMappings'].length > 0 ) {
            var volumes = instance_info['BlockDeviceMappings']
        }

        if (volumes) {
            for (var volume of volumes) {
                if (volume['Ebs']) {
                    volume_ids.push(volume['Ebs']['VolumeId'])
                }
                else {
                    return false
                }
            }
            return volume_ids
        }
    } catch (e) {
        console.error('Failure describing instance or there is an issue describing the EBS Volumes %s', instance_id)
    }
}

async function check_instance_criteria(instance_id) {

    var response;

    var asg_response = await autoscale.describeAutoScalingInstances({ InstanceIds: [instance_id] }).promise();

    if (asg_response['AutoScalingInstances'] && asg_response['AutoScalingInstances'].length > 0) {
        return response = 'Instance belongs to an AutoScalingGroup'
    }

    var eip_response = await ec2.describeAddresses({      
        Filters: [
        {
            'Name': 'instance-id',
            'Values': [
                instance_id
            ]
        }
    ]}).promise();

    if (eip_response['Addresses'] && eip_response['Addresses'].length > 0 && eip_response['Addresses'][0]['InstanceId'] == instance_id) {
        console.info('Instance Has an EIP Attached')

        var shutdown_behaviour_response = await ec2.describeInstanceAttribute({
            InstanceId: instance_id,
            Attribute: 'instanceInitiatedShutdownBehavior'
        }).promise();

        if (shutdown_behaviour_response['InstanceId'] == instance_id && shutdown_behaviour_response['InstanceInitiatedShutdownBehavior']['Value'] == 'terminate') {
            return response = 'Instance has InstanceInitiatedShutdownBehavior set to Terminate'
        }
        else {
            console.info('InstanceInitiatedShutdownBehavior value is set to stop, proceed with stop start of instance')
            response = await stop_start_instance(instance_id);

            return response;
        }
    }
    else {
        return response = 'Instance Does not have an EIP Attached'
    }
}

async function stop_start_instance(instance_id) {

    var instance_successfully_stopped = false
    var instance_successfully_running = false
    var countUntilForceStop = 0

    console.info('Stopping Instance with ID: %s', instance_id)

    await ec2.stopInstances({ InstanceIds: [instance_id] }).promise();

    while (instance_successfully_stopped == false) {

        var stop_response = await ec2.describeInstances({ InstanceIds: [instance_id] }).promise();
        if (stop_response['Reservations'] && stop_response['Reservations'].length > 0 &&
        stop_response['Reservations'][0]['Instances'].length > 0 && 
        stop_response['Reservations'][0]['Instances'][0]['State']['Name'] == 'stopped') {
            instance_successfully_stopped = true
        }
        else {
            console.info('Instance is still stopping, wait until stopped')
            const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));
            await sleep(10000);
            countUntilForceStop = countUntilForceStop + 1;
        }
        if (countUntilForceStop === 30) {
            console.info("Five Minutes Have Passed Since Instance In Stopping State, Force Stop Instance")
            await ec2.stopInstances({ InstanceIds: [instance_id], Force: true }).promise();
            countUntilForceStop = 0;
        }
    }

    console.info('Starting Instance with ID: %s', instance_id)

    await ec2.startInstances({ InstanceIds: [instance_id] }).promise();

    while (instance_successfully_running == false) {
        var start_response = await ec2.describeInstanceStatus({ InstanceIds: [instance_id] }).promise();

        if (start_response['InstanceStatuses'] && start_response['InstanceStatuses'].length >0 &&
            start_response['InstanceStatuses'][0]['InstanceState']['Name'] == 'running' &&
            start_response['InstanceStatuses'][0]['InstanceStatus']['Details'][0]['Name'] == 'reachability' &&
            start_response['InstanceStatuses'][0]['InstanceStatus']['Details'][0]['Status'] == 'passed') {
            console.log('Instance is in a running state from stop/start, all checks passed')
            instance_successfully_running = true
            return 'Instance is in a running state from stop/start, all checks passed'
        }
        else if (start_response['InstanceStatuses'] && start_response['InstanceStatuses'].length >0 &&
            start_response['InstanceStatuses'][0]['InstanceState']['Name'] == 'running' &&
            start_response['InstanceStatuses'][0]['InstanceStatus']['Details'][0]['Name'] == 'reachability' &&
            start_response['InstanceStatuses'][0]['InstanceStatus']['Details'][0]['Status'] == 'failed') {
            return 'Instance has been stopped/started but has still failed an instance check'
        }
        else {
            console.info('Instance is still starting, wait until running and checks have passed')
            const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));
            await sleep(10000);
        }
    }
}

async function send_to_datadog(event, instance_id, sns_topic_arn) {

    var eventText = JSON.stringify(event + ', InstanceID: ' + instance_id, null, 2);

    console.info("Received event:", eventText);

    var params = {
        Message: eventText,
        Subject: "EC2 Recovery Lambda Response",
        TopicArn: sns_topic_arn
    };

    await sns.publish(params).promise();
}

module.exports = {
    check_ec2_tag_exists_and_add_if_not,
    determine_platform,
    create_alarm,
    delete_alarm_if_instance_terminated,
    reboot_ec2_instance,
    check_ec2_ebs_type,
    check_instance_criteria,
    send_to_datadog,
}