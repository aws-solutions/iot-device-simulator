// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { ApiConstruct } from "../lib/api";
import { Stack } from "aws-cdk-lib";
import { Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Code, Runtime, Function as LambdaFunction } from "aws-cdk-lib/aws-lambda";


test('IoT Device Simulator API Test', () => {
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
        runtime: Runtime.NODEJS_14_X,
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

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});
