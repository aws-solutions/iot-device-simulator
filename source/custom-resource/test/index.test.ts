// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  DescribeEndpointCommand, DetachPolicyCommand,
  IoTClient, ListTargetsForPolicyCommand
} from "@aws-sdk/client-iot";
import {
  CopyObjectCommand, GetObjectCommand, PutObjectCommand, S3Client
} from "@aws-sdk/client-s3";
import { sdkStreamMixin } from '@smithy/util-stream';
import { mockClient } from "aws-sdk-client-mock";
import 'aws-sdk-client-mock-jest';
import { Readable } from "stream";
import { CustomResourceTypes } from '../interfaces';

// Mock AWS
const s3Mock = mockClient(S3Client);
const iotMock = mockClient(IoTClient);

// Mock axios
const mockAxios = {
  get: jest.fn(),
  put: jest.fn()
};

jest.mock('axios', () => {
  return {
    get: mockAxios.get,
    put: mockAxios.put
  };
});

// Mock uuid
jest.mock('uuid', () => { return { v4: jest.fn(() => 'mock-uuid') }; });

// PREPARE
const context: CustomResourceTypes.LambdaContext = {
  getRemainingTimeInMillis: () => 300000,
  functionName: 'custom-resource',
  functionVersion: 'latest',
  invokedFunctionArn: 'arn:of:custom-resource',
  memoryLimitInMB: 128,
  awsRequestId: 'mock-request-id',
  logGroupName: 'mock-log-group',
  logStreamName: 'mock-stream',
  identity: undefined,
  clientContext: undefined,
  callbackWaitsForEmptyEventLoop: false
};

const axiosConfig = {
  headers: {
    'Content-Length': 0,
    'Content-Type': ''
  }
};

process.env = {
  AWS_REGION: 'mock-region',
  SOLUTION_ID: 'mock-solution-id',
  SOLUTION_VERSION: 'mock-version',
  STACK_NAME: 'mock-stack'
};

/**
 * Builds a CloudFormation response body.
 * @param event the custom resource event request
 * @param response The custom resource response
 * @param reason The reason for failure
 * @returns The CloudFormation response body
 */
const buildResponseBody = (event: CustomResourceTypes.EventRequest, response: CustomResourceTypes.CustomResourceResponse, reason?: string) => {
  return JSON.stringify({
    Status: response.Status,
    Reason: reason ? reason : `See the details in CloudWatch Log Stream: ${context.logStreamName}`,
    PhysicalResourceId: event.LogicalResourceId,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: response.Data
  });
};

describe('Unit tests of CREATE_UUID', () => {
  const event: CustomResourceTypes.EventRequest = {
    RequestType: CustomResourceTypes.RequestTypes.CREATE,
    PhysicalResourceId: 'mock-physical-id',
    StackId: 'mock-stack-id',
    ServiceToken: 'mock-service-token',
    RequestId: 'mock-request-id',
    LogicalResourceId: 'mock-logical-resource-id',
    ResponseURL: 'https://response-url.com',
    ResourceType: 'mock-resource-type',
    ResourceProperties: {
      Resource: CustomResourceTypes.ResourceTypes.CREATE_UUID,
      StackName: "test-stack"
    }
  };

  beforeEach(() => mockAxios.put.mockReset());

  test('Success to create an UUID', async () => {
    mockAxios.put.mockResolvedValue({ status: 200 });

    const index = require('../index');
    const response = await index.handler(event, context);
    const responseBody = buildResponseBody(event, response);
    axiosConfig.headers['Content-Length'] = responseBody.length;

    expect(mockAxios.put).toHaveBeenCalledTimes(1);
    expect(mockAxios.put).toHaveBeenCalledWith(event.ResponseURL, responseBody, axiosConfig);
    expect(response).toEqual({
      Status: CustomResourceTypes.StatusTypes.SUCCESS,
      Data: { UUID: 'mock-uuid', REDUCED_STACK_NAME: 'test-stac', UNIQUE_SUFFIX: 'uuid'}
    });
  });

  test('Nothing happens when the request type is not "Create"', async () => {
    event.RequestType = CustomResourceTypes.RequestTypes.UPDATE;
    mockAxios.put.mockResolvedValue({ status: 200 });

    const index = require('../index');
    const response = await index.handler(event, context);
    const responseBody = buildResponseBody(event, response);
    axiosConfig.headers['Content-Length'] = responseBody.length;

    expect(mockAxios.put).toHaveBeenCalledTimes(1);
    expect(mockAxios.put).toHaveBeenCalledWith(event.ResponseURL, responseBody, axiosConfig);
    expect(response).toEqual({
      Status: CustomResourceTypes.StatusTypes.SUCCESS,
      Data: {}
    })
  });
});

