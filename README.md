<!--
title: 'AWS NodeJS EC2 Auto Subscribe Alarm And Recovery Lambda'
description: 'This template demonstrates how to deploy three NodeJS functions running on AWS Lambda using the traditional Serverless Framework. The First Lambda will Take in a manual JSON Payload that will tag all instances matching a criteria and create Create Cloudwatch Recovery Alarms for System Status and Instance Status Failures. The second Lambda will Subscribe Each new running EC2 Instance matching a criteria and Auto Create Cloudwatch Recovery Alarms for System Status and Instance Status Failures. The Third Lambda is a Recovery Lambda which will respond to a SNS Topic Trigger from the CloudWatch Alarms set up by the First Lambda and will Auto Restart the Instance for an Instance Status Failure, If unsuccessful then the Lambda will FORCE STOP and FORCE START the Instance if meeting a specific criteria. The Third Lambda will then send to an SNS Topic with the Results.' 
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

This template demonstrates how to deploy three NodeJS functions running on AWS Lambda using the traditional Serverless Framework. 

The First Lambda will Take in a manual JSON Payload that will tag all instances matching a criterion and create Cloudwatch Recovery Alarms for System Status and Instance Status Failures. 

The second Lambda will Subscribe Each new running EC2 Instance matching a criterion and Auto Create CloudWatch Recovery Alarms for System Status and Instance Status Failures. 

The Third Lambda is a Recovery Lambda which will respond to a SNS Topic Trigger from the CloudWatch Alarms set up by the First Lambda and will Auto Restart the Instance for an Instance Status Failure, If unsuccessful then the Lambda will FORCE STOP and FORCE START the Instance if meeting a specific criterion. The Third Lambda will then send to an SNS Topic with the Results.

## Infrastructure

In this repository we are deploying the following:

