# Change Log 
All notable changes to this project will be documented in this file. 
 
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), 
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). 
 
#### v1.1.0 changes 

```
* Change manifest generator to use writeFileSync to eliminate callback deprecation error
* Added development template [iot-device-simualtor.yaml] to deployment folder
* [New] Added Amazon CloudFront distribution to simulator console
* [New] Set Amazon CloudFront OAI restrictive permissions for simulator console Amazon S3 bucket 
* [New] Updated signin URL for user invitation emails to Amazon CloudFront distribution domain
* [New] Added new device type attribute `DEVICE ID` which provides a static unique identifier for each generated device constant across simulations
* [New] Added ability to bulk start devices by selecting multiple devices on a given page and “one click start” the simulations for multiple devices
* [New] Migration from VeriSign AWS IoT endpoints to ATS AWS IoT endpoints
```

#### v1.0.1 changes

```
* Added fix for creation of Elastic IPs in legacy accounts that are not vpc-by-default
* Added fix for administration microservice IAM policy to include all required permissions to manage users through the simulator console
```

#### v2.0.0 changes

```
* [New] Added new data generation algorithms: Sinusoidal and Decay
* [New] Added new attribute type for nested (JSON) objects (up to 3 deep) for device type payloads
* [New] Added ability to share Device Templates between users of the same installation
* [new] Update user interface paging size for widget and fleet listings to 100
* [new] Update launch and start limits for widgets and fleets to 100
* [new] Added ability for users to stop simulations (single or in bulk of 100) for widgets and vehicles.
* [new] Add search ability for widgets (or vehicles) by device id, device type and status
* [new] DynamoDB tables switched to be created with PAY_PER_REQUEST billing mode vice PROVISIONED capacity
* [new] Added ability for device attributes to be included in the topic as variables
You can use tier 1 attribute values from your defined payload as variables in the topic definition. For example, if you define a Device ID attribute with a name deviceId in your payload. 
{
  "deviceId": "dICxo8dI_B",
  "data": {
    "outdoorTemp": 35.14,
    "indoorTemp": 43.99,
    "speed": 450.0000000000001
  },
  "info": {
    "serialNumber": "1903aac6-2e3a-4567-8513-d48087cecebe",
    "manufacturerId": "PJVx0fxjJ",
    "plant": {
      "plantId": "5-wxbxJJFH",
      "lineId": "xxjwbjidhmmwgijefc",
      "location": "detroit"
    }
  },
  "timestamp": "2019-02-04T14:52:53",
  "_id_": "dICxo8dI_B"
}
You can use that attribute as a variable in the data topic you define by adding ${attribute} around the attribute name. ex. /sample/${deviceId}/data ( translates to /sample/dICxo8dI_B/data )
* [fix] Resolved availability zone offset issue with Fargate cluster VPC

```

#### v2.1.0 changes

```
* Removed unauthenticated role from the Amazon Cognito Identity Pool
```

#### v2.1.1 changes

```
* Lambda runtime updated to Node.js 12
* CloudFront distribution access log enabled
* S3 access log enabled
* Public access and public ACLs denied on S3 buckets
* Encryption at rest enabled for S3 and SQS using AWS default keys
* Docker build image updated to Node.js 12 on ECR
```

