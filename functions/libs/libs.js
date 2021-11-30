const aws = require('aws-sdk')
const sns = new aws.SNS()
const ec2 = new aws.EC2()
const cloudwatchevents = new aws.CloudWatchEvents();
const cw_client = new aws.CloudWatch()
const alarms = ['StatusCheckFailed_System', 'StatusCheckFailed_Instance']

export function check_ec2_tag_exists_and_add_if_not(instance_id, tags) {

    var params = { Resources: [instance_id], Tags=tags }

    try {
        instance = ec2.describe_instances({
            Filters=[
                {
                    'Name': 'EC2_Auto_Recovery',
                    'Values': [
                        'Enabled'
                    ]
                }
            ],
            InstanceIds=[
                instance_id
            ]
        })

        if ('Reservations' in instance && len(instance['Reservations']) > 0 &&
            len(instance['Reservations'][0]['Instances']) > 0) {
            console.info('Tag EC2_Recovery_Enabled_already exists')
            return false;

        } else {

            instance = ec2.describe_instances({
                Filters=[
                    {
                        'Name': 'dd-monitoring',
                        'Values': [
                            'true'
                        ]
                    },
                    {
                        'Name': 'dd-mute',
                        'Values': [
                            'false'
                        ]
                    },
                ],
                InstanceIds=[
                    instance_id
                ]
            })
            if ('Reservations' in instance && len(instance['Reservations']) > 0 &&
                len(instance['Reservations'][0]['Instances']) > 0) {
                console.info('Tag EC2_Recovery_Enabled Does not Exist, Creating Tag')
                ec2.create_tags(params)
                return instance['Reservations'][0]['Instances'][0]
            }
            else {
                console.info('Monitoring is Muted or Monitoring is not Enabled, Not Adding Required Tag')
                return false
            }
        }
    } catch (e) {
        console.error('Failure describing instance $s with tags: $s', instance_id, tags)
    }
}

export function determine_platform(imageid) {
    try {
        image_info = ec2.describe_images(ImageIds = [imageid])

        if ('Images' in image_info && len(image_info['Images']) > 0) {
            platform_details = image_info['Images'][0]['PlatformDetails']

            console.debug('Platform details of image: %s', platform_details)

            if ('Windows' in platform_details || 'SQL Server' in platform_details) {
                return 'Windows'
            }
            if ('Red Hat' in platform_details) {
                return 'Red-Hat'
            }
            if ('SUSE' in platform_details) {
                return 'SUSE'
            }
            if ('Linux/UNIX' in platform_details) {
                if ('ubuntu' in image_info['Images'][0]['Description'].lower() || 'ubuntu' in image_info['Images'][0][
                    'Name'].lower()) {
                    return 'Ubuntu'
                }
                else {
                    return 'Amazon-Linux'
                }
            }
            else {
                return None
            }
        }
        else {
            return None
        }
    }
    catch (e) {
        console.error('Failure describing image $s, $s', imageid, e)
    }
}


// Alarm Name Format: AutoAlarm-<InstanceId>-<platform>-<alarm>-<region>
// Example:  AutoAlarm-i-00e4f327736cb077f-RedHat-StatusCheckFailed_System-eu-west-2
export function create_alarm(instance_id, platform, sns_topic_arn, region) {

    for (alarm in alarms) {

        var params = {
            Tags: [
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
                },
            ]
        };

        var alarmName = `ÀutoAlarm-${instance_id}-${platform}-${alarm}-${region}`

        var alarmDescription = 'Alarm created by lambda function EC2-recovery-lambda-subscriber-function'

        try {
            var alarmProperties = {
                'AlarmName': alarmName,
                'AlarmDescription': alarmDescription,
                'AlarmActions': [`arn:aws:automate:${region}:ec2:recover`, `${sns_topic_arn}`],
                'MetricName': alarm,
                'Namespace': 'AWS/EC2',
                'Dimensions': ['Name=InstanceId', `Value=${instance_id}`],
                'Period': 300,
                'DatapointsToAlarm': 2,
                'EvaluationPeriods': 2,
                'Threshold': 1,
                'ComparisonOperator': 'GreaterThanOrEqualToThreshold',
                'Statistic': 'Maximum',
                'Tags': params
            }

            if (alarm === 'StatusCheckFailed_Instance') {
                alarmProperties['AlarmActions'] = [sns_topic_arn]
                alarmProperties['DatapointsToAlarm'] = 3
                alarmProperties['EvaluationPeriods'] = 3
            }

            cw_client.put_metric_alarm(alarmProperties)

            console.info('Created alarm %s', alarmName)

            create_cloudwatch_eventrule(sns_topic_arn)
        }

        catch (e) {
            console.error('Error creating alarm %s!: %s', alarmName, e)
        }

    }
}

