// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CfnPolicy, Effect, Policy, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { CfnFunction, Code, Function as LambdaFunction, Runtime } from "aws-cdk-lib/aws-lambda";
import { IBucket } from "aws-cdk-lib/aws-s3";
import { addCfnSuppressRules } from "@aws-solutions-constructs/core";
import { Construct } from "constructs";
import { ArnFormat, Aws, CustomResource, Duration, Stack } from "aws-cdk-lib";

/**
 * CustomResourcesConstruct props
 * @interface CustomResourcesConstructProps
 */
export interface CustomResourcesConstructProps {
  readonly cloudWatchLogsPolicy: Policy;
  readonly solutionConfig: {
    solutionId: string;
    solutionVersion: string;
    sourceCodeBucket: IBucket;
    sourceCodePrefix: string;
  };
}

/**
 * Custom resource setup UI props
 * @interface CustomResourceSetupUiProps
 */
interface CustomResourceSetupUiProps {
  // API endpoint
  apiEndpoint: string;
  // Cognito resources
  cognitoIdentityPool: string;
  cognitoUserPool: string;
  cognitoUserPoolClient: string;
  //Console S3 bucket
  consoleBucket: IBucket;
  //map resources
  mapName: string;
  placeIndexName: string;
  //S3 bucket for vehcile routes
  routesBucket: IBucket;
  //IoT policy name
  iotPolicyName: string;
}

interface CustomResourceDetachIotPolicyProps {
  //IoT policy name
  iotPolicyName: string;
}

/**
 * @class
 * Iot Device Simulator on AWS Custom Resources Construct.
 * It creates a custom resource Lambda function, a solution UUID, and a custom resource to send anonymous usage.
 */
export class CustomResourcesConstruct extends Construct {
  public uuid: string
  public uniqueSuffix: string;
  public reducedStackName: string;
  public helperLambda: LambdaFunction
  public helperLambdaRole: Role
  public iotEndpoint: string
  // Source code bucket
  private sourceCodeBucket: IBucket;
  // Source code prefix
  private sourceCodePrefix: string;

