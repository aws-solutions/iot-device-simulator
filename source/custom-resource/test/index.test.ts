// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CustomResourceTypes } from '../interfaces';

// Mock AWS
const mockAws = {
  copyObject: jest.fn(),
  getSignedUrlPromise: jest.fn(),
  getObject: jest.fn(),
  putObject: jest.fn(),
  describeEndpoint: jest.fn(),
  detachPrincipalPolicy: jest.fn(),
  listTargetsForPolicy: jest.fn()
};

jest.mock('aws-sdk/clients/s3', () => {
  return jest.fn(() => ({
    copyObject: mockAws.copyObject,
    getSignedUrlPromise: mockAws.getSignedUrlPromise,
    getObject: mockAws.getObject,
    putObject: mockAws.putObject
  }));
});

jest.mock('aws-sdk/clients/iot', () => {
  return jest.fn(() => ({
    describeEndpoint: mockAws.describeEndpoint,
    detachPrincipalPolicy: mockAws.detachPrincipalPolicy,
    listTargetsForPolicy: mockAws.listTargetsForPolicy
  }))
});


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
    mockAws.copyObject.mockReset();
    mockAws.getObject.mockReset();
    mockAxios.put.mockReset();
  });

  test('Success to copy console assets when creating a solution', async () => {
    mockAws.getObject.mockImplementationOnce(() => {
      return {
        promise() {
          return Promise.resolve({ Body: JSON.stringify(manifest) });
        }
      };
    });
    mockAws.copyObject.mockImplementation(() => {
      return {
        promise() { return Promise.resolve(); }
      };
    });
    mockAxios.put.mockResolvedValue({ status: 200 });

    const index = require('../index');
    const response = await index.handler(event, context);
    const responseBody = buildResponseBody(event, response);
    axiosConfig.headers['Content-Length'] = responseBody.length;

    expect(mockAws.getObject).toHaveBeenCalledTimes(1);
    expect(mockAws.getObject).toHaveBeenCalledWith({
      Bucket: resourceProperties.SourceBucket,
      Key: `${resourceProperties.SourcePrefix}/${resourceProperties.ManifestFile}`
    });

    let n = 1;
    expect(mockAws.copyObject).toHaveBeenCalledTimes(manifest.length);
    for (let fileName of manifest) {
      expect(mockAws.copyObject).toHaveBeenNthCalledWith(n++, {
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
    mockAws.getObject.mockImplementationOnce(() => {
      return {
        promise() { return Promise.reject({ message: 'Failure' }); }
      };
    });
    mockAxios.put.mockResolvedValue({ status: 200 });

    const index = require('../index');
    const response = await index.handler(event, context);
    const responseBody = buildResponseBody(event, response, 'Failure');
    axiosConfig.headers['Content-Length'] = responseBody.length;

    expect(mockAws.getObject).toHaveBeenCalledTimes(1);
    expect(mockAws.getObject).toHaveBeenCalledWith({
      Bucket: resourceProperties.SourceBucket,
      Key: `${resourceProperties.SourcePrefix}/${resourceProperties.ManifestFile}`
    });
    expect(mockAws.copyObject).not.toHaveBeenCalled();
    expect(mockAxios.put).toHaveBeenCalledTimes(1);
    expect(mockAxios.put).toHaveBeenCalledWith(event.ResponseURL, responseBody, axiosConfig);
    expect(response).toEqual({
      Status: CustomResourceTypes.StatusTypes.FAILED,
      Data: { Error: 'Failure' }
    });
  });

  test('Failed to copy the console assets when updating a solution', async () => {
    mockAws.getObject.mockImplementationOnce(() => {
      return {
        promise() {
          return Promise.resolve({ Body: JSON.stringify(manifest) });
        }
      };
    });
    mockAws.copyObject.mockImplementation(() => {
      return {
        promise() { return Promise.reject({ message: 'Failure' }); }
      };
    });
    mockAxios.put.mockResolvedValue({ status: 200 });

    const index = require('../index');
    const response = await index.handler(event, context);
    const responseBody = buildResponseBody(event, response, 'Failure');
    axiosConfig.headers['Content-Length'] = responseBody.length;

    expect(mockAws.getObject).toHaveBeenCalledTimes(1);
    expect(mockAws.getObject).toHaveBeenCalledWith({
      Bucket: resourceProperties.SourceBucket,
      Key: `${resourceProperties.SourcePrefix}/${resourceProperties.ManifestFile}`
    });

    let n = 1;
    expect(mockAws.copyObject).toHaveBeenCalledTimes(manifest.length);
    for (let fileName of manifest) {
      expect(mockAws.copyObject).toHaveBeenNthCalledWith(n++, {
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
    mockAxios.put.mockResolvedValue({ status: 200 });

    const index = require('../index');
    const response = await index.handler(event, context);
    const responseBody = buildResponseBody(event, response);
    axiosConfig.headers['Content-Length'] = responseBody.length;

    expect(mockAws.getObject).not.toHaveBeenCalled();
    expect(mockAws.copyObject).not.toHaveBeenCalled();
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
  const consoleConfig = { key: "value" }

  beforeEach(() => {
    mockAws.putObject.mockReset();
    mockAxios.put.mockReset();
  });

  test('Success to put the console config when creating a solution', async () => {
    mockAws.putObject.mockImplementationOnce(() => {
      return {
        promise() { return Promise.resolve(); }
      };
    });
    mockAxios.put.mockResolvedValue({ status: 200 });

    const index = require('../index');
    const response = await index.handler(event, context);
    const responseBody = buildResponseBody(event, response);
    axiosConfig.headers['Content-Length'] = responseBody.length;

    expect(mockAws.putObject).toHaveBeenCalledTimes(1);
    expect(mockAws.putObject).toHaveBeenCalledWith({
      Body: `const config = ${JSON.stringify(consoleConfig, null, 2)};`,
      Bucket: resourceProperties.DestinationBucket,
      Key: resourceProperties.ConfigFileName,
      ContentType: 'application/javascript'
    });
    expect(mockAxios.put).toHaveBeenCalledTimes(1);
    expect(mockAxios.put).toHaveBeenCalledWith(event.ResponseURL, responseBody, axiosConfig);
    expect(response).toEqual({
      Status: CustomResourceTypes.StatusTypes.SUCCESS,
      Data: {}
    });
  });

  test('Failed to put the console config when updating a solution', async () => {
    event.RequestType = CustomResourceTypes.RequestTypes.UPDATE;
    mockAws.putObject.mockImplementationOnce(() => {
      return {
        promise() { return Promise.reject({ message: 'Failure' }); }
      };
    });
    mockAxios.put.mockResolvedValue({ status: 200 });

    const index = require('../index');
    const response = await index.handler(event, context);
    const responseBody = buildResponseBody(event, response, 'Failure');
    axiosConfig.headers['Content-Length'] = responseBody.length;

    expect(mockAws.putObject).toHaveBeenCalledTimes(1);
    expect(mockAws.putObject).toHaveBeenCalledWith({
      Body: `const config = ${JSON.stringify(consoleConfig, null, 2)};`,
      Bucket: resourceProperties.DestinationBucket,
      Key: resourceProperties.ConfigFileName,
      ContentType: 'application/javascript'
    });
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

    expect(mockAws.putObject).not.toHaveBeenCalled();
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
    mockAxios.put.mockReset()
    mockAws.describeEndpoint.mockReset();
  });

  test('Success to get IoT endpoint', async () => {
    mockAws.describeEndpoint.mockImplementationOnce(() => {
      return {
        promise() { return Promise.resolve({ endpointAddress: 'endpoint.fake' }); }
      };
    });
    mockAxios.put.mockResolvedValue({ status: 200 });

    const index = require('../index');
    const response = await index.handler(event, context);
    const responseBody = buildResponseBody(event, response);
    axiosConfig.headers['Content-Length'] = responseBody.length;

    expect(mockAws.describeEndpoint).toHaveBeenCalledTimes(1);
    expect(mockAws.describeEndpoint).toHaveBeenCalledWith({
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
    mockAxios.put.mockResolvedValue({ status: 200 });

    const index = require('../index');
    const response = await index.handler(event, context);
    const responseBody = buildResponseBody(event, response);
    axiosConfig.headers['Content-Length'] = responseBody.length;

    expect(mockAws.describeEndpoint).not.toHaveBeenCalled();
    expect(mockAxios.put).toHaveBeenCalledTimes(1);
    expect(mockAxios.put).toHaveBeenCalledWith(event.ResponseURL, responseBody, axiosConfig);
    expect(response).toEqual({
      Status: CustomResourceTypes.StatusTypes.SUCCESS,
      Data: {}
    });
  });

  test('Nothing happens when deleting the solution', async () => {
    event.RequestType = CustomResourceTypes.RequestTypes.DELETE;
    mockAxios.put.mockResolvedValue({ status: 200 });

    const index = require('../index');
    const response = await index.handler(event, context);
    const responseBody = buildResponseBody(event, response);
    axiosConfig.headers['Content-Length'] = responseBody.length;

    expect(mockAws.describeEndpoint).not.toHaveBeenCalled();
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
    mockAxios.put.mockReset()
    mockAws.listTargetsForPolicy.mockReset();
    mockAws.detachPrincipalPolicy.mockReset();
  });

  test('Success to get detach IoT policy when request is DELETE', async () => {
    mockAws.listTargetsForPolicy.mockImplementationOnce(() => {
      return {
        promise() { return Promise.resolve({ targets: ["target1"] }); }
      };
    });

    mockAws.detachPrincipalPolicy.mockImplementationOnce(() => {
      return {
        promise() { return Promise.resolve(); }
      };
    });

    mockAxios.put.mockResolvedValue({ status: 200 });

    const index = require('../index');
    const response = await index.handler(event, context);
    const responseBody = buildResponseBody(event, response);
    axiosConfig.headers['Content-Length'] = responseBody.length;

    expect(mockAws.listTargetsForPolicy).toHaveBeenCalledTimes(1);
    expect(mockAws.listTargetsForPolicy).toHaveBeenCalledWith({
      policyName: 'IotPolicy'
    });
    expect(mockAws.detachPrincipalPolicy).toHaveBeenCalledTimes(1);
    expect(mockAws.detachPrincipalPolicy).toHaveBeenCalledWith({
      policyName: 'IotPolicy',
      principal: 'target1'
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
    mockAxios.put.mockResolvedValue({ status: 200 });

    const index = require('../index');
    const response = await index.handler(event, context);
    const responseBody = buildResponseBody(event, response);
    axiosConfig.headers['Content-Length'] = responseBody.length;

    expect(mockAws.listTargetsForPolicy).not.toHaveBeenCalled();
    expect(mockAws.detachPrincipalPolicy).not.toHaveBeenCalled();
    expect(mockAxios.put).toHaveBeenCalledTimes(1);
    expect(mockAxios.put).toHaveBeenCalledWith(event.ResponseURL, responseBody, axiosConfig);
    expect(response).toEqual({
      Status: CustomResourceTypes.StatusTypes.SUCCESS,
      Data: {}
    });
  });

  test('Nothing happens when creating the solution', async () => {
    event.RequestType = CustomResourceTypes.RequestTypes.CREATE;
    mockAxios.put.mockResolvedValue({ status: 200 });

    const index = require('../index');
    const response = await index.handler(event, context);
    const responseBody = buildResponseBody(event, response);
    axiosConfig.headers['Content-Length'] = responseBody.length;

    expect(mockAws.listTargetsForPolicy).not.toHaveBeenCalled();
    expect(mockAws.detachPrincipalPolicy).not.toHaveBeenCalled();
    expect(mockAxios.put).toHaveBeenCalledTimes(1);
    expect(mockAxios.put).toHaveBeenCalledWith(event.ResponseURL, responseBody, axiosConfig);
    expect(response).toEqual({
      Status: CustomResourceTypes.StatusTypes.SUCCESS,
      Data: {}
    });
  });

  test('Fail to get detach IoT policy when listTargetsForPolicy fails', async () => {
    mockAws.listTargetsForPolicy.mockImplementationOnce(() => {
      return {
        promise() { return Promise.reject({ message: 'Failure' }) }
      };
    });

    mockAxios.put.mockResolvedValue({ status: 200 });
    event.RequestType = CustomResourceTypes.RequestTypes.DELETE;
    const index = require('../index');
    const response = await index.handler(event, context);
    const responseBody = buildResponseBody(event, response, 'Failure');
    axiosConfig.headers['Content-Length'] = responseBody.length;

    expect(mockAws.listTargetsForPolicy).toHaveBeenCalledTimes(1);
    expect(mockAws.listTargetsForPolicy).toHaveBeenCalledWith({
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
    mockAws.listTargetsForPolicy.mockImplementationOnce(() => {
      return {
        promise() { return Promise.resolve({ targets: ["target1"] }) }
      };
    });

    mockAws.detachPrincipalPolicy.mockImplementationOnce(() => {
      return {
        promise() { return Promise.reject({ message: 'Failure' }) }
      };
    });

    mockAxios.put.mockResolvedValue({ status: 200 });
    event.RequestType = CustomResourceTypes.RequestTypes.DELETE;
    const index = require('../index');
    const response = await index.handler(event, context);
    const responseBody = buildResponseBody(event, response, 'Failure');
    axiosConfig.headers['Content-Length'] = responseBody.length;

    expect(mockAws.listTargetsForPolicy).toHaveBeenCalledTimes(1);
    expect(mockAws.listTargetsForPolicy).toHaveBeenCalledWith({
      policyName: 'IotPolicy'
    });
    expect(mockAws.detachPrincipalPolicy).toHaveBeenCalledTimes(1);
    expect(mockAws.detachPrincipalPolicy).toHaveBeenCalledWith({
      policyName: 'IotPolicy',
      principal: 'target1'
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