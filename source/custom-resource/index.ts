// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { v4 } from 'uuid';
import { CustomResourceTypes } from './interfaces';
import {
  CopyObjectCommand,
  CopyObjectCommandInput,
  GetObjectCommand,
  GetObjectCommandInput,
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client
} from "@aws-sdk/client-s3";
import {
  DescribeEndpointCommand,
  DescribeEndpointCommandInput,
  DetachPolicyCommand,
  DetachPolicyCommandInput,
  IoTClient,
  ListTargetsForPolicyCommand
} from "@aws-sdk/client-iot";

const { SOLUTION_ID, SOLUTION_VERSION } = process.env;
let options: { [key: string]: string } = {};
if (SOLUTION_ID && SOLUTION_VERSION
  && SOLUTION_ID.trim() !== '' && SOLUTION_VERSION.trim() !== '') {
  options.customUserAgent = `AwsSolution/${SOLUTION_ID}/${SOLUTION_VERSION}`;
}
const s3Client = new S3Client(options);
const iotClient = new IoTClient(options);

/**
 * Handles the custom resource requests.
 * @param event The custom resource event
 * @param context The Lambda function context
 */
exports.handler = async (event: CustomResourceTypes.EventRequest, context: CustomResourceTypes.LambdaContext): Promise<CustomResourceTypes.CustomResourceResponse> => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`);

  const { RequestType, ResourceProperties } = event;
  const { Resource } = ResourceProperties;
  const response: CustomResourceTypes.CustomResourceResponse = {
    Status: CustomResourceTypes.StatusTypes.SUCCESS,
    Data: {}
  };
  let reason = `See the details in CloudWatch Log Stream: ${context.logStreamName}`;

  try {
    switch (Resource) {
      case CustomResourceTypes.ResourceTypes.DETACH_IOT_POLICY:
        if (RequestType === CustomResourceTypes.RequestTypes.DELETE) {
          // Detach AWS IoT policy so that the resources can be deleted.
          await detachIotPolicy(event.ResourceProperties as CustomResourceTypes.DetachIoTPolicyRequestProps, RequestType);
        }
        break;

      case CustomResourceTypes.ResourceTypes.CREATE_UUID:
        if (RequestType === CustomResourceTypes.RequestTypes.CREATE) {
          const { StackName } = ResourceProperties;
          response.Data.UUID = v4();
          response.Data.UNIQUE_SUFFIX = v4().split('-').pop();
          response.Data.REDUCED_STACK_NAME = StackName.length < 10 ? StackName : StackName.substr(0, 9);
        }
        break;

      case CustomResourceTypes.ResourceTypes.DESCRIBE_IOT_ENDPOINT:
        if (RequestType === CustomResourceTypes.RequestTypes.CREATE) {
          const endpointAddress = await getIotEndpoint();
          response.Data.IOT_ENDPOINT = endpointAddress;
        }
        break;

      case CustomResourceTypes.ResourceTypes.COPY_S3_ASSETS:
        await copyS3Assets(ResourceProperties as CustomResourceTypes.CopyFilesProperties, RequestType);
        break;

      case CustomResourceTypes.ResourceTypes.CREATE_CONFIG:
        await createConsoleConfig(ResourceProperties as CustomResourceTypes.CreateConsoleConfigProperties, RequestType);
        break;

      default:
        break;
    }
  } catch (error) {
    console.error(error);

    response.Status = CustomResourceTypes.StatusTypes.FAILED;
    response.Data.Error = error.message;
    reason = error.message;
  }

  const cloudFormationResponse = await sendCloudFormationResponse(event, response, reason);
  console.log(`Status text: ${cloudFormationResponse.statusText}, code: ${cloudFormationResponse.status}, response: ${JSON.stringify(response)}`);

  return response;
}

/**
 * Sends a response to the CloudFormation response URL.
 * @param event The custom resource event
 * @param response The custom resource response
 * @param reason The error reason
 * @returns The response from the CloudFront response URL
 */
async function sendCloudFormationResponse(event: CustomResourceTypes.EventRequest, response: CustomResourceTypes.CustomResourceResponse, reason: string): Promise<AxiosResponse> {
  const responseBody = JSON.stringify({
    Status: response.Status,
    Reason: reason,
    PhysicalResourceId: event.LogicalResourceId,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: response.Data
  });
  console.debug(`Response body: ${JSON.stringify(responseBody, null, 2)}`);

  const config: AxiosRequestConfig = {
    headers: {
      'Content-Length': responseBody.length,
      'Content-Type': ''
    }
  };

  return axios.put(event.ResponseURL, responseBody, config);
}

/**
 * Copies S3 assets to the solution bucket when creating or updating the solution.
 * @param props Copying S3 assets custom resource properties
 * @param requestType The custom resource request type
 */
async function copyS3Assets(props: CustomResourceTypes.CopyFilesProperties, requestType: CustomResourceTypes.RequestTypes): Promise<void> {
  if ([CustomResourceTypes.RequestTypes.CREATE, CustomResourceTypes.RequestTypes.UPDATE].includes(requestType)) {
    const { DestinationBucket, ManifestFile, SourceBucket, SourcePrefix } = props;
    const getParams: GetObjectCommandInput = {
      Bucket: SourceBucket,
      Key: `${SourcePrefix}/${ManifestFile}`
    };

    console.debug(`Getting manifest file: ${JSON.stringify(getParams, null, 2)}`);
    const response = await s3Client.send(new GetObjectCommand(getParams));
    const body = await response.Body.transformToString();
    const manifest: string[] = JSON.parse(body);

    await Promise.all(manifest.map(async (fileName: string) => {
      const keyName = fileName.split('/').slice(1).join('/');
      const copyParams: CopyObjectCommandInput = {
        Bucket: DestinationBucket,
        CopySource: `${SourceBucket}/${SourcePrefix}/${fileName}`,
        Key: keyName
      };

      console.debug(`Copying ${fileName} to ${DestinationBucket}`);
      return await s3Client.send(new CopyObjectCommand(copyParams));
    }));
  }
}

/**
 * Creating the console config to the console bucket when creating or updating the solution.
 * @param props Creating console config custom resource properties
 * @param requestType The custom resource request type
 */
async function createConsoleConfig(props: CustomResourceTypes.CreateConsoleConfigProperties, requestType: CustomResourceTypes.RequestTypes): Promise<void> {
  if ([CustomResourceTypes.RequestTypes.CREATE, CustomResourceTypes.RequestTypes.UPDATE].includes(requestType)) {
    const { configObj, DestinationBucket, ConfigFileName } = props;
    const config = JSON.parse(configObj);

    const params: PutObjectCommandInput = {
      Body: `const config = ${JSON.stringify(config, null, 2)};`,
      Bucket: DestinationBucket,
      Key: ConfigFileName,
      ContentType: 'application/javascript'
    };
    console.log(`Putting console config: ${JSON.stringify(config, null, 2)}`);
    await s3Client.send(new PutObjectCommand(params));
  }
}

/**
 * Get the IoT endpoint
 * @param props Gets the IoT endpoint custom resource properties
 * @param requestType The custom resource request type
 * @returns the IoT endpoint address
 */
async function getIotEndpoint(): Promise<string> {
  let params: DescribeEndpointCommandInput = {
    endpointType: 'iot:Data-ATS'
  };

  const data = await iotClient.send(new DescribeEndpointCommand(params));
  return data.endpointAddress;
}

/**
 * Detach IoT policy on CloudFormation DELETE.
 * @param policyName - IoT policy name
 */
async function detachIotPolicy(props: CustomResourceTypes.DetachIoTPolicyRequestProps, requestType: CustomResourceTypes.RequestTypes): Promise<void> {
  if (requestType === CustomResourceTypes.RequestTypes.DELETE) {
    const { IotPolicyName } = props;
    const response = await iotClient.send(new ListTargetsForPolicyCommand({
      policyName: IotPolicyName
    }));
    const targets = response.targets;
    for (let target of targets) {
      const params: DetachPolicyCommandInput = {
        policyName: IotPolicyName,
        target: target
      };
      await iotClient.send(new DetachPolicyCommand(params));
      console.log(`${target} is detached from ${IotPolicyName}`);
    }
  }
}
