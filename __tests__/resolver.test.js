const handler = require('../jest/mockfunction/handler.resolver');

const sns_topic_example =
{
  "Records": [
      {
          "EventSource": "aws:sns",
          "EventVersion": "1.0",
          "EventSubscriptionArn": "arn:aws:sns:eu-west-2:480810688838:Datadog-EC2-SNS-Topic-480810688838-eu-west-2:f3db1170-a3ac-44ff-9313-179a72be4ef8",
          "Sns": {
              "Type": "Notification",
              "MessageId": "2844d74e-a980-56d1-a865-8d66b6236fd4",
              "TopicArn": "arn:aws:sns:eu-west-2:480810688838:Datadog-EC2-SNS-Topic-480810688838-eu-west-2",
              "Subject": "Status Check Alarm: \"AutoAlarm-i-0bb9ca09aa2d09012-Amazon-Linux-StatusCheckFailed...\" in EU (London)",
              "Message": "{\"AlarmName\":\"AutoAlarm-i-0bb9ca09aa2d09012-Amazon-Linux-StatusCheckFailed_Instance-eu-west-2\",\"AlarmDescription\":\"Alarm created by lambda function EC2-recovery-lambda-subscriber-function\",\"AWSAccountId\":\"480810688838\",\"NewStateValue\":\"ALARM\",\"NewStateReason\":\"Threshold Crossed: 3 out of the last 3 datapoints [1.0 (06/12/21 14:20:00), 1.0 (06/12/21 14:15:00), 1.0 (06/12/21 14:10:00)] were greater than or equal to the threshold (1.0) (minimum 3 datapoints for OK -> ALARM transition).\",\"StateChangeTime\":\"2021-12-06T14:25:39.681+0000\",\"Region\":\"EU (London)\",\"AlarmArn\":\"arn:aws:cloudwatch:eu-west-2:480810688838:alarm:AutoAlarm-i-0bb9ca09aa2d09012-Amazon-Linux-StatusCheckFailed_Instance-eu-west-2\",\"OldStateValue\":\"OK\",\"Trigger\":{\"MetricName\":\"StatusCheckFailed_Instance\",\"Namespace\":\"AWS/EC2\",\"StatisticType\":\"Statistic\",\"Statistic\":\"MAXIMUM\",\"Unit\":null,\"Dimensions\":[{\"value\":\"i-0bb9ca09aa2d09012\",\"name\":\"InstanceId\"}],\"Period\":300,\"EvaluationPeriods\":3,\"ComparisonOperator\":\"GreaterThanOrEqualToThreshold\",\"Threshold\":1.0,\"TreatMissingData\":\"\",\"EvaluateLowSampleCountPercentile\":\"\"}}",
              "Timestamp": "2021-12-06T14:25:39.726Z",
              "SignatureVersion": "1",
              "Signature": "dWFA7GEH4UR6IhkGnKrYwKUW/ZxCPpnLtFE8loOK5VeKDUiyv/JfewKrfk5U4Mo7p0xqP8hk9Q8ckG/V/slF9QEwn35wnNM9BOo3lMTy1ad20NQG8eR+pZrSi4xwyD50LCzrVwjYZET5lnE9gY5rA/XMGtWlqHBKAaTe/MP7F2wQil4NntWrHLCYZY86EtKHH1CtMLVPFbk/ae6HQqwAijE4lDWry7WxiO6lcaN9NjUgHftnajCvx1t6BfZb3mQfuqK31RgFkhmUfUDESdl4s59SqI5bVGV1/DB+sjetuz8W6IvFybyCFQtJHfWj0jKSkSRC0iZP0T7pVaXTjVvujg==",
              "SigningCertUrl": "https://sns.eu-west-2.amazonaws.com/SimpleNotificationService-7ff5318490ec183fbaddaa2a969abfda.pem",
              "UnsubscribeUrl": "https://sns.eu-west-2.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:eu-west-2:480810688838:Datadog-EC2-SNS-Topic-480810688838-eu-west-2:f3db1170-a3ac-44ff-9313-179a72be4ef8",
              "MessageAttributes": {}
          }
      }
  ]
}



test('Print out Responses from the Lambda for a resolver event', () => {
    response = handler.resolver(sns_topic_example)
});