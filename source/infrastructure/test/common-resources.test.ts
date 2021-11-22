// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import '@aws-cdk/assert/jest';
import { SynthUtils } from '@aws-cdk/assert';
import { Stack } from '@aws-cdk/core';
import { CommonResourcesConstruct } from '../lib/common-resources';


test('IoT Device Simulator CommonResourceConstruct Test', () => {
    const stack = new Stack();

    const commonResources = new CommonResourcesConstruct(stack, 'TestCommonResource', {
        sourceCodeBucket: "testBucket"
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});