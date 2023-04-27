// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ApiConstruct}  from "./api";
import { CommonResourcesConstruct } from "./common-resources";
import { CustomResourcesConstruct } from "./custom-resource";
import { StorageContruct } from "./storage";
import { SimulatorConstruct } from "./simulator";
import { ConsoleConstruct } from "./console";
import { CfnMap, CfnPlaceIndex } from 'aws-cdk-lib/aws-location';
import { Construct }  from "constructs";
import { Aws, CfnMapping, CfnOutput, CfnParameter, Fn, Stack, StackProps, Tags } from "aws-cdk-lib";
import {applyAppRegistry} from "./application-resource";

export class IDSStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    this.templateOptions.templateFormatVersion = '2010-09-09';

    // CFN Parameters
    // Admin E-mail parameter
    const adminEmail = new CfnParameter(this, 'UserEmail', {
      type: 'String',
      description: 'The user E-Mail to access the UI',
      allowedPattern: '^[_A-Za-z0-9-\\+]+(\\.[_A-Za-z0-9-]+)*@[A-Za-z0-9-]+(\\.[A-Za-z0-9]+)*(\\.[A-Za-z]{2,})$',
      constraintDescription: 'User E-Mail must be a valid E-Mail address.'
    });

    // CloudFormation metadata
    this.templateOptions.metadata = {
      'AWS::CloudFormation::Interface': {
        ParameterGroups: [
          {
            Label: { default: 'Console access' },
            Parameters: [adminEmail.logicalId]
          },
        ],
        ParameterLabels: {
          [adminEmail.logicalId]: { default: '* Console Administrator Email' },
        }
      }
    };

    // CFN Mappings
    const solutionMapping = new CfnMapping(this, 'Solution', {
      mapping: {
        Config: {
          SolutionId: 'SO0041',
          SolutionName: 'SOLUTION_NAME_PLACEHOLDER',
          Version: 'VERSION_PLACEHOLDER',
          SendAnonymousUsage: 'Yes',
          S3Bucket: 'BUCKET_NAME_PLACEHOLDER',
          KeyPrefix: 'SOLUTION_NAME_PLACEHOLDER/VERSION_PLACEHOLDER'
        }
      }
    });
    const sendAnonymousUsage = solutionMapping.findInMap('Config', 'SendAnonymousUsage');
    const solutionId = solutionMapping.findInMap('Config', 'SolutionId');
    const solutionName = solutionMapping.findInMap('Config', 'SolutionName');
    const solutionVersion = solutionMapping.findInMap('Config', 'Version');
    const solutionDescription = `(${solutionId}) - ${solutionName} Version ${solutionVersion}`;
    const sourceCodeBucket = Fn.join('-', [solutionMapping.findInMap('Config', 'S3Bucket'), Aws.REGION]);
    const sourceCodePrefix = solutionMapping.findInMap('Config', 'KeyPrefix');

    // Common Resources
    const commonResources = new CommonResourcesConstruct(this, 'CommonResources', {
      sourceCodeBucket
    });

    //Databases
    const storage = new StorageContruct(this, 'storage', {
      solutionId: solutionId,
      s3LogsBucket: commonResources.s3LoggingBucket
    });

    // Custom Resources
    const customResources = new CustomResourcesConstruct(this, 'CustomResources', {
      cloudWatchLogsPolicy: commonResources.cloudWatchLogsPolicy,
      solutionConfig: {
        solutionId,
        solutionVersion,
        sourceCodeBucket: commonResources.sourceCodeBucket,
        sourceCodePrefix
      }
    });

    //Simulator
    const simulator = new SimulatorConstruct(this, 'simulator', {
      cloudWatchLogsPolicy: commonResources.cloudWatchLogsPolicy,
      iotEndpointAddress: customResources.iotEndpoint,
      simulationTable: storage.simulationsTable,
      deviceTypeTable: storage.deviceTypesTable,
      routesBucket: storage.routesBucket,
      uniqueSuffix: customResources.uniqueSuffix,
      solutionConfig: {
        sendAnonymousUsage: sendAnonymousUsage,
        solutionId: solutionId,
        solutionVersion: solutionVersion,
        sourceCodeBucket: commonResources.sourceCodeBucket,
        sourceCodePrefix: sourceCodePrefix
      },
      // Solution UUID
      uuid: customResources.uuid
    });

    const api = new ApiConstruct(this, 'API', {
      microservicesLambda: simulator.microservicesLambdaFunction,
      cloudWatchLogsPolicy: commonResources.cloudWatchLogsPolicy,
      stepFunctionsARN: simulator.simulatorStepFunctions.stateMachineArn,
      simulationTable: storage.simulationsTable,
      deviceTypeTable: storage.deviceTypesTable,
      routesBucketArn: storage.routesBucket.bucketArn,
      solutionConfig: {
        sendAnonymousUsage: sendAnonymousUsage,
        solutionId: solutionId,
        solutionVersion: solutionVersion,
        sourceCodeBucket: commonResources.sourceCodeBucket,
        sourceCodePrefix: sourceCodePrefix
      },
      uuid: customResources.uuid
    });

    const idsMap = new CfnMap(this, "IotDeviceSimulatorMap", {
      configuration: {
        style: 'VectorEsriNavigation'
      },
      mapName: `${customResources.reducedStackName}-IotDeviceSimulatorMap-${customResources.uniqueSuffix}`,
      pricingPlan: 'RequestBasedUsage'
    });

    const idsPlaceIndex = new CfnPlaceIndex(this, "IotDeviceSimulatorPlaceIndex", {
      dataSource: "Esri",
      indexName: `${customResources.reducedStackName}-IoTDeviceSimulatorPlaceIndex-${customResources.uniqueSuffix}`,
      pricingPlan: "RequestBasedUsage"
    });

    const console = new ConsoleConstruct(this, 'Console', {
      mapArn: idsMap.attrMapArn,
      placeIndexArn: idsPlaceIndex.attrIndexArn,
      apiId: api.apiId,
      s3LogsBucket: commonResources.s3LoggingBucket,
      adminEmail: adminEmail.valueAsString
    });

    customResources.setupUi({
      mapName: idsMap.mapName,
      placeIndexName: idsPlaceIndex.indexName,
      apiEndpoint: api.apiEndpoint,
      iotPolicyName: console.iotPolicy.ref,
      cognitoIdentityPool: console.identityPoolId,
      cognitoUserPool: console.userPoolId,
      cognitoUserPoolClient: console.webClientId,
      routesBucket: storage.routesBucket,
      consoleBucket: console.consoleBucket,
    });

    customResources.setupDetachIotPolicyCustomResource({
      iotPolicyName: console.iotPolicy.ref
    });

    // Register this application in App Registry
    applyAppRegistry(this, {
      solutionId: solutionId,
      solutionName: solutionName,
      solutionVersion: solutionVersion,
      solutionDescription: solutionDescription,
    });

    //Outputs
    new CfnOutput(this, 'DeviceTypesTable', { // NOSONAR: typescript:S1848
      description: 'The device types table name.',
      value: storage.deviceTypesTable.tableName
    });
    new CfnOutput(this, 'SimulationsTable', { // NOSONAR: typescript:S1848
      description: 'The simulations table name',
      value: storage.simulationsTable.tableName
    });
    new CfnOutput(this, 'API-Endpoint', { // NOSONAR: typescript:S1848
      description: 'The API endpoint',
      value: api.apiEndpoint
    });
    new CfnOutput(this, 'ConsoleClientId', { // NOSONAR: typescript:S1848
      description: 'The console client ID',
      value: console.webClientId
    });
    new CfnOutput(this, 'IdentityPoolId', { // NOSONAR: typescript:S1848
      description: 'The ID for the Cognitio Identity Pool',
      value: console.identityPoolId
    });
    new CfnOutput(this, 'UserPoolId', { // NOSONAR: typescript:S1848
      description: 'The Cognito User Pool ID',
      value: console.userPoolId
    });
    new CfnOutput(this, 'Console URL', { // NOSONAR: typescript:S1848
      description: 'The URL to access the console',
      value: `https://${console.cloudFrontDomainName}`
    });
    new CfnOutput(this, 'UUID', { // NOSONAR: typescript:S1848
      description: 'The solution UUID',
      value: customResources.uuid
    });

    //tag resources
    Tags.of(this).add('SolutionId', solutionId);
  }
}
