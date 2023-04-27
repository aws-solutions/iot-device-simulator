// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { SimulatorConstruct } from "../lib/simulator";
import { Stack } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";

test('IoT Device Simulator SimulatorConstruct Test', () => {
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

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});