export function create_cloudwatch_eventrule(sns_topic_arn) {

    try {
        var cloudwatchRule = cloudwatchevents.putRule({
            Name: 'EC2-Recovery-status-trigger',
            Description: 'Event rule to trigger if EC2 Recovery is a success of failure',
            EventPattern: JSON.parse(
                {
                    'detail': {
                        'eventTypeCategory': [
                            'issue'
                        ],
                        'service': [
                            'EC2'
                        ],
                        'eventTypeCodes': [
                            'AWS_EC2_INSTANCE_AUTO_RECOVERY_FAILURE',
                            'AWS_EC2_INSTANCE_AUTO_RECOVERY_SUCCESS'
                        ]
                    },
                    'detail-type': [
                        'AWS Health Event'
                    ],
                    'source': [
                        'aws.health'
                    ]
                })
        })

        cloudwatchevents.putTargets({
            Rule: cloudwatchRule,
            Targets: [{
                Id: 'DataDogSNSTopic',
                Arn: sns_topic_arn
            }]
        })
    } catch (e) {
        console.error('Error creating event rule or adding target $s, error code: $s', cloudwatchRule, e)
    }
}

export function delete_alarm_if_instance_terminated(instance_id) {
    try {
        var alarmNamePrefix = `AutoAlarm-${instance_id}`;
        console.info('Call describe cloudwatch alarms to get alarms with prefix $s', alarmNamePrefix)
        const response = cw_client.describeAlarms(AlarmNamePrefix = alarmNamePrefix)
        var alarm_list = []
        if ('MetricAlarms' in response) {
            for (alarm in response['MetricAlarms']) {
                var alarm_name = alarm['AlarmName']
                alarm_list.append(alarm_name)
            }
            cw_client.devare_alarms(AlarmNames = alarm_list)
        }
        return true
    } catch (e) {
        console.error('Error devaring alarms for $s, error code: $s', instance_id, e)
    }
}

export function reboot_ec2_instance(instance_id) {

    var instance_successfully_restarted = false;
    var instance_reachability_failed = false;

    ec2.reboot_instances(InstanceIds=[instance_id])

    while (instance_successfully_restarted == false || instance_reachability_failued == false) {
        var response = ec2.describe_instance_status(InstanceIds=[instance_id])

        if (response['InstanceStatuses'][0]['instance-status']['reachability'] == 'failed') {
            console.info('Instance successfully restarted')
            instance_reachability_failed = true
            return false
        }
        else if (response['InstanceStatuses'][0]['InstanceState']['Name'] == 'running') {
            console.info('Instance successfully restarted')
            instance_successfully_restarted = true
            return true
        }
    }
}

export function check_ec2_ebs_type(instance_id) {

    var volume_ids = []

    try {
        var instance = ec2.describeInstances(InstanceIds=[instance_id])

        if ('Reservations' in instance && len(instance['Reservations']) > 0 &&
            len(instance['Reservations'][0]['Instances']) > 0) {
            instance_info = instance['Reservations'][0]['Instances'][0]
        }
        else {
            console.info('No EC2 instance found')
            return false
        }

        var volumes = instance_info['BlockDeviceMappings']

        for (volume in volumes) {
            if ('Ebs' in volume) {
                volume_ids.append(volume['Ebs']['VolumeId'])
            }
            else {
                return false
            }
        }
        return volume_ids
    } catch (e) {
        console.error('Failure describing instance $s', instance_id)
    }


}