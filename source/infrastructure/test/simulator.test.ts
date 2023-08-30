// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Stack } from "aws-cdk-lib";
import { Capture, Match, Template } from 'aws-cdk-lib/assertions';
import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";
import { Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { SimulatorConstruct } from "../lib/simulator";

describe('When IoT Device Simulator SimulatorConstruct is created', () => {
    let template: Template;

    beforeAll(() => {
        template = buildStack();
    });

    const deviceTypeTableCapture = new Capture();
    const testSimTableCapture = new Capture();
    const simulatorStepFunctionsStateMachineCapture = new Capture();

    it('it should have custom resource', () => {
        template.resourceCountIs('AWS::Lambda::Function', 2);
        template.hasResource('AWS::Lambda::Function', { 
            Type:'AWS::Lambda::Function',
            Properties: {
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
                        'SEND_ANONYMOUS_METRIC': 'Yes',
                        'SIMULATIONS_TBL': {
                            Ref: testSimTableCapture
                        },
                        "SIM_STEP_FUNCTION": {
                            Ref: simulatorStepFunctionsStateMachineCapture
                        },
                        'SOLUTION_ID': 'testId',
                        'UUID': 'abc123',
                        'VERSION': 'testVersion'
                    }
                },
                Role: {}
        }});
        expect(template.toJSON()['Resources'][deviceTypeTableCapture.asString()]['Type']).toStrictEqual('AWS::DynamoDB::Table');
        expect(template.toJSON()['Resources'][testSimTableCapture.asString()]['Type']).toStrictEqual('AWS::DynamoDB::Table');
        expect(template.toJSON()['Resources'][simulatorStepFunctionsStateMachineCapture.asString()]['Type']).toStrictEqual('AWS::StepFunctions::StateMachine');
    });

    it('it should have dynamoDB Tables', () => {
        template.resourceCountIs('AWS::DynamoDB::Table', 2);
        template.hasResource('AWS::DynamoDB::Table', {
            "Type": "AWS::DynamoDB::Table",
            "DeletionPolicy": "Retain",
            "Properties": {
                "AttributeDefinitions": [
                {
                    "AttributeName": "typeId",
                    "AttributeType": "S",
                }],
                "KeySchema": [
                {
                "AttributeName": "typeId",
                "KeyType": "HASH",
                }],
                "ProvisionedThroughput": {
                    "ReadCapacityUnits": 5,
                    "WriteCapacityUnits": 5,
                },
            },
            "UpdateReplacePolicy": "Retain"
        });

        template.hasResource('AWS::DynamoDB::Table', {
            "Type": "AWS::DynamoDB::Table",
            "DeletionPolicy": "Retain",
            "Properties": {
                "AttributeDefinitions": [
                  {
                    "AttributeName": "simId",
                    "AttributeType": "S",
                  },
                ],
                "KeySchema": [
                  {
                    "AttributeName": "simId",
                    "KeyType": "HASH",
                  },
                ],
                "ProvisionedThroughput": {
                  "ReadCapacityUnits": 5,
                  "WriteCapacityUnits": 5,
                },
            },
            "UpdateReplacePolicy": "Retain"
        });
    });
    it('it should have IAM policies', () => {
        template.resourceCountIs('AWS::IAM::Role', 3);
        template.resourceCountIs('AWS::IAM::Policy', 4);
        const simulatorEngineLambdaRoleCapture = new Capture();
        const simulatorMicroservicesRole = new Capture();
        template.hasResourceProperties('AWS::IAM::Policy', {
            "PolicyDocument": {
                "Statement": [
                  {
                    "Action": "cloudwatch:Get*",
                    "Effect": "Allow",
                    "Resource": "*",
                  },
                ],
                "Version": "2012-10-17",
              },
              "Roles": [
                {
                  "Ref": simulatorEngineLambdaRoleCapture,
                },
                {
                  "Ref": simulatorMicroservicesRole,
                },
              ]
        });
        expect(template.toJSON()['Resources'][simulatorEngineLambdaRoleCapture.asString()]['Type']).toStrictEqual('AWS::IAM::Role');
        expect(template.toJSON()['Resources'][simulatorMicroservicesRole.asString()]['Type']).toStrictEqual('AWS::IAM::Role');
    });
    it('it should have CloudWatch resources', () => {
        template.resourceCountIs('AWS::CloudWatch::Alarm', 3);
    });
});

function buildStack() {
    const stack = new Stack();
    const testRouteBucket = new Bucket(stack, 'testRouteBucket');
    const testPolicy = new Policy(stack, 'TestPolicy', {
        statements: [
            new PolicyStatement({
                resources: ['*'],
                actions: ['cloudwatch:Get*']
            })
        ]
    });
    const testDTypeTable = new Table(stack, 'TestDTypeTable', {
        partitionKey: {
            name: "typeId", type: AttributeType.STRING
        }
    });
    const testSimTable = new Table(stack, 'TestSimTable', {
        partitionKey: {
            name: "simId", type: AttributeType.STRING
        }
    });
    const testSourceBucket = Bucket.fromBucketName(stack, 'SourceCodeBucket', 'test-bucket-region');

    const simulator = new SimulatorConstruct(stack, 'simulator', {
        cloudWatchLogsPolicy: testPolicy,
        iotEndpointAddress: 'abcd123efg45h-ats.iot.some-region.amazonaws.com',
        simulationTable: testSimTable,
        deviceTypeTable: testDTypeTable,
        routesBucket: testRouteBucket,
        uniqueSuffix: "testSuffix",
        solutionConfig: {
            sendAnonymousUsage: 'Yes',
            solutionId: 'testId',
            solutionVersion: 'testVersion',
            sourceCodeBucket: testSourceBucket,
            sourceCodePrefix: 'testPrefix/',
        },
        uuid: 'abc123'
    })

    return Template.fromStack(stack);
}
