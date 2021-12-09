'use strict';

const aws = require('aws-sdk')
aws.config.update({ region: process.env.REGION });
const ec2 = new aws.EC2()
const functions = require('../libs/libs.js');
const tag_string = process.env.TAGS
const sns_topic_arn = process.env.SNS_TOPIC_ARN
const region = process.env.REGION

module.exports.initialTags = async (event, context) => {
  try {

    if (event['state']) {

      const value = event['state']

      console.info('Setting Up EC2 Recovery Tags: %s', value)

        var params = {
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
            ]
        }

        var instances = await ec2.describeInstances(params).promise();

        for (const instance of instances['Reservations']) {

          var instance_id = instance['Instances'][0]['InstanceId']

          var params = { Resources: [instance_id], Tags: tag_string }

          var ImageId = instance['Instances'][0]['ImageId']

          console.info('ImageId is: %s', ImageId)

          var platform = functions.determine_platform(ImageId)

          console.info('Platform is: %s', platform)

          var alarm = functions.create_alarm(instance_id, platform, sns_topic_arn, region)

          console.info('Created Tags and Alarms on Instance ID: %s with Tag: %s', instance_id, tag_string)
        }

      return console.info('All Required Instances Have EC2 Recovery Enabled')

    }

  } catch (e) {
    return console.error('Failure Creating EC2 Recovery Tags/Alarms: %s', e)
  }
};