  constructor(scope: Construct, id: string, props: CustomResourcesConstructProps) {
    super(scope, id);

    this.sourceCodeBucket = props.solutionConfig.sourceCodeBucket;
    this.sourceCodePrefix = props.solutionConfig.sourceCodePrefix;

    this.helperLambdaRole = new Role(this, 'HelperLambdaRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      path: '/',
      inlinePolicies: {
        'customResourcePolicy': new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['iot:DescribeEndpoint'],
              resources: ['*']
            })
          ]
        })
      }
    });
    this.helperLambdaRole.attachInlinePolicy(props.cloudWatchLogsPolicy);
    addCfnSuppressRules(this.helperLambdaRole, [
      { id: 'W11', reason: 'iot:DescribeEndpoint cannot specify the resource.' }
    ]);

    this.helperLambda = new LambdaFunction(this, 'HelperLambda', {
      description: 'IoT Device Simulator custom resource function',
      handler: 'index.handler',
      runtime: Runtime.NODEJS_18_X,
      code: Code.fromBucket(this.sourceCodeBucket, `${this.sourceCodePrefix}/custom-resource.zip`),
      timeout: Duration.seconds(240),
      role: this.helperLambdaRole,
      environment: {
        SOLUTION_ID: props.solutionConfig.solutionId,
        SOLUTION_VERSION: props.solutionConfig.solutionVersion
      }
    });
    (this.helperLambda.node.defaultChild as CfnFunction).addDependency(props.cloudWatchLogsPolicy.node.defaultChild as CfnPolicy);

    const customIds = new CustomResource(this, 'UUID', {
      serviceToken: this.helperLambda.functionArn,
      properties: {
        Resource: 'CreateUUID',
        StackName: Aws.STACK_NAME
      }
    });
    this.uuid = customIds.getAtt('UUID').toString();
    this.uniqueSuffix = customIds.getAtt('UNIQUE_SUFFIX').toString();
    this.reducedStackName = customIds.getAtt('REDUCED_STACK_NAME').toString();


    const customIotEndpoint = new CustomResource(this, 'EndpointAddress', {
      serviceToken: this.helperLambda.functionArn,
      properties: {
        Resource: 'DescribeIoTEndpoint'
      }
    });

    this.iotEndpoint = customIotEndpoint.getAtt('IOT_ENDPOINT').toString();
  }

  /**
  * Sets up the UI assets and UI configuration.
  * @param props Custom resource setup UI props
  */
  public setupUi(props: CustomResourceSetupUiProps) {
    this.sourceCodeBucket.grantRead(this.helperLambda, `${this.sourceCodePrefix}/*`);
    props.consoleBucket.grantPut(this.helperLambda);
    props.routesBucket.grantPut(this.helperLambda);

    new CustomResource(this, 'CopyRouteFiles', {
      serviceToken: this.helperLambda.functionArn,
      resourceType: 'Custom::CopyRouteFiles',
      properties: {
        Resource: 'CopyS3Assets',
        SourceBucket: this.sourceCodeBucket.bucketName,
        SourcePrefix: this.sourceCodePrefix,
        ManifestFile: 'routes-manifest.json',
        DestinationBucket: props.routesBucket.bucketName
      }
    });

    new CustomResource(this, 'CopyConsoleFiles', {
      serviceToken: this.helperLambda.functionArn,
      resourceType: 'Custom::CopyConsoleFiles',
      properties: {
        Resource: 'CopyS3Assets',
        SourceBucket: this.sourceCodeBucket.bucketName,
        SourcePrefix: this.sourceCodePrefix,
        ManifestFile: 'site-manifest.json',
        DestinationBucket: props.consoleBucket.bucketName
      }
    });

    const config = {
      aws_iot_endpoint: this.iotEndpoint,
      API: {
        endpoints: [
          {
            name: 'ids',
            endpoint: props.apiEndpoint,
            region: Aws.REGION
          }
        ]
      },
      Auth: {
        identityPoolId: props.cognitoIdentityPool,
        region: Aws.REGION,
        userPoolId: props.cognitoUserPool,
        userPoolWebClientId: props.cognitoUserPoolClient
      },
      aws_iot_policy_name: props.iotPolicyName,
      aws_project_region: Aws.REGION,
      geo: {
        AmazonLocationService: {
          region: Aws.REGION,
          maps: {
            items: {
              [props.mapName]: {
                style: "VectorEsriNavigation",
              },
            },
            default: props.mapName,
          },
          search_indices: {
            items: [props.placeIndexName],
            default: props.placeIndexName,
          },
        },
      },
    };

    new CustomResource(this, 'ConsoleConfig', {
      serviceToken: this.helperLambda.functionArn,
      resourceType: 'Custom::CopyConfigFiles',
      properties: {
        Resource: 'CreateConfig',
        ConfigFileName: 'aws_config.js',
        DestinationBucket: props.consoleBucket.bucketName,
        configObj: JSON.stringify(config)
      }
    });
  }

  /**
  * Detaches the IoT policy from identity on stack deletion.
  * @param props CustomResourceDetachIotPolicyProps: Property with the IoT Policy Name
  */
  public setupDetachIotPolicyCustomResource(props: CustomResourceDetachIotPolicyProps) {
    this.helperLambda.addToRolePolicy(new PolicyStatement({
      actions: ['iot:ListTargetsForPolicy'],
      effect: Effect.ALLOW,
      resources: [Stack.of(this).formatArn({ service: 'iot', resource: 'policy', resourceName: '*', arnFormat: ArnFormat.SLASH_RESOURCE_NAME })]
    }));

    const iotPolicy = new Policy(this, 'CustomResourceLambdaIoTPolicy', {
      policyName: 'CustomResourceLambdaIoTPolicy',
      document: new PolicyDocument({
        statements: [
          new PolicyStatement({
            actions: ['iot:DetachPolicy'],
            effect: Effect.ALLOW,
            resources: ['*']
          })
        ]
      })
    });

    addCfnSuppressRules(iotPolicy, [{ id: 'W12', reason: 'To connect IoT and attach IoT policy to Cognito identity cannot speficy the specific resources.' }])

    this.helperLambda.role!.attachInlinePolicy(iotPolicy);

    new CustomResource(this, 'DetachIoTPolicy', { // NOSONAR: typescript:S1848
      serviceToken: this.helperLambda.functionArn,
      properties: {
        Resource: 'DetachIoTPolicy',
        IotPolicyName: props.iotPolicyName
      }
    });
  }
}
