// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Stack } from "aws-cdk-lib";
import { Capture, Template } from 'aws-cdk-lib/assertions';
import { Bucket } from "aws-cdk-lib/aws-s3";
import { StorageContruct } from "../lib/storage";


test('IoT Device Simulator storageConstruct Test', () => {
    const stack = new Stack();
    const testBucket = new Bucket(stack, "testBucket", {});

    const storage = new StorageContruct(stack, 'storage', {
        solutionId: 'testId',
        s3LogsBucket: testBucket
    })

    const loggingBucketCapture = new Capture();
    const template =  Template.fromStack(stack);
    template.resourceCountIs('AWS::DynamoDB::Table', 2);
    template.hasResource('AWS::DynamoDB::Table', {
        "Type": "AWS::DynamoDB::Table",
        "DeletionPolicy": "Retain",
        "Properties": {
            "AttributeDefinitions": [
              {
                "AttributeName": "typeId",
                "AttributeType": "S",
              },
            ],
            "BillingMode": "PAY_PER_REQUEST",
            "KeySchema": [
              {
                "AttributeName": "typeId",
                "KeyType": "HASH",
              },
            ],
            "PointInTimeRecoverySpecification": {
              "PointInTimeRecoveryEnabled": true,
            },
            "SSESpecification": {
              "SSEEnabled": true,
            },
          },
        "UpdateReplacePolicy": "Retain"
    });
    template.hasResource('AWS::DynamoDB::Table', {
        "Type": "AWS::DynamoDB::Table",
        "DeletionPolicy": "Retain",
        "Properties": {
            "AttributeDefinitions": [
              {
                "AttributeName": "simId",
                "AttributeType": "S",
              },
            ],
            "BillingMode": "PAY_PER_REQUEST",
            "KeySchema": [
              {
                "AttributeName": "simId",
                "KeyType": "HASH",
              },
            ],
            "PointInTimeRecoverySpecification": {
              "PointInTimeRecoveryEnabled": true,
            },
            "SSESpecification": {
              "SSEEnabled": true,
            },
          },
        "UpdateReplacePolicy": "Retain"
    });
    template.resourceCountIs('AWS::S3::Bucket', 2);

    template.hasResource('AWS::S3::Bucket', {
        Type:'AWS::S3::Bucket',
        "Properties": {
            "BucketEncryption": {
              "ServerSideEncryptionConfiguration": [
                {
                  "ServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256",
                  },
                },
              ],
            },
            "LoggingConfiguration": {
              "DestinationBucketName": {
                "Ref": loggingBucketCapture,
              },
              "LogFilePrefix": "routes-bucket-access/",
            },
            "PublicAccessBlockConfiguration": {
              "BlockPublicAcls": true,
              "BlockPublicPolicy": true,
              "IgnorePublicAcls": true,
              "RestrictPublicBuckets": true,
            },
          },
        UpdateReplacePolicy: 'Retain'
    });
    expect(template.toJSON()['Resources'][loggingBucketCapture.asString()]['Type']).toStrictEqual('AWS::S3::Bucket');
    template.resourceCountIs('AWS::S3::BucketPolicy', 1);
});
