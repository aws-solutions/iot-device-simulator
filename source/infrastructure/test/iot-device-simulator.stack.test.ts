
// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { App } from "aws-cdk-lib";
import { Capture, Match, Template } from 'aws-cdk-lib/assertions';
import { IDSStack } from "../lib/iot-device-simulator-stack";

describe('When IoT Device Simulator stack is created', () => {
    let template: Template;

    beforeAll(() => {
        const app = new App();
        const stack = new IDSStack(app, 'TestDLTStack');
        template = Template.fromStack(stack);
    });

    const customResourcesEndpointAddressCapture = new Capture();
    const storageIDSSimulationsTableCapture = new Capture();
    const storageRoutesBucketCapture = new Capture();
    const deviceTypeTableCapture = new Capture();
    const testSimTableCapture = new Capture();
    const simulatorStepFunctionsStateMachineCapture = new Capture();
    const ioTDeviceSimulatorApiCapture = new Capture();

    it('it should have lambda functions', () => {
        template.resourceCountIs('AWS::Lambda::Function', 3);

        template.hasResourceProperties('AWS::Lambda::Function', {
            Code: Match.anyValue(),
            Runtime: 'nodejs18.x',
            Handler: 'index.handler',
            Timeout: 240,
            Description: 'IoT Device Simulator custom resource function',
            Environment: {
                Variables: {
                    'SOLUTION_ID': Match.anyValue(),
                    'SOLUTION_VERSION':  Match.anyValue()
                }
            },
            Role: {}
        });

        template.hasResourceProperties('AWS::Lambda::Function', {
            Code: Match.anyValue(),
            Runtime: 'nodejs18.x',
            Handler: 'index.handler',
            Timeout: 900,
            Description: 'IoT Device Simulator function',
            Environment: {
                Variables: {
                    'IOT_ENDPOINT': {
                        'Fn::GetAtt': [customResourcesEndpointAddressCapture, 'IOT_ENDPOINT']
                    },
                    'ROUTE_BUCKET':  {
                        Ref: storageRoutesBucketCapture
                    },
                    'SIM_TABLE': {
                        Ref: storageIDSSimulationsTableCapture
                    },
                    'SEND_ANONYMOUS_METRIC' : 
                    {
                        "Fn::FindInMap": [
                        "Solution",
                        "Config",
                        "SendAnonymousUsage",
                        ],
                    }
                }
            },
            Role: {}
        });
        expect(template.toJSON()['Resources'][customResourcesEndpointAddressCapture.asString()]['Type']).toStrictEqual('AWS::CloudFormation::CustomResource');
        expect(template.toJSON()['Resources'][storageRoutesBucketCapture.asString()]['Type']).toStrictEqual('AWS::S3::Bucket');
        expect(template.toJSON()['Resources'][storageIDSSimulationsTableCapture.asString()]['Type']).toStrictEqual('AWS::DynamoDB::Table');

        template.hasResourceProperties('AWS::Lambda::Function', {
            Code: Match.anyValue(),
            Runtime: 'nodejs18.x',
            Handler: 'index.handler',
            Timeout: 60,
            Description: 'IoT Device Simulator microservices function',
            Environment: {
                Variables: {
                    'DEVICE_TYPES_TBL':  {
                        Ref: deviceTypeTableCapture
                    },
                    'SEND_ANONYMOUS_METRIC': Match.anyValue(),
                    'SIMULATIONS_TBL': {
                        Ref: testSimTableCapture
                    },
                    "SIM_STEP_FUNCTION": {
                        Ref: simulatorStepFunctionsStateMachineCapture
                    },
                    'SOLUTION_ID': Match.anyValue(),
                    'UUID': Match.anyValue(),
                    'VERSION':  Match.anyValue()
                }
            },
            Role: {}
        });
        
        expect(template.toJSON()['Resources'][deviceTypeTableCapture.asString()]['Type']).toStrictEqual('AWS::DynamoDB::Table');
        expect(template.toJSON()['Resources'][testSimTableCapture.asString()]['Type']).toStrictEqual('AWS::DynamoDB::Table');
        expect(template.toJSON()['Resources'][simulatorStepFunctionsStateMachineCapture.asString()]['Type']).toStrictEqual('AWS::StepFunctions::StateMachine');
    });

    it('it should have api gateway resources', () => {
        template.resourceCountIs('AWS::ApiGateway::Deployment', 1);
        template.hasResourceProperties('AWS::ApiGateway::Deployment', {
            "RestApiId": {
                "Ref": ioTDeviceSimulatorApiCapture,
            }
        });
        expect(template.toJSON()['Resources'][ioTDeviceSimulatorApiCapture.asString()]['Type']).toStrictEqual('AWS::ApiGateway::RestApi');
        template.resourceCountIs('AWS::ApiGateway::Stage', 1);
        
    });

    it('it should have dynamoDB Tables', () => {
        template.resourceCountIs('AWS::DynamoDB::Table', 2);
        template.hasResource('AWS::DynamoDB::Table', {
            "DeletionPolicy": "Retain",
            "Properties": {
              "AttributeDefinitions": [
                {
                  "AttributeName": "simId",
                  "AttributeType": "S",
                },
              ],
              "BillingMode": "PAY_PER_REQUEST",
              "KeySchema": [
                {
                  "AttributeName": "simId",
                  "KeyType": "HASH",
                },
              ],
              "PointInTimeRecoverySpecification": {
                "PointInTimeRecoveryEnabled": true,
              },
              "SSESpecification": {
                "SSEEnabled": true,
              },
              "Tags": [
                {
                  "Key": "SolutionId",
                  "Value": {
                    "Fn::FindInMap": [
                      "Solution",
                      "Config",
                      "SolutionId",
                    ],
                  },
                },
              ],
            },
            "Type": "AWS::DynamoDB::Table",
            "UpdateReplacePolicy": "Retain"
        });
        template.hasResource('AWS::DynamoDB::Table', {
        });
    });

    it('it should have cognito user pool', () => {
        template.resourceCountIs('AWS::Cognito::UserPoolUser', 1);
        template.resourceCountIs('AWS::Cognito::UserPoolClient', 1);
        template.resourceCountIs('AWS::Cognito::UserPool', 1);
    });

    it('it should have s3 buckets', () => {
        template.resourceCountIs('AWS::S3::Bucket', 3);
    });

    it('it should have IAM policy', () => {
        template.resourceCountIs('AWS::IAM::Policy', 6);
        const customResourcesHelperLambdaRoleCapture = new Capture();
        const simulatorEngineLambdaRoleCapture = new Capture();
        const simulatorMicroservicesRole = new Capture();
        template.hasResourceProperties('AWS::IAM::Policy', {
            "PolicyDocument": {
                "Statement": [
                  {
                    "Action": [
                      "logs:CreateLogGroup",
                      "logs:CreateLogStream",
                      "logs:PutLogEvents",
                    ],
                    "Effect": "Allow",
                    "Resource": {
                      "Fn::Join": [
                        "",
                        [
                          "arn:",
                          {
                            "Ref": "AWS::Partition",
                          },
                          ":logs:",
                          {
                            "Ref": "AWS::Region",
                          },
                          ":",
                          {
                            "Ref": "AWS::AccountId",
                          },
                          ":log-group:/aws/lambda/*",
                        ],
                      ],
                    },
                  },
                ],
                "Version": "2012-10-17",
            },
            "Roles": [
                {
                "Ref": customResourcesHelperLambdaRoleCapture,
                },
                {
                  "Ref": simulatorEngineLambdaRoleCapture,
                },
                {
                  "Ref": simulatorMicroservicesRole,
                }
            ]
        });
        expect(template.toJSON()['Resources'][customResourcesHelperLambdaRoleCapture.asString()]['Type']).toStrictEqual('AWS::IAM::Role');
        expect(template.toJSON()['Resources'][simulatorEngineLambdaRoleCapture.asString()]['Type']).toStrictEqual('AWS::IAM::Role');
        expect(template.toJSON()['Resources'][simulatorMicroservicesRole.asString()]['Type']).toStrictEqual('AWS::IAM::Role');

        template.hasResourceProperties('AWS::IAM::Policy', {
            "PolicyDocument": {
                "Statement": [
                  {
                    "Action": "iot:DetachPolicy",
                    "Effect": "Allow",
                    "Resource": "*",
                  },
                ],
                "Version": "2012-10-17",
              },
              "Roles": [
                {
                  "Ref": customResourcesHelperLambdaRoleCapture
                },
              ]
        });
        expect(template.toJSON()['Resources'][customResourcesHelperLambdaRoleCapture.asString()]['Type']).toStrictEqual('AWS::IAM::Role');

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
                        "Fn::GetAtt": [
                          storageRoutesBucketCapture,
                          "Arn",
                        ],
                      },
                      {
                        "Fn::Join": [
                          "",
                          [
                            {
                              "Fn::GetAtt": [
                                storageRoutesBucketCapture,
                                "Arn",
                              ],
                            },
                            "/*",
                          ],
                        ],
                      },
                    ],
                  },
                ],
                "Version": "2012-10-17",
              },
              "Roles": [
                {
                  "Ref": simulatorEngineLambdaRoleCapture
                },
              ],
        });
        expect(template.toJSON()['Resources'][simulatorEngineLambdaRoleCapture.asString()]['Type']).toStrictEqual('AWS::IAM::Role');
        expect(template.toJSON()['Resources'][storageRoutesBucketCapture.asString()]['Type']).toStrictEqual('AWS::S3::Bucket');

        template.hasResourceProperties('AWS::IAM::Policy', {
            "PolicyDocument": {
                "Statement": [
                  {
                    "Action": "states:StartExecution",
                    "Effect": "Allow",
                    "Resource": {
                      "Ref": simulatorStepFunctionsStateMachineCapture,
                    },
                  },
                ],
                "Version": "2012-10-17",
              },
              "Roles": [
                {
                  "Ref": simulatorMicroservicesRole
                },
              ],
        });
        expect(template.toJSON()['Resources'][simulatorMicroservicesRole.asString()]['Type']).toStrictEqual('AWS::IAM::Role');
        expect(template.toJSON()['Resources'][simulatorStepFunctionsStateMachineCapture.asString()]['Type']).toStrictEqual('AWS::StepFunctions::StateMachine');
    });
});
