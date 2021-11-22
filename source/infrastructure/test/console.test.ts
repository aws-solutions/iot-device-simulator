// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import '@aws-cdk/assert/jest';
import { SynthUtils } from '@aws-cdk/assert';
import { Stack } from '@aws-cdk/core';
import { Bucket } from '@aws-cdk/aws-s3';
import { ConsoleConstruct } from '../lib/console';

test('IoT Device Simulator ConsoleConstruct Test', () => {
    const stack = new Stack();
    const testBucket = new Bucket(stack, "testBucket", {});

    const console = new ConsoleConstruct(stack, 'TestCommonResource', {
        apiId: '12ab34cde5',
        s3LogsBucket: testBucket,
        adminEmail: "someEmail",
        mapArn: "arn:aws:geo:region:accountID:map/ExampleMap",
        placeIndexArn: "arn:aws:geo:region:accountID:place-index/ExamplePlaceIndex"
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});