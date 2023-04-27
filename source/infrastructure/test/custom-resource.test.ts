// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { CustomResourcesConstruct } from '../lib/custom-resource';
import { Stack } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";

test('IoT Device Simulator customResourcesConstruct Test', () => {
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

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});