describe('Unit tests of COPY_S3_ASSETS', () => {
  const event: CustomResourceTypes.EventRequest = {
    RequestType: CustomResourceTypes.RequestTypes.CREATE,
    PhysicalResourceId: 'mock-physical-id',
    StackId: 'mock-stack-id',
    ServiceToken: 'mock-service-token',
    RequestId: 'mock-request-id',
    LogicalResourceId: 'mock-logical-resource-id',
    ResponseURL: 'https://response-url.com',
    ResourceType: 'mock-resource-type',
    ResourceProperties: {
      Resource: CustomResourceTypes.ResourceTypes.COPY_S3_ASSETS,
      DestinationBucket: 'mock-destination-bucket',
      ManifestFile: 'mainfest.json',
      SourceBucket: 'mock-source-bucket',
      SourcePrefix: 'iot-device-simulator/v0.0.1-test'
    }
  };
  const resourceProperties = event.ResourceProperties as CustomResourceTypes.CopyFilesProperties;
  const manifest = ['console/index.html', 'console/script.js', 'console/static/style.css', 'console/static/script/script/js'];

  beforeEach(() => {
    s3Mock.reset();
    iotMock.reset();
    mockAxios.put.mockReset();
  });

  test('Success to copy console assets when creating a solution', async () => {
    const body = sdkStreamMixin(Readable.from(JSON.stringify(manifest)));
    s3Mock.on(GetObjectCommand).resolves({ Body: body });
    s3Mock.on(CopyObjectCommand).resolves({});
    mockAxios.put.mockResolvedValue({ status: 200 });

    const index = require('../index');
    const response = await index.handler(event, context);
    const responseBody = buildResponseBody(event, response);
    axiosConfig.headers['Content-Length'] = responseBody.length;

    expect(s3Mock).toHaveReceivedCommandTimes(GetObjectCommand, 1);
    const getObjectCall = s3Mock.commandCalls(GetObjectCommand)[0].firstArg as GetObjectCommand;
    expect(getObjectCall.input.Bucket).toBe(resourceProperties.SourceBucket);
    expect(getObjectCall.input.Key).toBe(`${resourceProperties.SourcePrefix}/${resourceProperties.ManifestFile}`);

    let n = 2;
    expect(s3Mock).toHaveReceivedCommandTimes(CopyObjectCommand, manifest.length);
    for (let fileName of manifest) {
      expect(s3Mock).toHaveReceivedNthCommandWith(n++,
        CopyObjectCommand,
        {
          Bucket: resourceProperties.DestinationBucket,
          CopySource: `${resourceProperties.SourceBucket}/${resourceProperties.SourcePrefix}/${fileName}`,
          Key: fileName.split('/').slice(1).join('/')
      });
    }

    expect(mockAxios.put).toHaveBeenCalledTimes(1);
    expect(mockAxios.put).toHaveBeenCalledWith(event.ResponseURL, responseBody, axiosConfig);
    expect(response).toEqual({
      Status: CustomResourceTypes.StatusTypes.SUCCESS,
      Data: {}
    });
  });

  test('Failed to get the manifest file when creating a solution', async () => {
    event.RequestType = CustomResourceTypes.RequestTypes.UPDATE;
    s3Mock.on(GetObjectCommand).rejects({ message: 'Failure' });
    mockAxios.put.mockResolvedValue({ status: 200 });

    const index = require('../index');
    const response = await index.handler(event, context);
    const responseBody = buildResponseBody(event, response, 'Failure');
    axiosConfig.headers['Content-Length'] = responseBody.length;

    expect(s3Mock).toHaveReceivedCommandTimes(GetObjectCommand, 1);
    const getObjectCall = s3Mock.commandCalls(GetObjectCommand)[0].firstArg as GetObjectCommand;
    expect(getObjectCall.input.Bucket).toBe(resourceProperties.SourceBucket);
    expect(getObjectCall.input.Key).toBe(`${resourceProperties.SourcePrefix}/${resourceProperties.ManifestFile}`);

    expect(s3Mock).toHaveReceivedCommandTimes(CopyObjectCommand, 0);
    expect(mockAxios.put).toHaveBeenCalledTimes(1);
    expect(mockAxios.put).toHaveBeenCalledWith(event.ResponseURL, responseBody, axiosConfig);
    expect(response).toEqual({
      Status: CustomResourceTypes.StatusTypes.FAILED,
      Data: { Error: 'Failure' }
    });
  });

  test('Failed to copy the console assets when updating a solution', async () => {
    const body = sdkStreamMixin(Readable.from(JSON.stringify(manifest)));
    s3Mock.on(GetObjectCommand).resolves({ Body: body });
    s3Mock.on(CopyObjectCommand).rejects({ message: 'Failure' });
    mockAxios.put.mockResolvedValue({ status: 200 });

    const index = require('../index');
    const response = await index.handler(event, context);
    const responseBody = buildResponseBody(event, response, 'Failure');
    axiosConfig.headers['Content-Length'] = responseBody.length;

    expect(s3Mock).toHaveReceivedCommandTimes(GetObjectCommand, 1);
    const getObjectCall = s3Mock.commandCalls(GetObjectCommand)[0].firstArg as GetObjectCommand;
    expect(getObjectCall.input.Bucket).toBe(resourceProperties.SourceBucket);
    expect(getObjectCall.input.Key).toBe(`${resourceProperties.SourcePrefix}/${resourceProperties.ManifestFile}`);

    let n = 2;
    expect(s3Mock).toHaveReceivedCommandTimes(CopyObjectCommand, manifest.length);
    for (let fileName of manifest) {
      expect(s3Mock).toHaveReceivedNthCommandWith(n++,
        CopyObjectCommand,
        {
          Bucket: resourceProperties.DestinationBucket,
          CopySource: `${resourceProperties.SourceBucket}/${resourceProperties.SourcePrefix}/${fileName}`,
          Key: fileName.split('/').slice(1).join('/')
        });
    }

    expect(mockAxios.put).toHaveBeenCalledTimes(1);
    expect(mockAxios.put).toHaveBeenCalledWith(event.ResponseURL, responseBody, axiosConfig);
    expect(response).toEqual({
      Status: CustomResourceTypes.StatusTypes.FAILED,
      Data: { Error: 'Failure' }
    });
  });

  test('Nothing happens when deleting the solution', async () => {
    event.RequestType = CustomResourceTypes.RequestTypes.DELETE;
    s3Mock.on(GetObjectCommand).resolves({});
    s3Mock.on(CopyObjectCommand).resolves({});
    mockAxios.put.mockResolvedValue({ status: 200 });

    const index = require('../index');
    const response = await index.handler(event, context);
    const responseBody = buildResponseBody(event, response);
    axiosConfig.headers['Content-Length'] = responseBody.length;

    expect(s3Mock).toHaveReceivedCommandTimes(GetObjectCommand, 0);
    expect(s3Mock).toHaveReceivedCommandTimes(CopyObjectCommand, 0);
    expect(mockAxios.put).toHaveBeenCalledTimes(1);
    expect(mockAxios.put).toHaveBeenCalledWith(event.ResponseURL, responseBody, axiosConfig);
    expect(response).toEqual({
      Status: CustomResourceTypes.StatusTypes.SUCCESS,
      Data: {}
    });
  });
});

