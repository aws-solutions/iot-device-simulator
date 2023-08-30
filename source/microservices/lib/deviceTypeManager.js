// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @author Solution Builders
 */

"use strict";
const { sendAnonymousMetric } = require("../metrics/index");
const { DynamoDBDocumentClient, ScanCommand, PutCommand, GetCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb"),
	{ DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { nanoid } = require("nanoid");
const { SOLUTION_ID, VERSION } = process.env;
let options = {};
if (SOLUTION_ID && VERSION && SOLUTION_ID.trim() && VERSION.trim()) {
	const solutionUserAgent = `AwsSolution/${SOLUTION_ID}/${VERSION}`;
	const capability = `AwsSolution-Capability/${SOLUTION_ID}-C001/${VERSION}`;
	options.customUserAgent = [[`${solutionUserAgent}`], [`${capability}`]];
}
let docClient = DynamoDBDocumentClient.from(new DynamoDBClient(options));

/**
 * Performs crud actions for a device type, such as, creating, retrieving, updating and deleting device types.
 *
 * @class DeviceTypeManager
 */
class DeviceTypeManager {
	/**
	 * Get device types for the user.
	 *
	 */
	async getDeviceTypes() {
		const params = {
			TableName: process.env.DEVICE_TYPES_TBL,
		};
		try {
			let results = await docClient.send(new ScanCommand(params));
			let lastEvalKey = results.LastEvaluatedKey;
			while (lastEvalKey && Object.keys(lastEvalKey).length > 0) {
				params.ExclusiveStartKey = lastEvalKey;
				let newResults = await docClient.send(new ScanCommand(params));
				results.Items.push(...newResults.Items);
				lastEvalKey = newResults.LastEvaluatedKey;
			}
			return results.Items;
		} catch (err) {
			console.error(err);
			console.error(`Error occurred while attempting to retrieve device types.`);
			throw err;
		}
	}

	/**
	 * Creates a device type for user.
	 * @param {object} deviceType - device type object
	 */
	async createDeviceType(deviceType) {
		try {
			let _id;
			if (deviceType.typeId && deviceType.typeId !== "idsAutoDemo") {
				_id = deviceType.typeId;
			} else {
				const suffix = deviceType.typeId || "";
				_id = nanoid(9) + suffix;
			}
			const date = new Date().toISOString();
			let _deviceType = {
				typeId: _id,
				name: deviceType.name,
				topic: deviceType.topic,
				payload: deviceType.payload,
				createdAt: date,
				updatedAt: date,
			};
			let params = {
				TableName: process.env.DEVICE_TYPES_TBL,
				Item: _deviceType,
			};
			await docClient.send(new PutCommand(params));
			if (process.env.SEND_ANONYMOUS_METRIC === "Yes") {
				let metricData = {
					eventType: "create device type",
				};
				metricData.uniquePayloadAttrs = deviceType.payload.reduce((acc, curValue) => {
					if (!acc.includes(curValue.type)) acc.push(curValue.type);
					return acc;
				}, []);
				await sendAnonymousMetric(metricData);
			}
			return _deviceType;
		} catch (err) {
			console.error(err);
			console.error(`Error occurred while attempting to create device type.`);
			throw err;
		}
	}

	/**
	 * Deletes a device type for user.
	 * @param {string} deviceTypeId - id of device type to delete
	 */
	async deleteDeviceType(deviceTypeId) {
		try {
			let params = {
				TableName: process.env.DEVICE_TYPES_TBL,
				Key: {
					typeId: deviceTypeId,
				},
			};
			let deviceType = await docClient.send(new GetCommand(params));
			if (deviceType.Item) {
				return docClient.send(new DeleteCommand(params));
			} else {
				let error = new Error();
				error.code = 400;
				error.error = "MissingDeviceType";
				error.message = `The requested device type ${deviceTypeId} does not exist.`;
				throw error;
			}
		} catch (err) {
			console.error(err);
			console.error(`Error occurred while attempting to delete device type.`);
			throw err;
		}
	}
}

module.exports = DeviceTypeManager;
