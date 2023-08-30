// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Stack } from "aws-cdk-lib";
import { Capture, Template } from 'aws-cdk-lib/assertions';
import { Bucket } from "aws-cdk-lib/aws-s3";
import { ConsoleConstruct } from "../lib/console";

describe('When IoT Device Simulator ConsoleConstruct is created', () => {
    let template: Template;

    beforeAll(() => {
        template = buildStack();
    });

    const loggingBucketCapture = new Capture();
    const commonResourceDistributionS3BucketCapture = new Capture();
    const cloudFrontDistributionOriginCapture = new Capture();

    it('it should have s3 buckets', () => {
        template.resourceCountIs('AWS::S3::Bucket', 2);
        template.hasResource('AWS::S3::Bucket', {
            Type:'AWS::S3::Bucket',
            "Properties": {
                "BucketEncryption": {
                  "ServerSideEncryptionConfiguration": [
                    {
                      "ServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "AES256",
                      },
                    },
                  ],
                },
                "LifecycleConfiguration": {
                  "Rules": [
                    {
                      "NoncurrentVersionTransitions": [
                        {
                          "StorageClass": "GLACIER",
                          "TransitionInDays": 90,
                        },
                      ],
                      "Status": "Enabled",
                    },
                  ],
                },
                "LoggingConfiguration": {
                  "DestinationBucketName": {
                    "Ref": loggingBucketCapture,
                  },
                  "LogFilePrefix": "console-s3/",
                },
                "PublicAccessBlockConfiguration": {
                  "BlockPublicAcls": true,
                  "BlockPublicPolicy": true,
                  "IgnorePublicAcls": true,
                  "RestrictPublicBuckets": true,
                },
                "VersioningConfiguration": {
                  "Status": "Enabled",
                },
              },
            UpdateReplacePolicy: 'Retain'
        });
        expect(template.toJSON()['Resources'][loggingBucketCapture.asString()]['Type']).toStrictEqual('AWS::S3::Bucket');
        template.resourceCountIs('AWS::S3::BucketPolicy', 1);
    });

    it('it should have cloudfront distribution', () => {
        template.resourceCountIs('AWS::CloudFront::Distribution', 1);
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
            'DistributionConfig' : {
                'Origins': [
                    {
                      'DomainName': {
                        'Fn::GetAtt': [
                          commonResourceDistributionS3BucketCapture,
                          'RegionalDomainName'
                        ],
                      },
                      'S3OriginConfig': {
                        'OriginAccessIdentity': {
                          'Fn::Join': [
                            '',
                            [
                              'origin-access-identity/cloudfront/',
                              {
                                'Ref': cloudFrontDistributionOriginCapture,
                              },
                            ],
                          ],
                        },
                      },
                    },
                  ]
            }
        });
        expect(template.toJSON()['Resources'][commonResourceDistributionS3BucketCapture.asString()]['Type']).toStrictEqual('AWS::S3::Bucket');
        expect(template.toJSON()['Resources'][cloudFrontDistributionOriginCapture.asString()]['Type']).toStrictEqual('AWS::CloudFront::CloudFrontOriginAccessIdentity');
    });

    it('it should have identity resources', () => {
        template.resourceCountIs('AWS::IoT::Policy', 1);
        template.resourceCountIs('AWS::Cognito::UserPoolUser', 1);
        template.resourceCountIs('AWS::Cognito::IdentityPool', 1);
        template.resourceCountIs('AWS::IAM::Role', 1);
    });

});

function buildStack() {
    const stack = new Stack();
    const testBucket = new Bucket(stack, "testBucket", {});

    const console = new ConsoleConstruct(stack, 'TestCommonResource', {
        apiId: '12ab34cde5',
        s3LogsBucket: testBucket,
        adminEmail: "someEmail",
        mapArn: "arn:aws:geo:region:accountID:map/ExampleMap",
        placeIndexArn: "arn:aws:geo:region:accountID:place-index/ExamplePlaceIndex"
    });
    return Template.fromStack(stack);
}
