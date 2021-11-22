// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CfnResource, Resource } from '@aws-cdk/core';

/**
 * The CFN NAG suppress rule interface
 * @interface CfnNagSuppressRule
 */
interface CfnNagSuppressRule {
  id: string;
  reason: string;
}

/**
 * Adds CFN NAG suppress rules to the CDK resource.
 * @param resource The CDK resource
 * @param rules The CFN NAG suppress rules
 */
export function addCfnSuppressRules(resource: Resource | CfnResource, rules: CfnNagSuppressRule[]) {
  if (resource instanceof Resource) {
    resource = resource.node.defaultChild as CfnResource;
  }

  resource.addMetadata('cfn_nag', {
    rules_to_suppress: rules
  });
}