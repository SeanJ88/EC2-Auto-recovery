'use strict';

const functions = require('../libs/libs.js');
const tag_string = process.env.TAGS
const sns_topic_arn = process.env.SNS_TOPIC_ARN
const region = process.env.REGION


module.exports.subscriber = async (event, context) => {
  console.info('Event received: $s ', event)

  try {
    if ('source' in event && event['source'] == 'aws.ec2' && event['detail']['state'] == 'running') {
        instance_id = event['detail']['instance-id']
        try {
          tags = json.parse(tag_string);
        }
        catch (e) {
            console.error('Failure parsing JSON tags environment variable string: $s and failed with error $s', tag_string, e);
        }

        instance_info = functions.check_ec2_tag_exists_and_add_if_not(instance_id, tags)

        if (instance_info) {

          ImageId = instance_info['ImageId']

          console.info('ImageId is: $s', ImageId)

          platform = determine_platform(ImageId)
    
          console.info('Platform is: $s', platform)

          functions.create_alarm(instance_id, platform, sns_topic_arn, region)
        }
    }
    else if ('source' in event && event['source'] == 'aws.ec2' && event['detail']['state'] == 'terminated') {
      instance_id = event['detail']['instance-id']
      result = functions.delete_alarm_if_instance_terminated(instance_id)
    }
  } catch (e) {
    console.error('Failure creating alarm: %s', e)
  }
};