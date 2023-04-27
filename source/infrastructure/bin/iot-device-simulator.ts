// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { IDSStack } from "../lib/iot-device-simulator-stack";
import { addCfnSuppressRules } from "@aws-solutions-constructs/core";
import { IConstruct } from "constructs";
import { App, Aspects, CfnResource, IAspect } from "aws-cdk-lib";
import { CfnFunction } from "aws-cdk-lib/aws-lambda";

/**
 * CDK Aspect implementation to add common metadata to suppress CFN rules
 */
class LambdaFunctionAspect implements IAspect {
  visit(node: IConstruct): void {
    const resource = node as CfnResource;
    if (resource instanceof CfnFunction) {

      const rules = [
        { id: 'W58', reason: 'The function does have permission to write CloudWatch Logs.' },
        { id: 'W89', reason: 'The Lambda function does not require any VPC connection at all.' },
        { id: 'W92', reason: 'The Lambda function does not require ReservedConcurrentExecutions.' }
      ];

      addCfnSuppressRules(resource, rules);
    }
  }
}

const app = new App();
const stack = new IDSStack(app, 'IDSStack', {
  description: '(SO0041) - The AWS cloud formation template for the deployment of SOLUTION_NAME_PLACEHOLDER. Version VERSION_PLACEHOLDER.'
});
Aspects.of(stack).add(new LambdaFunctionAspect());
