// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @author Solution Builders
 */

"use strict";
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb"),
	{ DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { SOLUTION_ID, VERSION } = process.env;
let awsOptions = {};
if (SOLUTION_ID && VERSION && SOLUTION_ID.trim() && VERSION.trim()) {
	const solutionUserAgent = `AwsSolution/${SOLUTION_ID}/${VERSION}`;
	const capability = `AwsSolution-Capability/${SOLUTION_ID}-C005/${VERSION}`;
	awsOptions.customUserAgent = [[`${solutionUserAgent}`], [`${capability}`]];
}
const docClient = DynamoDBDocumentClient.from(new DynamoDBClient(awsOptions));
const Device = require("../device/index.js");

/**
 * @class Engine - Engine for simulating devices of a device type
 */
class Engine {
	constructor(options, simulation, device) {
		this.options = options;
		this.device = device;
		this.simulation = simulation;
		//set to poll DDB for stage every 30 sec
		this.stagePoller = setInterval(() => {
			this._pollDeviceStage();
		}, 30000);
		this.deviceInstances = [];
	}

	/**
	 * Starts the number of devices specified for a device type
	 */
	async start() {
		let promises = [];

		for (let i = 0; i < this.device.amount; i++) {
			//check for device state from previous lambda run
			let deviceState;
			if (this.device.states) {
				deviceState = this.device.states[i];
				this.device.info = { ...this.device.info, ...deviceState };
			} else {
				//set predictable device ID for access in front end
				this.device.info.id = `${this.simulation.simId.slice(0, 3)}${this.device.typeId.slice(0, 3)}${i}`;
			}
			//create new Device and run if not already complete
			if (deviceState && deviceState === "complete") {
				promises.push(deviceState);
			} else {
				let device = new Device(this.options, this.simulation, this.device.info);
				this.deviceInstances.push(device);
				promises.push(device.run());
			}
		}
		//Wait for all devices to finish
		console.log(`Running ${this.device.amount} devices of type ${this.device.typeId}`);
		let results = await Promise.all(promises);
		clearInterval(this.stagePoller);
		//make sure every device for this device type are complete
		if (results.every((result) => result === "complete")) {
			return "complete";
		} else {
			//if not complete return necessary info for resart
			return {
				typeId: this.device.typeId,
				amount: this.device.amount,
				info: {
					topic: this.device.info.topic,
					payload: this.device.info.payload,
				},
				states: results,
			};
		}
	}

	/**
	 * Polls DynamoDB to check for stopping signal
	 */
	async _pollDeviceStage() {
		console.log("Polling for current simulation stage");
		let params = {
			TableName: process.env.SIM_TABLE,
			Key: {
				simId: this.simulation.simId,
			},
		};
		try {
			let simulation = await docClient.send(new GetCommand(params));
			if (simulation.Item) {
				console.log(`Attempting to stop ${this.device.amount} devices of type ${this.device.typeId}.`);
				if (simulation.Item.stage === "stopping") {
					this.deviceInstances.forEach((device) => {
						device.stop();
					});
				}
			} else {
				throw Error("simulation not found");
			}
		} catch (err) {
			console.error(err);
			console.error(`Error retrieving simulation from ddb to check stage change, simId:, ${this.simulation.simId}`);
			throw err;
		}
	}
}

module.exports = Engine;
