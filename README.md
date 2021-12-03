<!--
title: 'AWS NodeJS EC2 Auto Subscribe Alarm And Recovery Lambda'
description: 'This template demonstrates how to deploy two NodeJS functions running on AWS Lambda using the traditional Serverless Framework. The First Lambda will Subscribe Each EC2 Instance matching a criteria and Auto Create Cloudwatch Recovery Alarms for System Status and Instance Status Failures. The Second Lambda is a Recovery Lambda which will respond to a SNS Topic Trigger from the CloudWatch Alarms set up by the First Lambda and will Auto Restart the Instance for an Instance Status Failure, If unsuccessful then the Lambda will FORCE STOP and FORCE START the Instance if meeting a specific critera. The Second Lambda will then send to an SNS Topic with the Results.' 
layout: Doc 
framework: v2 
platform: AWS 
language: nodeJS 
priority: 1 
authorLink: 'https://github.com/SeanJ88' 
authorName: 'Sean Jones.' 
companyName: 'DevOpsGroup' 
-->
# AWS NodeJS EC2 Auto Subscribe Alarm And Recovery Lambda

This template demonstrates how to deploy two NodeJS functions running on AWS Lambda using the traditional Serverless Framework. 

The First Lambda will Subscribe Each EC2 Instance matching a criteria and Auto Create Cloudwatch Recovery Alarms for System Status and Instance Status Failures. 

The Second Lambda is a Recovery Lambda which will respond to a SNS Topic Trigger from the CloudWatch Alarms set up by the First Lambda and will Auto Restart the Instance for an Instance Status Failure, If unsuccessful then the Lambda will FORCE STOP and FORCE START the Instance if meeting a specific critera. 

The Second Lambda will then send to an SNS Topic with the Results.


## Infrastructure:

In this repository we are deploying the following:

