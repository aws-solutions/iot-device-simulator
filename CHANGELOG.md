# Change Log 
All notable changes to this project will be documented in this file. 
 
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), 
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). 

## [3.0.1] - 2023-04-27
### Changed
- Upgraded to Node 18
- Added App registry integration
- Upgraded to CDK 2, React Scripts 5
- Upgraded to use ES2022

## [3.0.0] - 2021-11-22
⚠️ BREAKING CHANGES

v3.0.0 does not support to upgrade from the previous version due to
- Design change
  - Using AWS Step Functions instead of AWS Fargate to run a simulator
  - Merged `devices` and `widgets` into `simulations`
  - Merged `device-widgets`, `sim-settings`, and `sim-metrics` Amazon DynamoDB tables into `Simulator` DynamoDB table
  - Merged all microservices AWS Lambda function into a single `microservices` AWS Lambda function
- AWS CDK to generate AWS CloudFormation template

### Added
- Support import/Export of device types
- Multiple vehicles displayed on map
- Ability to define a character set (an alphabet from which the ID will be created) and the length of the ID attribute

### Changed
- Replace Mapbox map to Amazon Location Service map for the automotive demo
- UI framework migration: Angular JS to React
- Change `helper` AWS Lambda function to TypeScript
- Abstracted devices - devices are no longer created and stored, they will be generated in the simulator lambda using the specified device type and amount specified for each device type
- Simplified `boolean` attribute: no `max` and `min` to generate `boolean` data
- Automotive demo attributes aggregated into a single message

### Fixed
- Unix timestamp to show the epoch time correctly

### Removed
- Data attributes: `uuid`, `shortid`

## [2.1.1] - 2019-12-20
### Added 
- Lambda runtime updated to Node.js 12
- CloudFront distribution access log enabled
- S3 access log enabled
- Public access and public ACLs denied on S3 buckets
- Encryption at rest enabled for S3 and SQS using AWS default keys
- Docker build image updated to Node.js 12 on ECR

## [2.1.0] - 2019-03-23
### Added 
- Removed unauthenticated role from the Amazon Cognito Identity Pool

## [2.0.0] - 2019-02-27
### Added 
- Added new data generation algorithms: Sinusoidal and Decay
- Added new attribute type for nested (JSON) objects (up to 3 deep) for device type payloads
- Added ability to share Device Templates between users of the same installation
- Update user interface paging size for widget and fleet listings to 100
- Update launch and start limits for widgets and fleets to 100
- Added ability for users to stop simulations (single or in bulk of 100) for widgets and vehicles.
- Add search ability for widgets (or vehicles) by device id, device type and status
- DynamoDB tables switched to be created with PAY_PER_REQUEST billing mode vice PROVISIONED capacity
- Added ability for device attributes to be included in the topic as variables
- Resolved availability zone offset issue with Fargate cluster VPC

## [1.1.0] - 2018-11-05
### Added 
- Change manifest generator to use writeFileSync to eliminate callback deprecation error-* Added development template [iot-device-simualtor.yaml] to deployment folder
- Added Amazon CloudFront distribution to simulator console
- Set Amazon CloudFront OAI restrictive permissions for simulator console Amazon S3 bucket 
- Updated signin URL for user invitation emails to Amazon CloudFront distribution domain
- Added new device type attribute `DEVICE ID` which provides a static unique identifier for each generated device constant across simulations
- Added ability to bulk start devices by selecting multiple devices on a given page and “one click start” the simulations for multiple devices
- Migration from VeriSign AWS IoT endpoints to ATS AWS IoT endpoints

## [1.0.1] - 2018-05-23
### Added 
- Added fix for creation of Elastic IPs in legacy accounts that are not vpc-by-default
- Added fix for administration microservice IAM policy to include all required permissions to manage users through the simulator console
