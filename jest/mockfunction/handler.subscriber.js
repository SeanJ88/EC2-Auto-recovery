'use strict';

const functions = require('./libs.js');
const tag_string = process.env.TAGS
const sns_topic_arn = process.env.SNS_TOPIC_ARN
const region = process.env.REGION


module.exports.subscriber = async (event, context) => {
  console.info('Event received: %s ', event)

  try {
    if ('source' in event && event['source'] == 'aws.ec2' && event['detail']['state'] == 'running') {
      var instance_id = event['detail']['instance-id']
      console.info(instance_id)
      try {
        var tags = JSON.parse(tag_string);
        console.info(tags);
      }
      catch (e) {
        return console.error('Failure parsing JSON tags environment variable string: %s and failed with error %s', tag_string, e);
      }

      var instance_info = functions.check_ec2_tag_exists_and_add_if_not(instance_id, tags)

      console.info(instance_info)

      if (instance_info) {

        var ImageId = instance_info['ImageId']

        console.info('ImageId is: %s', ImageId)

        var platform = functions.determine_platform(ImageId)

        console.info('Platform is: %s', platform)

        var alarm = functions.create_alarm(instance_id, platform, sns_topic_arn, region)

        return console.log('Alarm and event rule %s has been created', JSON.stringify(alarm))
      }
    }
    else if ('source' in event && event['source'] == 'aws.ec2' && event['detail']['state'] == 'terminated') {
      var instance_id = event['detail']['instance-id']
      var result = functions.delete_alarm_if_instance_terminated(instance_id)
      if (result) {
        return console.log('Alarm has been deleted %s', result)
      }
      else {
        return console.log('No Auto Alarm found for this instance_id', instance_id)
      }
    }
    else {
      return console.log('Event received does not match Instance State: Running or Terminated')
    }
  } catch (e) {
    return console.error('Failure creating alarm: %s', e)
  }
};