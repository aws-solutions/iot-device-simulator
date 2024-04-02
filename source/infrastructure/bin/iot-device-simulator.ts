// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { addCfnSuppressRules } from "@aws-solutions-constructs/core";
import { App, Aspects, CfnResource, DefaultStackSynthesizer, IAspect } from "aws-cdk-lib";
import { CfnFunction } from "aws-cdk-lib/aws-lambda";
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { IConstruct } from "constructs";
import { IDSStack } from "../lib/iot-device-simulator-stack";

/**
 * CDK Aspect implementation to add common metadata to suppress CFN rules
 */
class LambdaFunctionAspect implements IAspect {
	visit(node: IConstruct): void {
		const resource = node as CfnResource;
		if (resource instanceof CfnFunction) {
			const rules = [
				{ id: "W58", reason: "The function does have permission to write CloudWatch Logs." },
				{ id: "W89", reason: "The Lambda function does not require any VPC connection at all." },
				{ id: "W92", reason: "The Lambda function does not require ReservedConcurrentExecutions." },
			];

			addCfnSuppressRules(resource, rules);
		}
	}
}

const app = new App();
const stack = new IDSStack(app, "IDSStack", {
	description:
		"(SO0041) - The AWS cloud formation template for the deployment of SOLUTION_NAME_PLACEHOLDER. Version VERSION_PLACEHOLDER",
	synthesizer: new DefaultStackSynthesizer({
		generateBootstrapVersionRule: false,
	}),
});
NagSuppressions.addStackSuppressions(stack, [
	{ id: 'AwsSolutions-IAM5', reason: 'All IAM policies defined in this solution grant only least-privilege permissions. Wild card for resources is used only for services which either do not have a resource arn or does not allow for resource specification' },
	{ id: 'AwsSolutions-APIG3', reason: 'No need to enable WAF as it is up to users.' },
	{ id: 'AwsSolutions-APIG4', reason: 'Authorized by IAM' },
	{ id: 'AwsSolutions-COG4', reason: 'Authorized by IAM' },
	{ id: 'AwsSolutions-IAM4', reason: 'AmazonAPIGatewayPushToCloudWatchLogs managed policy is used by CDK itself.'}
  ]);
Aspects.of(stack).add(new LambdaFunctionAspect());
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));