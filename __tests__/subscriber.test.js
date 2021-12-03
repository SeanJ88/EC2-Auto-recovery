const handler = require('../jest/mockfunction/handler.subscriber');


const ec2_state_change_running =
{
    "id":"7bf73129-1428-4cd3-a780-95db273d1602",
    "detail-type":"EC2 Instance State-change Notification",
    "source":"aws.ec2",
    "account":"123456789012",
    "time":"2019-11-11T21:29:54Z",
    "region":"us-east-1",
    "resources":[
       "arn:aws:ec2:us-east-1:123456789012:instance/i-abcd1111"
    ],
    "detail":{
       "instance-id":"i-abcd1111",
       "state":"running"
    }
 }

const ec2_state_change_terminated =
{
    "id":"7bf73129-1428-4cd3-a780-95db273d1602",
    "detail-type":"EC2 Instance State-change Notification",
    "source":"aws.ec2",
    "account":"123456789012",
    "time":"2019-11-11T21:29:54Z",
    "region":"us-east-1",
    "resources":[
       "arn:aws:ec2:us-east-1:123456789012:instance/i-abcd1111"
    ],
    "detail":{
       "instance-id":"i-abcd1111",
       "state":"terminated"
    }
 }

 const ec2_state_change_pending =
 {
     "id":"7bf73129-1428-4cd3-a780-95db273d1602",
     "detail-type":"EC2 Instance State-change Notification",
     "source":"aws.ec2",
     "account":"123456789012",
     "time":"2019-11-11T21:29:54Z",
     "region":"us-east-1",
     "resources":[
        "arn:aws:ec2:us-east-1:123456789012:instance/i-abcd1111"
     ],
     "detail":{
        "instance-id":"i-abcd1111",
        "state":"pending"
     }
  }

test('Print out Responses from the Lambda for a running instance', () => {
    response = handler.subscriber(ec2_state_change_running)
});

test('Print out Responses from the Lambda for a Terminated instance', () => {
    response = handler.subscriber(ec2_state_change_terminated)
});

test('Print out Responses from the Lambda for a Pending instance', () => {
    response = handler.subscriber(ec2_state_change_pending)
});