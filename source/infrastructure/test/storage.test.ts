// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import '@aws-cdk/assert/jest';
import { SynthUtils } from '@aws-cdk/assert';
import { Stack } from '@aws-cdk/core';
import { Bucket } from '@aws-cdk/aws-s3';;
import { StorageContruct } from '../lib/storage';


test('IoT Device Simulator storageConstruct Test', () => {
    const stack = new Stack();
    const testBucket = new Bucket(stack, "testBucket", {});

    const storage = new StorageContruct(stack, 'storage', {
        solutionId: 'testId',
        s3LogsBucket: testBucket
    })

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});