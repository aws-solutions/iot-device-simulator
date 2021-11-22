// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Aws, ArnFormat, Construct, Duration, RemovalPolicy, Stack } from '@aws-cdk/core';
import { CfnIdentityPool, CfnIdentityPoolRoleAttachment, CfnUserPool, CfnUserPoolUser, UserPool, UserPoolClient } from '@aws-cdk/aws-cognito';
import { Effect, FederatedPrincipal, PolicyDocument, PolicyStatement, Role } from '@aws-cdk/aws-iam';
import { Bucket, IBucket } from '@aws-cdk/aws-s3';
import { CloudFrontToS3 } from '@aws-solutions-constructs/aws-cloudfront-s3';
import { CfnPolicy } from '@aws-cdk/aws-iot';
import { addCfnSuppressRules } from '../utils/utils';

/**
 * UiConstructProps props
 * @interface ConsoleConstructProps
 */
export interface ConsoleConstructProps {
  // The API ID
  readonly apiId: string;
  // S3 logging bucket
  readonly s3LogsBucket: Bucket;
  // User E-Mail address
  readonly adminEmail: string;
  //map resources
  readonly mapArn: string;
  readonly placeIndexArn: string;
}

/**
 * @class
 * IoT Device Simulator Framework UI Construct.
 * It creates a CloudFront distribution, an UI hosting S3 bucket,
 * Cognito resources, and custom resources for UI assets.
 */
export class ConsoleConstruct extends Construct {
  // CloudFront distribution domain name
  public cloudFrontDomainName: string;
  // Cognito Identity pool ID
  public identityPoolId: string;
  // UI S3 bucket
  public consoleBucket: IBucket;
  // Cognito user pool ID
  public userPoolId: string;
  // Cognito user pool web client ID
  public webClientId: string;
  //IoT policy name
  public iotPolicy: CfnPolicy;