```
- 2 x Lambdas
- 1 x SNS Topic
- 1 x IAM Role
- 1 x IAM Policy
- 2 x SQS Dead Letter Queues 
- 2 x Cloudwatch Alarms (Created by Lambda)
```
:warning: SQS Queues are currently disabled due to a bug in Serverless Framework 2.x for the Deadletter plugin :warning: 
[Please click here for more information on the bug](https://github.com/gmetzker/serverless-plugin-lambda-dead-letter/issues/46)

This is all created in the [Serverless.yml](https://github.com/SeanJ88/EC2-Auto-recovery/blob/main/serverless.yml) file

### Infrastructure Cost

#### Lambda Function Pricing
```
London (Eu-west-2) Pricing
  - $0.0000166667 for every GB per second
  - $0.0000000083 per Ms for 512Mb Lambdas
  - $0.20 per 1M requests
```

#### SNS Pricing
```
London (Eu-west-2) Pricing
  - $2.00 per 100,000 notification deliveries over email
```

#### SQS Pricing
```
London (Eu-west-2) Pricing
  - $0.00 up to 1 million Amazon SQS requests/Month
  - $0.40 Per Million from 1 Million to 100 Billion Requests/Month
```

#### Cloudwatch Alarm Cost
```
London (Eu-west-2) Pricing
  - $0.10 per month for Each alarm you create 
```
#### Example Cost

We wll go over an example for cost for a 1 Month Period.

##### Scenario

We have 90 EC2 instances running which all 
need to be tagged and give or take 40% additional Instances
spun up/terminated throughout the month period. 
There is also a 20% failure on these machines per week 
which will trigger the resolve Lambda.

On average lets say the Lambda invocations will last 3 mintues.


Subscriber Lambda Invocation Cost: 
```
  - 90 innvocations for tagging current Instances
  - 40% running/terminate instances = 90 * 0.40 = 36 innvocations
  - Total Subscriber Innovations = 126 innvocations
  - Innvocation Cost = $0.20 per 1M Requests = 126/1000000 = $0.20
  - Duration - 3 minutes(180000) x $0.0000000083 = 0.001494 x 126 = $0.19

  Total Cost: $0.39 per month
```

CloudWatch Alarm Cost:
```
  - 2 Alarms created per machine = ($0.10 x 2) x 90 = $18
  - 40% additional alarms created = ($0.10 x 2) x 36 = $7.20
    
  Total Cost = $25.20
```

Resolver Lambda Invocation Cost:
```
  - 90 instances
  - 20% per week of failures = 90 x 0.20 x 4 = 72 invocations
  - Innvocation Cost = $0.20 per 1M Requests = 72/1000000 = $0.20
  - Duration - 3 minutes(180000) x $0.0000000083 = 0.001494 x 126 = $0.19
  
  Total Cost: $0.39 per month
```

SNS Topic Cost
```
 - 20% per week of failures = 90 x 0.20 x 4 = 72 Alarm Notifications
 - 72 Resolver Lambda Notifications - sending to SNS
 - 72 Success/Failure CloudwatchEvent notifications sent to SNS
 - Say 20% additional System failures Alarms
 - 72 System Failure notifications
 - 72 Success/failure System CloudwatchEvent notifications
 
 Total Emails sent - 360 Emails
 Total Cost: $2.00* 
 
 *per 100,000 emails, first 1,000 are free, We will assume the cost
```

Additional Charges
```
As the Resolver Lambda is Triggered by the SNS topic.
Any events going to the SNS topic will trigger the Lambd
Even if the Lambda will disregard those events.

So from the SNS Example. 
 - 360 Emails sent - 360 additional Resolver Lambda Notifications
 - Innvocation total = 360 + 72 previous triggers = 432 Innvocations

Total Cost: $0.00 ($0.20 per 1M requests already paid by Lambda Cost)
```

Total Charges First Month
```
 - Subscriber Lambda  - $0.39
 - CloudWatch Alarms  - $25.20
 - Resolver Lambda    - $0.39
 - SNS Topic Charges  - $2.00*
 - Additional Charges - $0.00

 Total First Month - $27.98
 (90 instances needing alarms + 40% additional alarms per month)
 *Assuming we add the $2.00 cost of SNS pricing
```

 Total Per Month After First Month Estimate 
  - All 90 Instances tagged but 40% a month Running/Terminate still occur.
```
 - Subscriber Lambda  - $0.25
 - CloudWatch Alarms  - $7.20
 - Resolver Lambda    - $0.39
 - SNS Topic Charges  - $2.00*
 - Additional Charges - $0.00

Total Per Month - $9.84

*Assuming we take the $2.00 cost of SNS pricing
```
## Usage

### Deployment

In order to deploy the example, you need to run the following command:

```
$ serverless deploy --stage dev/int/prod
```

After running deploy, you should see output similar to:

```bash
Serverless: Packaging service...
Serverless: Excluding development dependencies...
Serverless: Creating Stack...
Serverless: Checking Stack create progress...
........
Serverless: Stack create finished...
Serverless: Uploading CloudFormation file to S3...
Serverless: Uploading artifacts...
Serverless: Uploading service aws-node.zip file to S3 (711.23 KB)...
Serverless: Validating template...
Serverless: Updating Stack...
Serverless: Checking Stack update progress...
.................................
Serverless: Stack update finished...
Service Information
service: aws-node
stage: dev
region: us-east-1
stack: aws-node-dev
resources: 6
functions:
  api: aws-node-dev-hello
layers:
  None
```

### Invocation

After successful deployment, you can invoke the deployed function by using the following command:

```bash
serverless invoke --function hello
```

Which should result in response similar to the following:

```json
{
    "statusCode": 200,
    "body": "{\n  \"message\": \"Go Serverless v2.0! Your function executed successfully!\",\n  \"input\": {}\n}"
}
```

### Local development

You can invoke your function locally by using the following command:

```bash
serverless invoke local --function hello
```

Which should result in response similar to the following:

```
{
    "statusCode": 200,
    "body": "{\n  \"message\": \"Go Serverless v2.0! Your function executed successfully!\",\n  \"input\": \"\"\n}"
}
```
