// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ArnFormat, Construct, RemovalPolicy, Stack } from '@aws-cdk/core';
import { Effect, Policy, PolicyStatement } from '@aws-cdk/aws-iam';
import { BlockPublicAccess, Bucket, BucketAccessControl, BucketEncryption, IBucket } from '@aws-cdk/aws-s3';
import { addCfnSuppressRules } from '../utils/utils';

/**
 * CommonResourcesConstruct props
 * @interface CommonResourcesConstructProps
 */
export interface CommonResourcesConstructProps {
  // Source code bucket
  sourceCodeBucket: string;
}

/**
 * @class
 * IoT Device Simulator Common Resources Construct.
 * It creates a common CloudWatch Logs policy for Lambda functions, a logging S3 bucket, and M2C2 S3 bucket.
 */
export class CommonResourcesConstruct extends Construct {
  // CloudWatch Logs policy
  public cloudWatchLogsPolicy: Policy;
  // S3 Logging bucket
  public s3LoggingBucket: Bucket;
  // Code S3 bucket
  public sourceCodeBucket: IBucket;

  constructor(scope: Construct, id: string, props: CommonResourcesConstructProps) {
    super(scope, id);

    this.cloudWatchLogsPolicy = new Policy(this, 'CloudWatchLogsPolicy', {
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:PutLogEvents'
          ],
          resources: [
            Stack.of(this).formatArn({ service: 'logs', resource: 'log-group', resourceName: '/aws/lambda/*', arnFormat: ArnFormat.COLON_RESOURCE_NAME })
          ]
        })
      ]
    });

    this.s3LoggingBucket = new Bucket(this, 'LogBucket', {
      accessControl: BucketAccessControl.LOG_DELIVERY_WRITE,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.RETAIN
    });

    addCfnSuppressRules(this.s3LoggingBucket, [
      { id: 'W35', reason: 'This bucket is to store S3 logs, so it does not require access logs.' },
      { id: 'W51', reason: 'This bucket is to store S3 logs, so it does not require S3 policy.' }
    ]);

    this.sourceCodeBucket = Bucket.fromBucketName(this, 'SourceCodeBucket', props.sourceCodeBucket);
  }
}