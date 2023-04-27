// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Application, AttributeGroup } from "@aws-cdk/aws-servicecatalogappregistry-alpha";
import { Aws, CfnMapping, Fn, Stack, Tags } from "aws-cdk-lib";

declare module "aws-cdk-lib" {
    export interface CfnMapping {
        setDataMapValue(key: string, value: string): void;
        findInDataMap(key: string): string;
    }
}

CfnMapping.prototype.setDataMapValue = function (key: string, value: string): void {
    this.setValue("Data", key, value);
};

CfnMapping.prototype.findInDataMap = function (key: string): string {
    return this.findInMap("Data", key);
};

//  Set an arbitrary value to use as a prefix for the DefaultApplicationAttributeGroup name
//  This may change in the future, and must not match the previous two prefixes
const attributeGroupPrefix = "S01";

//  Declare KVP object for type checked values
const AppRegistryMetadata = {
    ID: "ID",
    Version: "Version",
    AppRegistryApplicationName: "AppRegistryApplicationName",
    SolutionName: "SolutionName",
    ApplicationType: "ApplicationType"
};

/**
 * Solution config properties.
 * Logging level, solution ID, version, source code bucket, and source code prefix
 */
interface SolutionProps {
    readonly solutionId: string;
    readonly solutionName: string;
    readonly solutionVersion: string;
    readonly solutionDescription: string;
}

export function applyAppRegistry(stack: Stack, solutionProps: SolutionProps) {
    //  Declare CFN Mappings
    const map = new CfnMapping(stack, "AppRegistry", { lazy: true });
    map.setDataMapValue(AppRegistryMetadata.ID, solutionProps.solutionId);
    map.setDataMapValue(AppRegistryMetadata.Version, solutionProps.solutionVersion);
    map.setDataMapValue(AppRegistryMetadata.AppRegistryApplicationName, solutionProps.solutionName);
    map.setDataMapValue(AppRegistryMetadata.SolutionName, solutionProps.solutionName);
    map.setDataMapValue(AppRegistryMetadata.ApplicationType, "AWS-Solutions");

    const application = new Application(stack, "Application", {
        applicationName: Fn.join("-", [
            map.findInDataMap(AppRegistryMetadata.AppRegistryApplicationName),
            Aws.REGION,
            Aws.ACCOUNT_ID,
            Aws.STACK_NAME
        ]),
        description: solutionProps.solutionDescription ?? "Iot Device Simulator Description"
    });
    application.associateApplicationWithStack(stack);

    Tags.of(application).add("Solutions:SolutionID", map.findInDataMap(AppRegistryMetadata.ID));
    Tags.of(application).add("Solutions:SolutionName", map.findInDataMap(AppRegistryMetadata.SolutionName));
    Tags.of(application).add("Solutions:SolutionVersion", map.findInDataMap(AppRegistryMetadata.Version));
    Tags.of(application).add("Solutions:ApplicationType", map.findInDataMap(AppRegistryMetadata.ApplicationType));

    const attributeGroup = new AttributeGroup(stack, "DefaultApplicationAttributeGroup", {
        //  Use SolutionName as a unique prefix for the attribute group name
        attributeGroupName: Fn.join("-", [attributeGroupPrefix, Aws.REGION, Aws.STACK_NAME]),
        description: "Attribute group for solution information",
        attributes: {
            applicationType: map.findInDataMap(AppRegistryMetadata.ApplicationType),
            version: map.findInDataMap(AppRegistryMetadata.Version),
            solutionID: map.findInDataMap(AppRegistryMetadata.ID),
            solutionName: map.findInDataMap(AppRegistryMetadata.SolutionName)
        }
    });
    attributeGroup.associateWith(application);
}