  constructor(scope: Construct, id: string, props: ConsoleConstructProps) {
    super(scope, id);

    const consoleCloudfrontDist = new CloudFrontToS3(this, 'Distribution', {
      bucketProps: {
        serverAccessLogsBucket: props.s3LogsBucket,
        serverAccessLogsPrefix: 'console-s3/'
      },
      cloudFrontDistributionProps: {
        comment: 'IoT Device Simulator Distribution',
        enableLogging: true,
        errorResponses: [
          { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
          { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' }
        ],
        httpVersion: 'http2',
        logBucket: props.s3LogsBucket,
        logFilePrefix: 'console-cf/'

      },
      insertHttpSecurityHeaders: false
    });
    this.cloudFrontDomainName = consoleCloudfrontDist.cloudFrontWebDistribution.domainName;
    this.consoleBucket = consoleCloudfrontDist.s3BucketInterface;

    const userPool = new UserPool(this, 'UserPool', {
      passwordPolicy: {
        minLength: 12,
        requireDigits: true,
        requireLowercase: true,
        requireSymbols: true,
        requireUppercase: true
      },
      removalPolicy: RemovalPolicy.DESTROY,
      selfSignUpEnabled: false,
      signInAliases: {
        email: true
      },
      userPoolName: `${Aws.STACK_NAME}-user-pool`,
      userInvitation: {
        emailSubject: '[IoT Device Simulator] Login information',
        emailBody: `
          <p>
            You are invited to join IoT Device Simulator.<br />
            https://${this.cloudFrontDomainName}
          </p>
          <p>
            Please sign in to IoT Device Simulator using the temporary credentials below:<br />
            Username: <strong>{username}</strong><br />Password: <strong>{####}</strong>
          </p>
        `
      }
    });
    (userPool.node.defaultChild as CfnUserPool).userPoolAddOns = { advancedSecurityMode: 'ENFORCED' };
    this.userPoolId = userPool.userPoolId;

    const userPoolClient = new UserPoolClient(this, 'UserPoolClient', {
      generateSecret: false,
      preventUserExistenceErrors: true,
      refreshTokenValidity: Duration.days(1),
      userPool,
      userPoolClientName: `${Aws.STACK_NAME}-userpool-client`
    });
    this.webClientId = userPoolClient.userPoolClientId;

    new CfnUserPoolUser(this, 'User', { // NOSONAR: typescript:S1848
      userPoolId: userPool.userPoolId,
      desiredDeliveryMediums: ['EMAIL'],
      forceAliasCreation: true,
      userAttributes: [
        { name: 'email', value: props.adminEmail },
        { name: 'email_verified', value: 'true' }
      ],
      username: props.adminEmail
    });

    const identityPool = new CfnIdentityPool(this, 'IdentityPool', {
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [{
        clientId: userPoolClient.userPoolClientId,
        providerName: userPool.userPoolProviderName,
        serverSideTokenCheck: false
      }]
    });


    this.identityPoolId = identityPool.ref;

    const idsIotPolicy = new CfnPolicy(this, 'IDS-IoT-Policy', {
      policyDocument: new PolicyDocument({
        statements: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ["iot:Connect"],
            resources: [Stack.of(this).formatArn({ service: 'iot', resource: 'client', resourceName: '*', arnFormat: ArnFormat.SLASH_RESOURCE_NAME })]
          }),
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ["iot:Subscribe"],
            resources: [Stack.of(this).formatArn({ service: 'iot', resource: 'topicfilter', resourceName: '*', arnFormat: ArnFormat.SLASH_RESOURCE_NAME })]
          }),
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ["iot:Receive"],
            resources: [Stack.of(this).formatArn({ service: 'iot', resource: 'topic', resourceName: '*', arnFormat: ArnFormat.SLASH_RESOURCE_NAME })]
          })
        ]
      })
    });

    this.iotPolicy = idsIotPolicy;
    addCfnSuppressRules(idsIotPolicy, [
      { id: 'W11', reason: 'Cannot specify the resource to attach policy to identity.' }
    ]);

    const authenticatedRole = new Role(this, 'IdentityPoolAuthenticatedRole', {
      assumedBy: new FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: { 'cognito-identity.amazonaws.com:aud': identityPool.ref },
          'ForAnyValue:StringLike': { 'cognito-identity.amazonaws.com:amr': 'authenticated' }
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
      description: `${Aws.STACK_NAME} Identity Pool authenticated role`,
      inlinePolicies: {
        'ExecuteApiPolicy': new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['execute-api:Invoke'],
              resources: [Stack.of(this).formatArn({ service: 'execute-api', resource: `${props.apiId}`, resourceName: 'prod/*', arnFormat: ArnFormat.SLASH_RESOURCE_NAME })]
            }),
          ],
        }),
        'LocationServicePolicy': new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                "geo:SearchPlaceIndexForText",
                "geo:GetMapGlyphs",
                "geo:GetMapSprites",
                "geo:GetMapStyleDescriptor",
                "geo:SearchPlaceIndexForPosition",
                "execute-api:Invoke",
                "geo:GetMapTile"
              ],
              resources: [
                props.mapArn,
                props.placeIndexArn,
              ]
            }),
          ]
        }),
        'IoTPolicy': new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                "iot:AttachPrincipalPolicy"
              ],
              resources: ['*']
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ["iot:Connect"],
              resources: [Stack.of(this).formatArn({ service: 'iot', resource: 'client', resourceName: '*', arnFormat: ArnFormat.SLASH_RESOURCE_NAME })]
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ["iot:Subscribe"],
              resources: [Stack.of(this).formatArn({ service: 'iot', resource: 'topicfilter', resourceName: '*', arnFormat: ArnFormat.SLASH_RESOURCE_NAME })]
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ["iot:Receive"],
              resources: [Stack.of(this).formatArn({ service: 'iot', resource: 'topic', resourceName: '*', arnFormat: ArnFormat.SLASH_RESOURCE_NAME })]
            })
          ]
        })
      }
    });
    addCfnSuppressRules(authenticatedRole, [
      { id: 'W11', reason: 'iot:AttachPrincipalPolicy does not allow for resource specification' }
    ]);

    new CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachement', { // NOSONAR: typescript:S1848
      identityPoolId: identityPool.ref,
      roles: { authenticated: authenticatedRole.roleArn }
    });
  }
}