describe('Unit tests of CREATE_CONFIG', () => {
  const event: CustomResourceTypes.EventRequest = {
    RequestType: CustomResourceTypes.RequestTypes.CREATE,
    PhysicalResourceId: 'mock-physical-id',
    StackId: 'mock-stack-id',
    ServiceToken: 'mock-service-token',
    RequestId: 'mock-request-id',
    LogicalResourceId: 'mock-logical-resource-id',
    ResponseURL: 'https://response-url.com',
    ResourceType: 'mock-resource-type',
    ResourceProperties: {
      Resource: CustomResourceTypes.ResourceTypes.CREATE_CONFIG,
      DestinationBucket: 'mock-destination-bucket',
      ConfigFileName: 'aws-exports.js',
      configObj: JSON.stringify({ key: "value" })
    }
  };
  const resourceProperties = event.ResourceProperties as CustomResourceTypes.CreateConsoleConfigProperties;
  const consoleConfig = { key: "value" };

  beforeEach(() => {
    s3Mock.reset();
    iotMock.reset();
    mockAxios.put.mockReset();
  });

  test('Success to put the console config when creating a solution', async () => {
    s3Mock.on(PutObjectCommand).resolves({});
    mockAxios.put.mockResolvedValue({ status: 200 });

    const index = require('../index');
    const response = await index.handler(event, context);
    const responseBody = buildResponseBody(event, response);
    axiosConfig.headers['Content-Length'] = responseBody.length;

    expect(s3Mock).toHaveReceivedCommandTimes(PutObjectCommand, 1);
    const putObjectCall = s3Mock.commandCalls(PutObjectCommand)[0].firstArg as PutObjectCommand;
    expect(putObjectCall.input.Body).toBe(`const config = ${JSON.stringify(consoleConfig, null, 2)};`);
    expect(putObjectCall.input.Bucket).toBe(resourceProperties.DestinationBucket);
    expect(putObjectCall.input.Key).toBe(resourceProperties.ConfigFileName);
    expect(putObjectCall.input.ContentType).toBe('application/javascript');
    expect(mockAxios.put).toHaveBeenCalledTimes(1);
    expect(mockAxios.put).toHaveBeenCalledWith(event.ResponseURL, responseBody, axiosConfig);
    expect(response).toEqual({
      Status: CustomResourceTypes.StatusTypes.SUCCESS,
      Data: {}
    });
  });

  test('Failed to put the console config when updating a solution', async () => {
    event.RequestType = CustomResourceTypes.RequestTypes.UPDATE;
    s3Mock.on(PutObjectCommand).rejects({ message: 'Failure' });
    mockAxios.put.mockResolvedValue({ status: 200 });

    const index = require('../index');
    const response = await index.handler(event, context);
    const responseBody = buildResponseBody(event, response, 'Failure');
    axiosConfig.headers['Content-Length'] = responseBody.length;

    expect(s3Mock).toHaveReceivedCommandTimes(PutObjectCommand, 1);
    const putObjectCall = s3Mock.commandCalls(PutObjectCommand)[0].firstArg as PutObjectCommand;
    expect(putObjectCall.input.Body).toBe(`const config = ${JSON.stringify(consoleConfig, null, 2)};`);
    expect(putObjectCall.input.Bucket).toBe(resourceProperties.DestinationBucket);
    expect(putObjectCall.input.Key).toBe(resourceProperties.ConfigFileName);
    expect(putObjectCall.input.ContentType).toBe('application/javascript');

    expect(mockAxios.put).toHaveBeenCalledTimes(1);
    expect(mockAxios.put).toHaveBeenCalledWith(event.ResponseURL, responseBody, axiosConfig);
    expect(response).toEqual({
      Status: CustomResourceTypes.StatusTypes.FAILED,
      Data: { Error: 'Failure' }
    });
  });

  test('Nothing happens when deleting the solution', async () => {
    event.RequestType = CustomResourceTypes.RequestTypes.DELETE;
    mockAxios.put.mockResolvedValue({ status: 200 });

    const index = require('../index');
    const response = await index.handler(event, context);
    const responseBody = buildResponseBody(event, response);
    axiosConfig.headers['Content-Length'] = responseBody.length;

    expect(s3Mock).toHaveReceivedCommandTimes(PutObjectCommand, 0);
    expect(mockAxios.put).toHaveBeenCalledTimes(1);
    expect(mockAxios.put).toHaveBeenCalledWith(event.ResponseURL, responseBody, axiosConfig);
    expect(response).toEqual({
      Status: CustomResourceTypes.StatusTypes.SUCCESS,
      Data: {}
    });
  });
});

