// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { CommonResourcesConstruct}  from "../lib/common-resources";
import { Stack } from "aws-cdk-lib";

test('IoT Device Simulator CommonResourceConstruct Test', () => {
    const stack = new Stack();

    const commonResources = new CommonResourcesConstruct(stack, 'TestCommonResource', {
        sourceCodeBucket: "test-bucket"
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});
