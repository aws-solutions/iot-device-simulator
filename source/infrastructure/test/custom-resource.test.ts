// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Stack } from "aws-cdk-lib";
import { Capture, Match, Template } from 'aws-cdk-lib/assertions';
import { Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { CustomResourcesConstruct } from '../lib/custom-resource';

describe('When IoT Device Simulator customResourcesConstruct is created', () => {
    let template: Template;

    beforeAll(() => {
        template = buildStack();
    });

    const customResourceHelperLambdaCapture = new Capture();
    const consoleBucketCapture = new Capture();
    const routeBucketCapture = new Capture();
    const lambdaRoleCapture = new Capture();


    it('it should have lambda function', () => {
        template.resourceCountIs('AWS::Lambda::Function', 1);
        template.hasResource('AWS::Lambda::Function', {
            Type:'AWS::Lambda::Function',
            Properties: {
                Code: Match.anyValue(),
                Runtime: 'nodejs18.x',
                Handler: 'index.handler',
                Timeout: 240,
                Description: 'IoT Device Simulator custom resource function',
                Environment: {
                    Variables: {
                        'SOLUTION_ID': 'testId',
                        'SOLUTION_VERSION': 'testVersion'
                    }
                },
                Role: {}
            }
        });
        template.hasResourceProperties('AWS::IAM::Role', {
            "AssumeRolePolicyDocument": {
              "Statement": [
                {
                  "Action": "sts:AssumeRole",
                  "Effect": "Allow",
                  "Principal": {
                    "Service": "lambda.amazonaws.com",
                  },
                },
              ],
              "Version": "2012-10-17",
            },
            "Path": "/",
            "Policies": [
              {
                "PolicyDocument": {
                  "Statement": [
                    {
                      "Action": "iot:DescribeEndpoint",
                      "Effect": "Allow",
                      "Resource": "*",
                    },
                  ],
                  "Version": "2012-10-17",
                },
                "PolicyName": "customResourcePolicy",
              },
            ],
        });
        template.hasResourceProperties('AWS::IAM::Policy', {
            "PolicyDocument": {
              "Statement": [
                {
                  "Action": [
                    "s3:GetObject*",
                    "s3:GetBucket*",
                    "s3:List*",
                  ],
                  "Effect": "Allow",
                  "Resource": [
                    {
                      "Fn::Join": [
                        "",
                        [
                          "arn:",
                          {
                            "Ref": "AWS::Partition",
                          },
                          ":s3:::test-bucket-region",
                        ],
                      ],
                    },
                    {
                      "Fn::Join": [
                        "",
                        [
                          "arn:",
                          {
                            "Ref": "AWS::Partition",
                          },
                          ":s3:::test-bucket-region/testPrefix//*",
                        ],
                      ],
                    },
                  ],
                },
                {
                  "Action": [
                    "s3:PutObject",
                    "s3:PutObjectLegalHold",
                    "s3:PutObjectRetention",
                    "s3:PutObjectTagging",
                    "s3:PutObjectVersionTagging",
                    "s3:Abort*",
                  ],
                  "Effect": "Allow",
                  "Resource": {
                    "Fn::Join": [
                      "",
                      [
                        {
                          "Fn::GetAtt": [
                            consoleBucketCapture,
                            "Arn",
                          ],
                        },
                        "/*",
                      ],
                    ],
                  },
                },
                {
                  "Action": [
                    "s3:PutObject",
                    "s3:PutObjectLegalHold",
                    "s3:PutObjectRetention",
                    "s3:PutObjectTagging",
                    "s3:PutObjectVersionTagging",
                    "s3:Abort*",
                  ],
                  "Effect": "Allow",
                  "Resource": {
                    "Fn::Join": [
                      "",
                      [
                        {
                          "Fn::GetAtt": [
                            routeBucketCapture,
                            "Arn",
                          ],
                        },
                        "/*",
                      ],
                    ],
                  },
                },
                {
                  "Action": "iot:ListTargetsForPolicy",
                  "Effect": "Allow",
                  "Resource": {
                    "Fn::Join": [
                      "",
                      [
                        "arn:",
                        {
                          "Ref": "AWS::Partition",
                        },
                        ":iot:",
                        {
                          "Ref": "AWS::Region",
                        },
                        ":",
                        {
                          "Ref": "AWS::AccountId",
                        },
                        ":policy/*",
                      ],
                    ],
                  },
                },
              ],
              "Version": "2012-10-17",
            },
            "Roles": [
              {
                "Ref": lambdaRoleCapture
              },
            ],
        });
        expect(template.toJSON()['Resources'][consoleBucketCapture.asString()]['Type']).toStrictEqual('AWS::S3::Bucket');
        expect(template.toJSON()['Resources'][routeBucketCapture.asString()]['Type']).toStrictEqual('AWS::S3::Bucket');
        expect(template.toJSON()['Resources'][lambdaRoleCapture.asString()]['Type']).toStrictEqual('AWS::IAM::Role');
    });

    it('it should have custom resource', () => {
        template.resourceCountIs('Custom::CopyConfigFiles', 1);
        template.resourceCountIs('Custom::CopyConsoleFiles', 1);
        template.resourceCountIs('Custom::CopyRouteFiles', 1);
        template.resourceCountIs('AWS::CloudFormation::CustomResource', 3);
        template.hasResource('AWS::CloudFormation::CustomResource', {
            Type:'AWS::CloudFormation::CustomResource',
            Properties: {
                'Resource': 'CreateUUID',
                'ServiceToken': {
                    "Fn::GetAtt": [
                      customResourceHelperLambdaCapture,
                      "Arn",
                    ]},
                'StackName': Match.anyValue()
            },
            UpdateReplacePolicy: 'Delete'
        });
        expect(template.toJSON()['Resources'][customResourceHelperLambdaCapture.asString()]['Type']).toStrictEqual('AWS::Lambda::Function');
    });
});

function buildStack() {
    const stack = new Stack();
    const testRouteBucket = new Bucket(stack, 'testRouteBucket');
    const testConsoleBucket = new Bucket(stack, 'testConsoleBucket')
    const testPolicy = new Policy(stack, 'TestPolicy', {
        statements: [
            new PolicyStatement({
                resources: ['*'],
                actions: ['cloudwatch:Get*']
            })
        ]
    });
    const testSourceBucket = Bucket.fromBucketName(stack, 'SourceCodeBucket', 'test-bucket-region');

    const customResources = new CustomResourcesConstruct(stack, 'TestCustomResource', {
        cloudWatchLogsPolicy: testPolicy,
        solutionConfig: {
            solutionId: 'testId',
            solutionVersion: 'testVersion',
            sourceCodeBucket: testSourceBucket,
            sourceCodePrefix: 'testPrefix/',
        }
    });

    customResources.setupUi({
        apiEndpoint: 'https://12ab34cde5.execute-api.us-east-1.amazonaws.com/test',
        cognitoIdentityPool: 'testIdentityPool',
        cognitoUserPool: 'testUserPool',
        cognitoUserPoolClient: 'testUserPoolClient',
        consoleBucket: testConsoleBucket,
        mapName: 'testMap',
        placeIndexName: 'testPlaceIndex',
        routesBucket: testRouteBucket,
        iotPolicyName: 'testIoTPolicy'
    });

    customResources.setupDetachIotPolicyCustomResource({
        iotPolicyName: 'testIoTPolicy'
    });

    return Template.fromStack(stack);
}