describe('Unit tests of DescribeIoTEndpoint', () => {
  const event: CustomResourceTypes.EventRequest = {
    RequestType: CustomResourceTypes.RequestTypes.CREATE,
    PhysicalResourceId: 'mock-physical-id',
    StackId: 'mock-stack-id',
    ServiceToken: 'mock-service-token',
    RequestId: 'mock-request-id',
    LogicalResourceId: 'mock-logical-resource-id',
    ResponseURL: 'https://response-url.com',
    ResourceType: 'mock-resource-type',
    ResourceProperties: {
      Resource: CustomResourceTypes.ResourceTypes.DESCRIBE_IOT_ENDPOINT
    }
  };

  beforeEach(() => {
    s3Mock.reset();
    iotMock.reset();
    mockAxios.put.mockReset();
  });

  test('Success to get IoT endpoint', async () => {
    iotMock.on(DescribeEndpointCommand).resolves({ endpointAddress: 'endpoint.fake' });
    mockAxios.put.mockResolvedValue({ status: 200 });

    const index = require('../index');
    const response = await index.handler(event, context);
    const responseBody = buildResponseBody(event, response);
    axiosConfig.headers['Content-Length'] = responseBody.length;

    expect(iotMock).toHaveReceivedCommandTimes(DescribeEndpointCommand, 1);
    expect(iotMock).toHaveReceivedCommandWith(DescribeEndpointCommand, {
      endpointType: 'iot:Data-ATS'
    });
    expect(mockAxios.put).toHaveBeenCalledTimes(1);
    expect(mockAxios.put).toHaveBeenCalledWith(event.ResponseURL, responseBody, axiosConfig);
    expect(response).toEqual({
      Status: CustomResourceTypes.StatusTypes.SUCCESS,
      Data: { IOT_ENDPOINT: 'endpoint.fake' }
    });
  });

  test('Nothing happens when updating the solution', async () => {
    event.RequestType = CustomResourceTypes.RequestTypes.UPDATE;
    iotMock.on(DescribeEndpointCommand).resolves({});
    mockAxios.put.mockResolvedValue({ status: 200 });

    const index = require('../index');
    const response = await index.handler(event, context);
    const responseBody = buildResponseBody(event, response);
    axiosConfig.headers['Content-Length'] = responseBody.length;

    expect(iotMock).toHaveReceivedCommandTimes(DescribeEndpointCommand, 0);
    expect(mockAxios.put).toHaveBeenCalledTimes(1);
    expect(mockAxios.put).toHaveBeenCalledWith(event.ResponseURL, responseBody, axiosConfig);
    expect(response).toEqual({
      Status: CustomResourceTypes.StatusTypes.SUCCESS,
      Data: {}
    });
  });

  test('Nothing happens when deleting the solution', async () => {
    event.RequestType = CustomResourceTypes.RequestTypes.DELETE;
    iotMock.on(DescribeEndpointCommand).resolves({});
    mockAxios.put.mockResolvedValue({ status: 200 });

    const index = require('../index');
    const response = await index.handler(event, context);
    const responseBody = buildResponseBody(event, response);
    axiosConfig.headers['Content-Length'] = responseBody.length;

    expect(iotMock).toHaveReceivedCommandTimes(DescribeEndpointCommand, 0);
    expect(mockAxios.put).toHaveBeenCalledTimes(1);
    expect(mockAxios.put).toHaveBeenCalledWith(event.ResponseURL, responseBody, axiosConfig);
    expect(response).toEqual({
      Status: CustomResourceTypes.StatusTypes.SUCCESS,
      Data: {}
    });
  });
});

