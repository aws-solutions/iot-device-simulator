
// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { IDSStack } from "../lib/iot-device-simulator-stack";
import { App } from "aws-cdk-lib";

test('IoT Device Simulator stack test', () => {
    const app = new App();
    const stack = new IDSStack(app, 'TestDLTStack');

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});
