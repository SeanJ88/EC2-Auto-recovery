'use strict';

const aws = require('aws-sdk')
aws.config.update({ region: process.env.REGION });
const ec2 = new aws.EC2()
const tags = process.env.TAGS
const functions = require('./libs.js');
const sns_topic_arn = process.env.SNS_TOPIC_ARN
const region = process.env.REGION

//This was generated in the /jest/mockfunction/ folder using ec2 describe-instances on a live environment
const examples = require('./ec2-examples.json')


module.exports.initialTags = async (event, context) => {
  try {
    console.info(event)

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

        console.info(JSON.stringify(params))

        var instances = examples

        for (const instance of instances['Reservations']) {

          var instance_id = instance['Instances'][0]['InstanceId']

          var params = { Resources: [instance_id], Tags: tags }

          var ImageId = instance['Instances'][0]['ImageId']

          console.info('ImageId is: %s', ImageId)

          var platform = functions.determine_platform(ImageId)

          console.info('Platform is: %s', platform)

          var alarm = functions.create_alarm(instance_id, platform, sns_topic_arn, region)

          console.info('Created Tag on Instance ID: %s with Tag: %s', instance_id, tags)
        }

      return console.info('All Required Instances Has EC2 Recovery Enabled')

    }

  } catch (e) {
    return console.error('Failure Creating EC2 Recovery Tags/Alarms: %s', e)
  }
};