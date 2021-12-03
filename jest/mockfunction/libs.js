const aws = require('aws-sdk')
const sns = new aws.SNS()
const ec2 = new aws.EC2()
const autoscale = new aws.AutoScaling()
const cloudwatchevents = new aws.CloudWatchEvents();
const cw_client = new aws.CloudWatch()
const alarms = ['StatusCheckFailed_System', 'StatusCheckFailed_Instance']

function check_ec2_tag_exists_and_add_if_not(instance_id, tags) {

    var params = { Resources: [instance_id], Tags: tags }

    try {
        const instance = {
            "Reservations": [
                {
                    "Groups": [],
                    "Instances": [
                        {
                            "AmiLaunchIndex": 0,
                            "ImageId": "ami-0abcdef1234567890",
                            "InstanceId": "i-1234567890abcdef0",
                            "InstanceType": "t2.micro",
                            "KeyName": "MyKeyPair",
                            "LaunchTime": "2018-05-10T08:05:20.000Z",
                            "Monitoring": {
                                "State": "disabled"
                            },
                            "Placement": {
                                "AvailabilityZone": "us-east-2a",
                                "GroupName": "",
                                "Tenancy": "default"
                            },
                            "PrivateDnsName": "ip-10-0-0-157.us-east-2.compute.internal",
                            "PrivateIpAddress": "10.0.0.157",
                            "ProductCodes": [],
                            "PublicDnsName": "",
                            "State": {
                                "Code": 0,
                                "Name": "pending"
                            },
                            "StateTransitionReason": "",
                            "SubnetId": "subnet-04a636d18e83cfacb",
                            "VpcId": "vpc-1234567890abcdef0",
                            "Architecture": "x86_64",
                            "BlockDeviceMappings": [],
                            "ClientToken": "",
                            "EbsOptimized": false,
                            "Hypervisor": "xen",
                            "NetworkInterfaces": [
                                {
                                    "Attachment": {
                                        "AttachTime": "2018-05-10T08:05:20.000Z",
                                        "AttachmentId": "eni-attach-0e325c07e928a0405",
                                        "DeleteOnTermination": true,
                                        "DeviceIndex": 0,
                                        "Status": "attaching"
                                    },
                                    "Description": "",
                                    "Groups": [
                                        {
                                            "GroupName": "MySecurityGroup",
                                            "GroupId": "sg-0598c7d356eba48d7"
                                        }
                                    ],
                                    "Ipv6Addresses": [],
                                    "MacAddress": "0a:ab:58:e0:67:e2",
                                    "NetworkInterfaceId": "eni-0c0a29997760baee7",
                                    "OwnerId": "123456789012",
                                    "PrivateDnsName": "ip-10-0-0-157.us-east-2.compute.internal",
                                    "PrivateIpAddress": "10.0.0.157",
                                    "PrivateIpAddresses": [
                                        {
                                            "Primary": true,
                                            "PrivateDnsName": "ip-10-0-0-157.us-east-2.compute.internal",
                                            "PrivateIpAddress": "10.0.0.157"
                                        }
                                    ],
                                    "SourceDestCheck": true,
                                    "Status": "in-use",
                                    "SubnetId": "subnet-04a636d18e83cfacb",
                                    "VpcId": "vpc-1234567890abcdef0",
                                    "InterfaceType": "interface"
                                }
                            ],
                            "RootDeviceName": "/dev/xvda",
                            "RootDeviceType": "ebs",
                            "SecurityGroups": [
                                {
                                    "GroupName": "MySecurityGroup",
                                    "GroupId": "sg-0598c7d356eba48d7"
                                }
                            ],
                            "SourceDestCheck": true,
                            "StateReason": {
                                "Code": "pending",
                                "Message": "pending"
                            },
                            "Tags": [

                            ],
                            "VirtualizationType": "hvm",
                            "CpuOptions": {
                                "CoreCount": 1,
                                "ThreadsPerCore": 1
                            },
                            "CapacityReservationSpecification": {
                                "CapacityReservationPreference": "open"
                            },
                            "MetadataOptions": {
                                "State": "pending",
                                "HttpTokens": "optional",
                                "HttpPutResponseHopLimit": 1,
                                "HttpEndpoint": "enabled"
                            }
                        }
                    ],
                    "OwnerId": "123456789012",
                    "ReservationId": "r-02a3f596d91211712",
                }]
        }

        console.info(JSON.stringify(instance))

        if (instance['Reservations'] && instance['Reservations'].length > 0 &&
            instance['Reservations'][0]['Instances'].length > 0) {
            console.info('Tag EC2_Auto_Recovery Does not Exist, Creating Tag')
            console.log("Run ec2.create tags command and add tags")
            console.info(params)
            //ec2.create_tags(params)
            return instance['Reservations'][0]['Instances'][0]
        }
        else {
            console.info('Monitoring is Muted or Monitoring is not Enabled, Not Adding Required Tag')
            return false
        }
    } catch (e) {
        console.error('Failure describing instance %s with tags: %s', instance_id, tags, e)
    }
}

