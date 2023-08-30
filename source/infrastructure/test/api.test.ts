// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Stack } from "aws-cdk-lib";
import { Capture, Match, Template } from 'aws-cdk-lib/assertions';
import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";
import { Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Code, Function as LambdaFunction, Runtime } from "aws-cdk-lib/aws-lambda";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { ApiConstruct } from "../lib/api";

describe('When IoT Device Simulator API is created', () => {
    let template: Template;

    beforeAll(() => {
        template = buildStack();
    });

    const simulatorApiCapture = new Capture();
    const apiLogGroupCapture = new Capture();
    const lambdaRoleCapture = new Capture();

    it('it should have api gateway resources', () => {
        template.resourceCountIs('AWS::ApiGateway::RequestValidator', 1);
        template.resourceCountIs('AWS::ApiGateway::Deployment', 1);

        template.hasResourceProperties('AWS::ApiGateway::Deployment', {
            "RestApiId": {
                "Ref": simulatorApiCapture,
            }
        });
        expect(template.toJSON()['Resources'][simulatorApiCapture.asString()]['Type']).toStrictEqual('AWS::ApiGateway::RestApi');

        template.resourceCountIs('AWS::ApiGateway::Stage', 1);
        template.hasResourceProperties('AWS::ApiGateway::Stage', {
            "AccessLogSetting": {
                "DestinationArn": {
                  "Fn::GetAtt": [
                    apiLogGroupCapture,
                    "Arn",
                  ],
                },
                "Format": Match.anyValue()
              }
        });
        expect(template.toJSON()['Resources'][apiLogGroupCapture.asString()]['Type']).toStrictEqual('AWS::Logs::LogGroup');
        
        template.hasResourceProperties('AWS::ApiGateway::Method', {
            'HttpMethod': 'OPTIONS'
        });
        template.hasResourceProperties('AWS::ApiGateway::Method', {
            'HttpMethod': 'ANY'
        });
    });

    it('it should have dynamoDB Tables', () => {
        template.resourceCountIs('AWS::DynamoDB::Table', 2);
        template.hasResource('AWS::DynamoDB::Table', {
            "DeletionPolicy": "Retain",
            "Properties": {
              "AttributeDefinitions": [
                {
                  "AttributeName": "typeId",
                  "AttributeType": "S",
                },
              ],
              "KeySchema": [
                {
                  "AttributeName": "typeId",
                  "KeyType": "HASH",
                },
              ],
              "ProvisionedThroughput": {
                "ReadCapacityUnits": 5,
                "WriteCapacityUnits": 5,
              },
            },
            "Type": "AWS::DynamoDB::Table",
            "UpdateReplacePolicy": "Retain",
        });
        template.hasResource('AWS::DynamoDB::Table', {
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
            "Type": "AWS::DynamoDB::Table",
            "UpdateReplacePolicy": "Retain",
        });
    });
    it('it should have dynamoDB Tables', () => {
        template.resourceCountIs('AWS::Lambda::Function', 1);
        template.hasResourceProperties('AWS::Lambda::Function', {
            'Role' : {
                'Fn::GetAtt': [
                  lambdaRoleCapture,
                  'Arn'
            ]}
        });
        expect(template.toJSON()['Resources'][lambdaRoleCapture.asString()]['Type']).toStrictEqual('AWS::IAM::Role');
        template.resourceCountIs('AWS::Lambda::Permission', 1);
    });

});

function buildStack() {
    const stack = new Stack();
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
    const testFunction = new LambdaFunction(stack, 'testFunction', {
        handler: 'index.handler',
        runtime: Runtime.NODEJS_18_X,
        code: Code.fromBucket(testSourceBucket, `prefix/custom-resource.zip`)
    });

    const api = new ApiConstruct(stack, 'TestAPI', {
        cloudWatchLogsPolicy: testPolicy,
        stepFunctionsARN: 'arn:aws:states:us-east-1:someAccount:stateMachine:HelloWorld-StateMachine',
        simulationTable: testDTypeTable,
        deviceTypeTable: testSimTable,
        routesBucketArn: 'arn:aws:s3:::testRouteBucket',
        microservicesLambda: testFunction,
        solutionConfig: {
            sendAnonymousUsage: 'Yes',
            solutionId: 'testId',
            solutionVersion: 'testVersion',
            sourceCodeBucket: testSourceBucket,
            sourceCodePrefix: 'testPrefix/',

        },
        uuid: 'abc123'
    });
    return Template.fromStack(stack);
}