```
- 3 x Lambdas
- 1 x SNS Topic
- 2 x SNS Topic Policies (1 x events, 1 x cloudwatch)
- 1 x IAM Role
- 1 x IAM Policy
- 2 x SQS Dead Letter Queues 
- 2 x Cloudwatch Alarms (Created by Lambda)
```
:warning: SQS Queues are currently disabled due to a bug in Serverless Framework 2.x for the Deadletter plugin :warning: 
[Please click here for more information on the bug](https://github.com/gmetzker/serverless-plugin-lambda-dead-letter/issues/46)

This is all created in the [Serverless.yml](https://github.com/SeanJ88/EC2-Auto-recovery/blob/main/serverless.yml) file


### Infrastructure Diagram

![](images/EC2_Recovery.jpg)

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

We will go over an example for cost for a 1-Month Period.

##### Scenario

We have 90 EC2 instances running which all 
need to be tagged and give or take 40% additional Instances
spun up/terminated throughout the month period. 
There is also a 20% failure on these machines per week 
which will trigger the resolve Lambda.

On average lets say the Lambda invocations will last 3 minutes.


Subscriber Lambda Invocation Cost: 
```
  - 90 invocations for tagging current Instances
  - 40% running/terminate instances = 90 * 0.40 = 36 invocations
  - Total Subscriber Innovations = 126 invocations
  - Invocation Cost = $0.20 per 1M Requests = 126/1000000 = $0.20
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
  - Invocation Cost = $0.20 per 1M Requests = 72/1000000 = $0.20
  - Duration - 10 minutes(600000) x $0.0000000083 = 0.00498 x 126 = $0.62
  
  Total Cost: $0.82 per month
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
Any events going to the SNS topic will trigger the Lambda
Even if the Lambda will disregard those events.

So from the SNS Example. 
 - 360 Emails sent - 360 additional Resolver Lambda Notifications
 - Invocation total = 360 + 72 previous triggers = 432 Invocations

Total Cost: $0.00 ($0.20 per 1M requests already paid by Lambda Cost)
```

Total Charges First Month
```
 - Subscriber Lambda  - $0.39
 - CloudWatch Alarms  - $25.20
 - Resolver Lambda    - $0.82
 - SNS Topic Charges  - $2.00*
 - Additional Charges - $0.00

 Total First Month - $28.41
 (90 instances needing alarms + 40% additional alarms per month)
 *Assuming we add the $2.00 cost of SNS pricing
```

 Total Per Month After First Month Estimate 
  - All 90 Instances tagged but 40% a month Running/Terminate still occur.
```
 - Subscriber Lambda  - $0.25
 - CloudWatch Alarms  - $7.20
 - Resolver Lambda    - $0.38
 - SNS Topic Charges  - $2.00*
 - Additional Charges - $0.00

Total Per Month - $8.93

*Assuming we take the $2.00 cost of SNS pricing
```
## Usage

:warning: This Tool will only Automatically Subscribe, Tag, Create and Recover newly running instances that have the following tags: :warning:

- dd-monitoring - true
- dd-mute - false

The Instances will be tagged with:

- [{"Key": "EC2_Auto_Recovery", "Value": "Enabled"}]

If the above is set to any different, then the Lambda will not subscribe and auto add tags/alarms to the instance.

The functionality of the Lambda also only listens to newly 'running' or 'terminated' instances.

The Lambda will not auto tag Instances that are currently in a running state before the Lambda deployment.

If you want current instances to have auto recovery enabled then the initial tagging lambda needs to be run first. This Lambda will only tag Instances with the same criterion as the Auto subscribe Lambda.
### Prerequisites

- Serverless Framework Installed - v2.x.x or higher
- node installed - v14.x.x or higher
- npm installed - v8.x.x or higher

### Deployment

In order to deploy the example, you need to run the following command:

```
export AWS_PROFILE=profile
serverless deploy --stage stage --region region
```

- Profile should be the Account you want to deploy to listed in your AWS Credentials File.
- Stage should be the environment you want to deploy e.g dev/test/int/prod
- Region should be the region you want to deploy. Defaults to eu-west-2 if not set.
- :warning: If you do not have profiles set up then please assume the role for the account you want to deploy to and run the serverless deploy command :warning:


This deployment should only be deployed once per Account.
I'd recommend if you have an Int account and Dev account in the same account. Then deploy the Lambda with the stage int
### Invocation

After successful deployment, Invocation will be done automatically by AWS CloudWatch and SNS Topic Triggers.

For triggering the Initial Tagging Lambda, you can do the following.

If you are invoking via the console then please make sure the test event matches the following JSON:

```
{
    "state": "Enabled"
}
```

```
serverless invoke --function <function> --stage <stage> --region <region> --path data/<filename>.json
```

- function - is the name of the function to invoke
- stage - is the environment e.g. dev
- region - is the region you want to invoke it in e.g. us-west-2
- path - is the patch to the file you want to use e.g. data/enabled.js 



### Local development

If you want to update this Repository then you can find everything
you require in the following folders:

- Lambda Functions     - [Functions](https://github.com/SeanJ88/EC2-Auto-recovery/tree/main/functions)
- Library for Lambdas  - [libs](https://github.com/SeanJ88/EC2-Auto-recovery/tree/main/functions/libs)
- Serverless Resources - [Serverless.yml](https://github.com/SeanJ88/EC2-Auto-recovery/blob/main/serverless.yml)
- JEST Tests           - [`__`tests`__`](https://github.com/SeanJ88/EC2-Auto-recovery/tree/main/__tests__)
- JEST Mock Function   - [jest](https://github.com/SeanJ88/EC2-Auto-recovery/tree/main/jest)

#### Testing (JEST)

JEST is used to test the Lambda functions and the Library to make
sure functionality is working as expected.

These can be found in the JEST Tests folder listed above.

There is a MOCK lambda function and Library location in the JEST
folder. Which contains the same logic as the Live Lambda Functions
However, these files do not contain the AWS SDK calls as these 
cannot be tested without assuming a role and having access with the AWS CLI.

So for these files, example JSON responses have been put in 
place of the AWS Commands. 

Each Function in Lib.js will have example JSON responses which can 
be amended to test each functionality of the Lambda Functions.

Currently, the JSON data will have information to test the Lambda
Functions to have the correct criteria for the Subscriber Lambda and
the correct Criteria to fully test the Resolver Lambda.

Local testing has been done to test each function and each logic
step by step to test each edge case.

Testing can be done by running the following command:

```
npm run test
```

### Suggested Improvements

Potentially update JEST Tests to use AWS Mock to mock the AWS
API Calls to test the Logic more efficiently without using example Data.