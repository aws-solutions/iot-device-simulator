// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0


import { Stack } from "aws-cdk-lib";
import { Template } from 'aws-cdk-lib/assertions';
import { CommonResourcesConstruct } from "../lib/common-resources";

test('IoT Device Simulator CommonResourceConstruct Test', () => {
    const stack = new Stack();

    const commonResources = new CommonResourcesConstruct(stack, 'TestCommonResource', {
        sourceCodeBucket: "test-bucket"
    });

    const template =  Template.fromStack(stack);
    template.resourceCountIs('AWS::S3::Bucket', 1);
    template.hasResource('AWS::S3::Bucket', {
        Type:'AWS::S3::Bucket',
        Properties : {
            'AccessControl': 'LogDeliveryWrite',
            'BucketEncryption': {
              'ServerSideEncryptionConfiguration': [
                {
                  'ServerSideEncryptionByDefault': {
                    'SSEAlgorithm': 'AES256',
                  },
                },
              ],
            },
            'OwnershipControls': {
              'Rules': [
                {
                  'ObjectOwnership': 'ObjectWriter'
                },
              ],
            },
            'PublicAccessBlockConfiguration': {
              'BlockPublicAcls': true,
              'BlockPublicPolicy': true,
              'IgnorePublicAcls': true,
              'RestrictPublicBuckets': true,
            },
        },
        UpdateReplacePolicy: 'Retain'
    });
});