describe('Unit tests of DetachIoTPolicy', () => {
  const event: CustomResourceTypes.EventRequest = {
    RequestType: CustomResourceTypes.RequestTypes.DELETE,
    PhysicalResourceId: 'mock-physical-id',
    StackId: 'mock-stack-id',
    ServiceToken: 'mock-service-token',
    RequestId: 'mock-request-id',
    LogicalResourceId: 'mock-logical-resource-id',
    ResponseURL: 'https://response-url.com',
    ResourceType: 'mock-resource-type',
    ResourceProperties: {
      Resource: CustomResourceTypes.ResourceTypes.DETACH_IOT_POLICY,
      IotPolicyName: 'IotPolicy'
    }
  };

  beforeEach(() => {
    s3Mock.reset();
    iotMock.reset();
    mockAxios.put.mockReset();
  });

  test('Success to get detach IoT policy when request is DELETE', async () => {
    iotMock.on(ListTargetsForPolicyCommand).resolves({ targets: ["target1"] });
    iotMock.on(DetachPolicyCommand).resolves({});

    mockAxios.put.mockResolvedValue({ status: 200 });

    const index = require('../index');
    const response = await index.handler(event, context);
    const responseBody = buildResponseBody(event, response);
    axiosConfig.headers['Content-Length'] = responseBody.length;

    expect(iotMock).toHaveReceivedCommandTimes(ListTargetsForPolicyCommand, 1);
    expect(iotMock).toHaveReceivedCommandWith(ListTargetsForPolicyCommand, {
      policyName: 'IotPolicy'
    });

    expect(iotMock).toHaveReceivedCommandTimes(DetachPolicyCommand, 1);
    expect(iotMock).toHaveReceivedCommandWith(DetachPolicyCommand, {
      policyName: 'IotPolicy',
      target: 'target1'
    });
    expect(mockAxios.put).toHaveBeenCalledTimes(1);
    expect(mockAxios.put).toHaveBeenCalledWith(event.ResponseURL, responseBody, axiosConfig);
    expect(response).toEqual({
      Status: CustomResourceTypes.StatusTypes.SUCCESS,
      Data: {}
    });
  });

  test('Nothing happens when updating the solution', async () => {
    event.RequestType = CustomResourceTypes.RequestTypes.UPDATE;
    iotMock.on(ListTargetsForPolicyCommand).resolves({});
    iotMock.on(DetachPolicyCommand).resolves({});
    mockAxios.put.mockResolvedValue({ status: 200 });

    const index = require('../index');
    const response = await index.handler(event, context);
    const responseBody = buildResponseBody(event, response);
    axiosConfig.headers['Content-Length'] = responseBody.length;

    expect(iotMock).toHaveReceivedCommandTimes(ListTargetsForPolicyCommand, 0);
    expect(iotMock).toHaveReceivedCommandTimes(DetachPolicyCommand, 0);
    expect(mockAxios.put).toHaveBeenCalledTimes(1);
    expect(mockAxios.put).toHaveBeenCalledWith(event.ResponseURL, responseBody, axiosConfig);
    expect(response).toEqual({
      Status: CustomResourceTypes.StatusTypes.SUCCESS,
      Data: {}
    });
  });

  test('Nothing happens when creating the solution', async () => {
    event.RequestType = CustomResourceTypes.RequestTypes.CREATE;
    iotMock.on(ListTargetsForPolicyCommand).resolves({});
    iotMock.on(DetachPolicyCommand).resolves({});
    mockAxios.put.mockResolvedValue({ status: 200 });

    const index = require('../index');
    const response = await index.handler(event, context);
    const responseBody = buildResponseBody(event, response);
    axiosConfig.headers['Content-Length'] = responseBody.length;

    expect(iotMock).toHaveReceivedCommandTimes(ListTargetsForPolicyCommand, 0);
    expect(iotMock).toHaveReceivedCommandTimes(DetachPolicyCommand, 0);
    expect(mockAxios.put).toHaveBeenCalledTimes(1);
    expect(mockAxios.put).toHaveBeenCalledWith(event.ResponseURL, responseBody, axiosConfig);
    expect(response).toEqual({
      Status: CustomResourceTypes.StatusTypes.SUCCESS,
      Data: {}
    });
  });

  test('Fail to get detach IoT policy when listTargetsForPolicy fails', async () => {
    iotMock.on(ListTargetsForPolicyCommand).rejects({ message: 'Failure' });

    mockAxios.put.mockResolvedValue({ status: 200 });
    event.RequestType = CustomResourceTypes.RequestTypes.DELETE;
    const index = require('../index');
    const response = await index.handler(event, context);
    const responseBody = buildResponseBody(event, response, 'Failure');
    axiosConfig.headers['Content-Length'] = responseBody.length;

    expect(iotMock).toHaveReceivedCommandTimes(ListTargetsForPolicyCommand, 1);
    expect(iotMock).toHaveReceivedCommandWith(ListTargetsForPolicyCommand, {
      policyName: 'IotPolicy'
    });
    expect(mockAxios.put).toHaveBeenCalledTimes(1);
    expect(mockAxios.put).toHaveBeenCalledWith(event.ResponseURL, responseBody, axiosConfig);
    expect(response).toEqual({
      Status: CustomResourceTypes.StatusTypes.FAILED,
      Data: { Error: 'Failure' }
    });
  });

  test('Fail to get detach IoT policy when detachPrincipalPolicy fails', async () => {
    iotMock.on(ListTargetsForPolicyCommand).resolves({ targets: ["target1"] });
    iotMock.on(DetachPolicyCommand).rejects({ message: 'Failure' });

    mockAxios.put.mockResolvedValue({ status: 200 });
    event.RequestType = CustomResourceTypes.RequestTypes.DELETE;
    const index = require('../index');
    const response = await index.handler(event, context);
    const responseBody = buildResponseBody(event, response, 'Failure');
    axiosConfig.headers['Content-Length'] = responseBody.length;

    expect(iotMock).toHaveReceivedCommandTimes(ListTargetsForPolicyCommand, 1);
    expect(iotMock).toHaveReceivedCommandWith(ListTargetsForPolicyCommand, {
      policyName: 'IotPolicy'
    });

    expect(iotMock).toHaveReceivedCommandTimes(DetachPolicyCommand, 1);
    expect(iotMock).toHaveReceivedCommandWith(DetachPolicyCommand, {
      policyName: 'IotPolicy',
      target: 'target1'
    });
    expect(mockAxios.put).toHaveBeenCalledTimes(1);
    expect(mockAxios.put).toHaveBeenCalledWith(event.ResponseURL, responseBody, axiosConfig);
    expect(response).toEqual({
      Status: CustomResourceTypes.StatusTypes.FAILED,
      Data: { Error: 'Failure' }
    });
  });
});

test('Nothing happens when unsupported resource type comes', async () => {
  mockAxios.put.mockReset();
  mockAxios.put.mockResolvedValue({ status: 200 });

  const event: CustomResourceTypes.EventRequest = {
    RequestType: CustomResourceTypes.RequestTypes.CREATE,
    PhysicalResourceId: 'mock-physical-id',
    StackId: 'mock-stack-id',
    ServiceToken: 'mock-service-token',
    RequestId: 'mock-request-id',
    LogicalResourceId: 'mock-logical-resource-id',
    ResponseURL: 'https://response-url.com',
    ResourceType: 'mock-resource-type',
    ResourceProperties: {
      Resource: 'invalid' as any
    }
  };

  const index = require('../index');
  const response = await index.handler(event, context);
  const responseBody = buildResponseBody(event, response);
  axiosConfig.headers['Content-Length'] = responseBody.length;

  expect(mockAxios.put).toHaveBeenCalledTimes(1);
  expect(mockAxios.put).toHaveBeenCalledWith(event.ResponseURL, responseBody, axiosConfig);
  expect(response).toEqual({
    Status: CustomResourceTypes.StatusTypes.SUCCESS,
    Data: {}
  });
});