function determine_platform(imageid) {
    try {
        var image_info = {
            "Images": [
                {
                    "VirtualizationType": "hvm",
                    "Description": "Provided by Red Hat, Inc.",
                    "PlatformDetails": "Red Hat Enterprise Linux",
                    "EnaSupport": true,
                    "Hypervisor": "xen",
                    "State": "available",
                    "SriovNetSupport": "simple",
                    "ImageId": "ami-1234567890EXAMPLE",
                    "UsageOperation": "RunInstances:0010",
                    "BlockDeviceMappings": [
                        {
                            "DeviceName": "/dev/sda1",
                            "Ebs": {
                                "SnapshotId": "snap-111222333444aaabb",
                                "DeleteOnTermination": true,
                                "VolumeType": "gp2",
                                "VolumeSize": 10,
                                "Encrypted": false
                            }
                        }
                    ],
                    "Architecture": "x86_64",
                    "ImageLocation": "123456789012/RHEL-8.0.0_HVM-20190618-x86_64-1-Hourly2-GP2",
                    "RootDeviceType": "ebs",
                    "OwnerId": "123456789012",
                    "RootDeviceName": "/dev/sda1",
                    "CreationDate": "2019-05-10T13:17:12.000Z",
                    "Public": true,
                    "ImageType": "machine",
                    "Name": "RHEL-8.0.0_HVM-20190618-x86_64-1-Hourly2-GP2"
                }
            ]
        }

        if (image_info['Images'] && image_info['Images'].length > 0) {
            var platform_details = image_info['Images'][0]['PlatformDetails']

            console.debug('Platform details of image: %s', platform_details)

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
                if (image_info['Images'][0]['Description'].lower().includes('ubuntu') || image_info['Images'][0][
                    'Name'].lower().includes('ubuntu')) {
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
function create_alarm(instance_id, platform, sns_topic_arn, region) {

    for (const alarm of alarms) {

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

            console.info(JSON.stringify(alarmProperties))

            //cw_client.put_metric_alarm(alarmProperties)
            console.log('call put metric alarm here for cloudwatch client')

            console.info('Created alarm %s', alarmName)

            var eventrule = create_cloudwatch_eventrule(sns_topic_arn)

            console.info('Created event rule %s', JSON.stringify(eventrule))

            return alarmName + ' ' + JSON.stringify(eventrule)
        }

        catch (e) {
            console.error('Error creating alarm %s!: %s', alarmName, e)
        }

    }
}

function create_cloudwatch_eventrule(sns_topic_arn) {

    try {
        var cloudwatchRule =
        {
            Name: 'EC2-Recovery-status-trigger',
            Description: 'Event Rule to Trigger if EC2 Recovery is a Success or Failure',
            EventPattern:
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
            }
        }

        console.info(JSON.stringify(cloudwatchRule))

        var target =
        {
            Rule: cloudwatchRule,
            Targets: [{
                Id: 'DataDogSNSTopic',
                Arn: sns_topic_arn
            }]
        }

        console.info(JSON.stringify(target))

        return target
    } catch (e) {
        console.error('Error creating event rule or adding target %s, error code: %s', cloudwatchRule, e)
    }
}

function delete_alarm_if_instance_terminated(instance_id) {
    try {
        var alarmNamePrefix = `AutoAlarm-${instance_id}`;
        console.info('Call describe cloudwatch alarms to get alarms with prefix %s', alarmNamePrefix)
        const response = cw_client.describeAlarms(AlarmNamePrefix = alarmNamePrefix)
        var alarm_list = []
        if ('MetricAlarms' in response) {
            for (alarm in response['MetricAlarms']) {
                var alarm_name = alarm['AlarmName']
                alarm_list.append(alarm_name)
            }
            cw_client.delete_alarms(AlarmNames = alarm_list)
            return AlarmNames
        }
        console.info('No MetricAlarms in response given')
        return false
    } catch (e) {
        console.error('Error deleting alarms for %s, error code: %s', instance_id, e)
    }
}

function reboot_ec2_instance(instance_id) {

    var instance_successfully_restarted = false;
    var instance_reachability_failed = false;
    var reboot_count = 0;

    const instance = {
        "Reservations": [
            {
                "Groups": [],
                "Instances": [
                    {
                        "AmiLaunchIndex": 0,
                        "ImageId": "ami-0abcdef1234567890",
                        "InstanceId": "i-1234567890abcdef0",
                        "InstanceType": "t2.micro",
                        "KeyName": "MyKeyPair",
                        "LaunchTime": "2018-05-10T08:05:20.000Z",
                        "Monitoring": {
                            "State": "disabled"
                        },
                        "Placement": {
                            "AvailabilityZone": "us-east-2a",
                            "GroupName": "",
                            "Tenancy": "default"
                        },
                        "PrivateDnsName": "ip-10-0-0-157.us-east-2.compute.internal",
                        "PrivateIpAddress": "10.0.0.157",
                        "ProductCodes": [],
                        "PublicDnsName": "",
                        "State": {
                            "Code": 0,
                            "Name": "pending"
                        },
                        "StateTransitionReason": "",
                        "SubnetId": "subnet-04a636d18e83cfacb",
                        "VpcId": "vpc-1234567890abcdef0",
                        "Architecture": "x86_64",
                        "BlockDeviceMappings": [],
                        "ClientToken": "",
                        "EbsOptimized": false,
                        "Hypervisor": "xen",
                        "NetworkInterfaces": [
                            {
                                "Attachment": {
                                    "AttachTime": "2018-05-10T08:05:20.000Z",
                                    "AttachmentId": "eni-attach-0e325c07e928a0405",
                                    "DeleteOnTermination": true,
                                    "DeviceIndex": 0,
                                    "Status": "attaching"
                                },
                                "Description": "",
                                "Groups": [
                                    {
                                        "GroupName": "MySecurityGroup",
                                        "GroupId": "sg-0598c7d356eba48d7"
                                    }
                                ],
                                "Ipv6Addresses": [],
                                "MacAddress": "0a:ab:58:e0:67:e2",
                                "NetworkInterfaceId": "eni-0c0a29997760baee7",
                                "OwnerId": "123456789012",
                                "PrivateDnsName": "ip-10-0-0-157.us-east-2.compute.internal",
                                "PrivateIpAddress": "10.0.0.157",
                                "PrivateIpAddresses": [
                                    {
                                        "Primary": true,
                                        "PrivateDnsName": "ip-10-0-0-157.us-east-2.compute.internal",
                                        "PrivateIpAddress": "10.0.0.157"
                                    }
                                ],
                                "SourceDestCheck": true,
                                "Status": "in-use",
                                "SubnetId": "subnet-04a636d18e83cfacb",
                                "VpcId": "vpc-1234567890abcdef0",
                                "InterfaceType": "interface"
                            }
                        ],
                        "RootDeviceName": "/dev/xvda",
                        "RootDeviceType": "ebs",
                        "SecurityGroups": [
                            {
                                "GroupName": "MySecurityGroup",
                                "GroupId": "sg-0598c7d356eba48d7"
                            }
                        ],
                        "SourceDestCheck": true,
                        "StateReason": {
                            "Code": "pending",
                            "Message": "pending"
                        },
                        "Tags": [{
                            "EC2_Auto_Recovery": "Enabled"
                        }],
                        "VirtualizationType": "hvm",
                        "CpuOptions": {
                            "CoreCount": 1,
                            "ThreadsPerCore": 1
                        },
                        "CapacityReservationSpecification": {
                            "CapacityReservationPreference": "open"
                        },
                        "MetadataOptions": {
                            "State": "pending",
                            "HttpTokens": "optional",
                            "HttpPutResponseHopLimit": 1,
                            "HttpEndpoint": "enabled"
                        }
                    }
                ],
                "OwnerId": "123456789012",
                "ReservationId": "r-02a3f596d91211712",
            }]
    }

    if ('Reservations' in instance && instance['Reservations'].length > 0 &&
        instance['Reservations'][0]['Instances'].length > 0 && instance['Reservations'][0]['Instances'][0]['Tags'][0]['EC2_Auto_Recovery'] == 'Disabled') {
        console.info('Tag EC2_Auto_Recovery has been disabled...aborting')
        return 'Abort';
    }

    console.log('Call reboot ec2 instance api and reboot instance with instance_id', instance_id)

    while (instance_successfully_restarted == false || instance_reachability_failed == false) {
        console.info('Call describe instance status api to check status of instance')

        var response =
        {
            "InstanceStatuses": [
                {
                    "InstanceId": "i-123456",
                    "InstanceState": {
                        "Code": 16,
                        "Name": "running"
                    },
                    "AvailabilityZone": "us-east-1d",
                    "SystemStatus": {
                        "Status": "ok",
                        "Details": [
                            {
                                "Status": "passed",
                                "Name": "reachability"
                            }
                        ]
                    },
                    "InstanceStatus": {
                        "Status": "ok",
                        "Details": [
                            {
                                "Status": "failed",
                                "Name": "reachability"
                            }
                        ]
                    }
                }
            ]
        }

        console.log(JSON.stringify(response))

        if (response['InstanceStatuses'][0]['InstanceStatus']['Details'][0]['Name'] == 'reachability' &&
            response['InstanceStatuses'][0]['InstanceStatus']['Details'][0]['Status'] == 'failed') {
            console.info('Instance is still in a failed state, reboot instance again')
            console.info('code to reboot instance here')
            reboot_count = reboot_count + 1
            console.info(reboot_count)
            if (reboot_count == 5) {
                console.log('Instance is still in a failed state after 5 reboot attempts, move to force start stop')
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

function check_ec2_ebs_type(instance_id) {

    var volume_ids = []

    try {
        const instance = {
            "Reservations": [
                {
                    "Groups": [],
                    "Instances": [
                        {
                            "AmiLaunchIndex": 0,
                            "ImageId": "ami-0abcdef1234567890",
                            "InstanceId": "i-1234567890abcdef0",
                            "InstanceType": "t2.micro",
                            "KeyName": "MyKeyPair",
                            "LaunchTime": "2018-05-10T08:05:20.000Z",
                            "Monitoring": {
                                "State": "disabled"
                            },
                            "Placement": {
                                "AvailabilityZone": "us-east-2a",
                                "GroupName": "",
                                "Tenancy": "default"
                            },
                            "PrivateDnsName": "ip-10-0-0-157.us-east-2.compute.internal",
                            "PrivateIpAddress": "10.0.0.157",
                            "ProductCodes": [],
                            "PublicDnsName": "",
                            "State": {
                                "Code": 0,
                                "Name": "pending"
                            },
                            "StateTransitionReason": "",
                            "SubnetId": "subnet-04a636d18e83cfacb",
                            "VpcId": "vpc-1234567890abcdef0",
                            "Architecture": "x86_64",
                            "BlockDeviceMappings": [
                                {
                                    "DeviceName": "/dev/xvda",
                                    "Ebs": {
                                        "Status": "attached",
                                        "DeleteOnTermination": true,
                                        "VolumeId": "vol-XXXXX",
                                        "AttachTime": "2019-02-27T07:56:07.000Z"
                                    }
                                },
                                {
                                    "DeviceName": "/dev/sdm",
                                    "Ebs": {
                                        "Status": "attached",
                                        "DeleteOnTermination": false,
                                        "VolumeId": "vol-XXXXX",
                                        "AttachTime": "2019-02-27T07:58:02.000Z"
                                    }
                                }
                            ],
                            "ClientToken": "",
                            "EbsOptimized": false,
                            "Hypervisor": "xen",
                            "NetworkInterfaces": [
                                {
                                    "Attachment": {
                                        "AttachTime": "2018-05-10T08:05:20.000Z",
                                        "AttachmentId": "eni-attach-0e325c07e928a0405",
                                        "DeleteOnTermination": true,
                                        "DeviceIndex": 0,
                                        "Status": "attaching"
                                    },
                                    "Description": "",
                                    "Groups": [
                                        {
                                            "GroupName": "MySecurityGroup",
                                            "GroupId": "sg-0598c7d356eba48d7"
                                        }
                                    ],
                                    "Ipv6Addresses": [],
                                    "MacAddress": "0a:ab:58:e0:67:e2",
                                    "NetworkInterfaceId": "eni-0c0a29997760baee7",
                                    "OwnerId": "123456789012",
                                    "PrivateDnsName": "ip-10-0-0-157.us-east-2.compute.internal",
                                    "PrivateIpAddress": "10.0.0.157",
                                    "PrivateIpAddresses": [
                                        {
                                            "Primary": true,
                                            "PrivateDnsName": "ip-10-0-0-157.us-east-2.compute.internal",
                                            "PrivateIpAddress": "10.0.0.157"
                                        }
                                    ],
                                    "SourceDestCheck": true,
                                    "Status": "in-use",
                                    "SubnetId": "subnet-04a636d18e83cfacb",
                                    "VpcId": "vpc-1234567890abcdef0",
                                    "InterfaceType": "interface"
                                }
                            ],
                            "RootDeviceName": "/dev/xvda",
                            "RootDeviceType": "ebs",
                            "SecurityGroups": [
                                {
                                    "GroupName": "MySecurityGroup",
                                    "GroupId": "sg-0598c7d356eba48d7"
                                }
                            ],
                            "SourceDestCheck": true,
                            "StateReason": {
                                "Code": "pending",
                                "Message": "pending"
                            },
                            "Tags": [

                            ],
                            "VirtualizationType": "hvm",
                            "CpuOptions": {
                                "CoreCount": 1,
                                "ThreadsPerCore": 1
                            },
                            "CapacityReservationSpecification": {
                                "CapacityReservationPreference": "open"
                            },
                            "MetadataOptions": {
                                "State": "pending",
                                "HttpTokens": "optional",
                                "HttpPutResponseHopLimit": 1,
                                "HttpEndpoint": "enabled"
                            }
                        }
                    ],
                    "OwnerId": "123456789012",
                    "ReservationId": "r-02a3f596d91211712",
                }]
        }

        if (instance['Reservations'] && instance['Reservations'].length > 0 &&
            instance['Reservations'][0]['Instances'].length > 0) {
            var instance_info = instance['Reservations'][0]['Instances'][0]
            console.log(instance_info)
        }
        else {
            console.info('No EC2 instance found')
            return false
        }

        if (instance_info['BlockDeviceMappings'].length > 0) {
            var volumes = instance_info['BlockDeviceMappings']
        }
        else {
            return console.log('No Volumes attached to Instance')
        }

        console.log(volumes)

        for (const volume of volumes) {
            console.log(volume)
            if (volume['Ebs']) {
                volume_ids.push(volume['Ebs']['VolumeId'])
                console.log(volume_ids)
            }
            else {
                return false
            }
        }
        return volume_ids
    } catch (e) {
        console.error('Failure describing instance %s', instance_id, e)
    }
}

function check_instance_criteria(instance_id) {

    var response;

    //var asg_response = autoscale.describeAutoScalingInstances({InstanceIds: [instance_id]})
    var asg_response = {
        "AutoScalingInstances": [
            // {
            //     "InstanceId": "i-06905f55584de02da",
            //     "InstanceType": "t2.micro",
            //     "AutoScalingGroupName": "my-asg",
            //     "AvailabilityZone": "us-west-2b",
            //     "LifecycleState": "InService",
            //     "HealthStatus": "HEALTHY",
            //     "ProtectedFromScaleIn": false,
            //     "LaunchTemplate": {
            //         "LaunchTemplateId": "lt-1234567890abcde12",
            //         "LaunchTemplateName": "my-launch-template",
            //         "Version": "1"
            //     }
            // }
        ]
    }

    if (asg_response['AutoScalingInstances'] && asg_response['AutoScalingInstances'].length > 0) {
        return response = 'Instance belongs to an AutoScalingGroup'
    }

    var eip_response =
    {
        "Addresses": [
            {
                "InstanceId": "i-123456",
                "PublicIp": "198.51.100.0",
                "PublicIpv4Pool": "amazon",
                "Domain": "standard"
            },
            {
                "Domain": "vpc",
                "PublicIpv4Pool": "amazon",
                "InstanceId": "i-1234567890abcdef0",
                "NetworkInterfaceId": "eni-12345678",
                "AssociationId": "eipassoc-12345678",
                "NetworkInterfaceOwnerId": "123456789012",
                "PublicIp": "203.0.113.0",
                "AllocationId": "eipalloc-12345678",
                "PrivateIpAddress": "10.0.1.241"
            }
        ]
    }

    // var eip_response = ec2.describe-addresses({      
    //     Filters: [
    //     {
    //         'Name': 'EC2_Auto_Recovery',
    //         'Values': [
    //             'Enabled'
    //         ]
    //     }
    // ]})

    if (eip_response['Addresses'] && eip_response['Addresses'].length > 0 && eip_response['Addresses'][0]['InstanceId'] == instance_id) {
        console.info('Instance Has an EIP Attached')

        // var shutdown_behaviour_response = ec2.describeInstanceAttribute({
        //     InstanceId: InstanceId, 
        //     Attribute: 'instanceInitiatedShutdownBehavior'
        // })
        var shutdown_behaviour_response =
        {
            "InstanceId": "i-123456",
            "InstanceInitiatedShutdownBehavior": {
                "Value": "terminate"
            }
        }

        if (shutdown_behaviour_response['InstanceId'] == instance_id && shutdown_behaviour_response['InstanceInitiatedShutdownBehavior']['Value'] == 'stop') {
            return response = 'Instance has InstanceInitiatedShutdownBehavior set to Terminate'
        }
        else {
            console.info('InstanceInitiatedShutdownBehavior value is set to stop, proceed with stop start of instance')
            response = stop_start_instance(instance_id);

            return response;
        }
    }
    else {
        return response = 'Instance Does not have an EIP Attached'
    }
}

function stop_start_instance(instance_id) {

    var instance_successfully_stopped = false
    var instance_successfully_running = false

    console.info('Stopping Instance with ID: %s', instance_id)

    ec2.stopInstances({ InstanceIds: instance_id })

    while (instance_successfully_stopped == false) {
        //var stop_response = ec2.describe_instance_status({InstanceIds: [instance_id]})

        var stop_response =
        {
            "InstanceStatuses": [
                {
                    "InstanceId": "i-123456",
                    "InstanceState": {
                        "Code": 16,
                        "Name": "stopped"
                    },
                    "AvailabilityZone": "us-east-1d",
                    "SystemStatus": {
                        "Status": "ok",
                        "Details": [
                            {
                                "Status": "passed",
                                "Name": "reachability"
                            }
                        ]
                    },
                    "InstanceStatus": {
                        "Status": "ok",
                        "Details": [
                            {
                                "Status": "failed",
                                "Name": "reachability"
                            }
                        ]
                    }
                }
            ]
        }

        console.log(JSON.stringify(stop_response))

        if (stop_response['InstanceStatuses'][0]['InstanceState']['Name'] == 'stopped') {
            instance_successfully_stopped = true
        }
        else {
            console.info('Instance is still stopping, wait until stopped')
        }
    }

    console.info('Starting Instance with ID: %s', instance_id)

    ec2.startInstances({ InstanceIds: instance_id })

    while (instance_successfully_running == false) {
        //var start_response = ec2.describe_instance_status({InstanceIds: [instance_id]})

        var start_response =
        {
            "InstanceStatuses": [
                {
                    "InstanceId": "i-123456",
                    "InstanceState": {
                        "Code": 16,
                        "Name": "running"
                    },
                    "AvailabilityZone": "us-east-1d",
                    "SystemStatus": {
                        "Status": "ok",
                        "Details": [
                            {
                                "Status": "passed",
                                "Name": "reachability"
                            }
                        ]
                    },
                    "InstanceStatus": {
                        "Status": "ok",
                        "Details": [
                            {
                                "Status": "passed",
                                "Name": "reachability"
                            }
                        ]
                    }
                }
            ]
        }

        if (start_response['InstanceStatuses'][0]['InstanceState']['Name'] == 'running' &&
            start_response['InstanceStatuses'][0]['InstanceStatus']['Details'][0]['Name'] == 'reachability' &&
            start_response['InstanceStatuses'][0]['InstanceStatus']['Details'][0]['Status'] == 'passed') {
            console.log('Instance is in a running state from stop/start, all checks passed')
            instance_successfully_running = true
            return 'Instance is in a running state from stop/start, all checks passed'
        }
        else if (start_response['InstanceStatuses'][0]['InstanceState']['Name'] == 'running' &&
        start_response['InstanceStatuses'][0]['InstanceStatus']['Details'][0]['Name'] == 'reachability' &&
        start_response['InstanceStatuses'][0]['InstanceStatus']['Details'][0]['Status'] == 'failed') {
            return 'Instance has been stopped/started but has still failed an instance check'
        }
        else {
            console.info('Instance is still starting, wait until running')
        }
    }
}

function send_to_datadog(event, instance_id, sns_topic_arn) {

    var eventText = JSON.stringify(event + ', InstanceID: ' + instance_id, null, 2);

    console.info("Received event:", eventText);

    var params = {
        Message: eventText, 
        Subject: "EC2 Recovery Lambda Response",
        TopicArn: sns_topic_arn
    };

    console.info(params)

    sns.publish(params);
}

module.exports = {
    check_ec2_tag_exists_and_add_if_not,
    determine_platform,
    create_alarm,
    create_cloudwatch_eventrule,
    delete_alarm_if_instance_terminated,
    reboot_ec2_instance,
    check_ec2_ebs_type,
    check_instance_criteria,
    send_to_datadog,
}