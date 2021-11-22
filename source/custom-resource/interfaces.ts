// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * The namespace for the custom resource types
 * @namespace CustomResourceTypes
 */
export namespace CustomResourceTypes {
  /**
   * @enum The custom resource request types
   */
  export enum RequestTypes {
    CREATE = 'Create',
    DELETE = 'Delete',
    UPDATE = 'Update'
  }

  /**
   * @enum The custom resource resource properties resource types
   */
  export enum ResourceTypes {
    CREATE_UUID = 'CreateUUID',
    SEND_ANONYMOUS_METRICS = 'SendAnonymousMetrics',
    DESCRIBE_IOT_ENDPOINT = 'DescribeIoTEndpoint',
    COPY_S3_ASSETS = 'CopyS3Assets',
    CREATE_CONFIG = 'CreateConfig',
    DETACH_IOT_POLICY = 'DetachIoTPolicy'
  }

  /**
   * @enum The custom resource status types
   */
  export enum StatusTypes {
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED'
  }

  /**
   * The Lambda function context type
   * @interface LambdaContext
   */
  export interface LambdaContext {
    getRemainingTimeInMillis: () => number;
    functionName: string;
    functionVersion: string;
    invokedFunctionArn: string;
    memoryLimitInMB: number;
    awsRequestId: string;
    logGroupName: string;
    logStreamName: string;
    identity: any;
    clientContext: any;
    callbackWaitsForEmptyEventLoop: boolean;
  }

  /**
   * The custom resource event request type
   * @interface EventRequest
   */
  export interface EventRequest {
    RequestType: RequestTypes;
    PhysicalResourceId: string;
    StackId: string;
    ServiceToken: string;
    RequestId: string;
    LogicalResourceId: string;
    ResponseURL: string;
    ResourceType: string;
    ResourceProperties: ResourcePropertyTypes;
  }

  /**
   * @type The resource property types
   */
  type ResourcePropertyTypes = ResourceProperty | SendAnonymousMetricProperties | CopyFilesProperties |
    CreateConsoleConfigProperties | DetachIoTPolicyRequestProps

  /**
   * The custom resource resource type
   * @interface ResourceProperty
   */
  interface ResourceProperty {
    Resource: ResourceTypes;
    StackName?: string;
  }

  /**
   * Sending anonymous metric custom resource properties type
   * @interface SendAnonymousMetricProperties
   * @extends ResourceProperty
   */
  export interface SendAnonymousMetricProperties extends ResourceProperty {
    SolutionUUID: string;
  }

  /**
   * Copying UI assets custom resource properties type
   * @interface CopyFilesProperties
   * @extends ResourceProperty
   */
  export interface CopyFilesProperties extends ResourceProperty {
    DestinationBucket: string;
    ManifestFile: string;
    SourceBucket: string;
    SourcePrefix: string;
  }

  /**
   * Creating console config custom resource properties type
   * @interface CreateConsoleConfigProperties
   * @extends ResourceProperty
   */
  export interface CreateConsoleConfigProperties extends ResourceProperty {
    DestinationBucket: string;
    ConfigFileName: string;
    configObj: string;
  }

  /**
   * @interface DetachIoTPolicyRequestProps
   * @extends ResourceProperty
   */
  export interface DetachIoTPolicyRequestProps extends ResourceProperty {
    IotPolicyName: string
  }

  /**
   * The custom resource response type
   * @interface CustomResourceResponse
   */
  export interface CustomResourceResponse {
    Status: StatusTypes;
    Data: any;
  }

}
