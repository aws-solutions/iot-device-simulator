
// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import '@aws-cdk/assert/jest';
import { SynthUtils } from '@aws-cdk/assert';
import { App } from '@aws-cdk/core';
import { IDSStack } from '../lib/iot-device-simulator-stack';

test('IoT Device Simulator stack test', () => {
    const app = new App();
    const stack = new IDSStack(app, 'TestDLTStack');

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});