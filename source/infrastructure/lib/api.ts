
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { addCfnSuppressRules } from "@aws-solutions-constructs/core";
import { Policy, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Function as LambdaFunction } from "aws-cdk-lib/aws-lambda";
import { IBucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Aws, RemovalPolicy } from "aws-cdk-lib";
import {
  AccessLogFormat,
  AuthorizationType,
  ContentHandling,
  Deployment,
  EndpointType,
  Integration,
  IntegrationType,
  LogGroupLogDestination,
  MethodLoggingLevel,
  MethodOptions,
  PassthroughBehavior,
  RequestValidator,
  RestApi,
  Stage
} from "aws-cdk-lib/aws-apigateway";

/**
 * ApiConstructProps props
 * @interface ApiConstructProps
 */
export interface ApiConstructProps {
  // Policy for CloudWatch Logs
  readonly cloudWatchLogsPolicy: Policy;
  // IoT endpoint address
  readonly stepFunctionsARN: string;
  // Simulation data DynamoDB table name
  readonly simulationTable: Table;
  // Device Type data DynamoDB table name
  readonly deviceTypeTable: Table;
  //Routes S3 bucket
  readonly routesBucketArn: string;
  //microservices lambda
  readonly microservicesLambda: LambdaFunction;
  /**
   * Solution config properties.
   * Logging level, solution ID, version, source code bucket, and source code prefix
   */
  readonly solutionConfig: {
    sendAnonymousUsage: string;
    solutionId: string;
    solutionVersion: string;
    sourceCodeBucket: IBucket;
    sourceCodePrefix: string;
  };
  // Solution UUID
  readonly uuid: string;
}

/**
 * @class
 * IoT Device Simulator Framework API Construct.
 * It creates an API Gateway REST API and other resources.
 */
export class ApiConstruct extends Construct {
  // API endpoint
  public apiEndpoint: string;
  // API ID
  public apiId: string;
  //microservices lambda
  public microservicesLambdaFunction: LambdaFunction;

  constructor(scope: Construct, id: string, props: ApiConstructProps) {
    super(scope, id);

    const apiLogGroup = new LogGroup(this, 'Logs', {
      removalPolicy: RemovalPolicy.DESTROY,
      retention: RetentionDays.THREE_MONTHS
    });
    addCfnSuppressRules(apiLogGroup, [{
      id: 'W84', reason: 'CloudWatch Logs are already encrypted by default.'
    }]);

    const api = new RestApi(this, 'IoTDeviceSimulatorApi', {
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'],
        allowHeaders: [
          'Authorization',
          'Content-Type',
          'X-Amz-Date',
          'X-Amz-Security-Token',
          'X-Api-Key'
        ],
        allowMethods: [
          'GET',
          'POST',
          'PUT',
          'DELETE',
          'OPTIONS'
        ],
        statusCode: 200
      },
      deploy: true,
      deployOptions: {
        accessLogDestination: new LogGroupLogDestination(apiLogGroup),
        accessLogFormat: AccessLogFormat.jsonWithStandardFields(),
        loggingLevel: MethodLoggingLevel.INFO,
        stageName: 'prod',
        tracingEnabled: true
      },
      description: 'IoT Device Simulator Rest API',
      endpointTypes: [EndpointType.REGIONAL]
    });
    this.apiEndpoint = `https://${api.restApiId}.execute-api.${Aws.REGION}.amazonaws.com/prod`;
    this.apiId = api.restApiId;

    const requestValidator = new RequestValidator(this, 'ApiRequestValidator', {
      restApi: api,
      validateRequestParameters: true,
      validateRequestBody: true
    });

    addCfnSuppressRules(api.node.findChild('Deployment') as Deployment, [{
      id: 'W68', reason: 'The solution does not require the usage plan.'
    }]);
    addCfnSuppressRules(api.node.findChild('DeploymentStage.prod') as Stage, [{
      id: 'W64', reason: 'The solution does not require the usage plan.'
    }]);

    /**
     * method options for all methods
     */
    const universalMethodOptions: MethodOptions = {
      authorizationType: AuthorizationType.IAM,
      methodResponses: [{
        statusCode: '200',
        responseModels: {
          'application/json': { modelId: 'Empty' }
        }
      }],
      requestParameters: { 'method.request.querystring.nextToken': false },
      requestValidator: requestValidator
    };

    /**
     * Integration for all resources
     */
    const universalIntegration = new Integration({
      type: IntegrationType.AWS_PROXY,
      integrationHttpMethod: 'POST',
      options: {
        contentHandling: ContentHandling.CONVERT_TO_TEXT,
        integrationResponses: [{ statusCode: '200' }],
        passthroughBehavior: PassthroughBehavior.WHEN_NO_MATCH
      },
      uri: `arn:${Aws.PARTITION}:apigateway:${Aws.REGION}:lambda:path/2015-03-31/functions/${props.microservicesLambda.functionArn}/invocations`
    });

    /**
     * simulation API
     * ANY /simulation
     * ANY /simulation/{simid}
     */
    const simulationResource = api.root.addResource('simulation');
    simulationResource.addMethod(
      'ANY',
      universalIntegration,
      universalMethodOptions
    );
    const simulationSimIdResource = simulationResource.addResource('{simid}');
    simulationSimIdResource.addMethod('ANY', universalIntegration, universalMethodOptions);

    /**
     * Devive Types API
     * ANY /devicetypes
     * ANY /devicetypes/{typeid}
     */
    const deviceTypesResource = api.root.addResource('devicetypes');
    deviceTypesResource.addMethod('ANY', universalIntegration, universalMethodOptions);
    const typeIdResource = deviceTypesResource.addResource('{typeid}');
    typeIdResource.addMethod('ANY', universalIntegration, universalMethodOptions);

    props.microservicesLambda.addPermission('ApiLambdaInvokePermission', {
      action: 'lambda:InvokeFunction',
      principal: new ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: api.arnForExecuteApi()
    });
  }
}
