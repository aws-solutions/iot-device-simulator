// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @author Solution Builders
 */
"use strict";
const { IoTDataPlaneClient: IotData, PublishCommand } = require("@aws-sdk/client-iot-data-plane");
const moment = require("moment");
const Random = require("./generators/random/generator");
const Vehicle = require("./generators/vehicle/generator.js");
let awsOptions = { endpoint: "https://" + process.env.IOT_ENDPOINT };
const { SOLUTION_ID, VERSION } = process.env;
if (SOLUTION_ID && VERSION && SOLUTION_ID.trim() && VERSION.trim()) {
	const solutionUserAgent = `AwsSolution/${SOLUTION_ID}/${VERSION}`;
	const capability = `AwsSolution-Capability/${SOLUTION_ID}-C003/${VERSION}`;
	awsOptions.customUserAgent = [[`${solutionUserAgent}`], [`${capability}`]];
}
const iotData = new IotData(awsOptions);
/**
 * @Class Device - represents a single device
 */
class Device {
	constructor(options, sim, device) {
		this.options = options;
		this.id = device.id;
		this.started = device.started || moment().toISOString();
		this.simId = sim.simId;
		this.sendInterval = null;
		this.stage = device.stage || sim.stage;
		if (device.generator) {
			this.options.currentState = device.generator.currentState;
			this.options.staticValues = device.generator.staticValues;
		}
		this.generator = sim.simId.includes("idsAutoDemo") ? new Vehicle(this.options) : new Random(this.options);
		this.payload = device.payload;
		this.topic = device.topic;
		this.duration = sim.duration * 1000;
		this.interval = sim.interval * 1000;
	}

	/**
	 * generates and sends a message on the given interval
	 */
	sendOnInterval = () => {
		return new Promise((resolve, reject) => {
			//generate message on interval
			this.sendInterval = setInterval(async () => {
				//generate the message and publish
				this._generateMessage();
				if (this.stage === "sleeping") {
					//stop device if no longer running
					this.generator.stop();
					clearInterval(this.sendInterval);
					resolve("complete");
				} else if (this.options.context.getRemainingTimeInMillis() <= this.interval) {
					//stop device if not enough time to run another interval
					this.generator.stop();
					clearInterval(this.sendInterval);
					//return information necessary to restart device
					resolve({
						stage: this.stage,
						started: this.started,
						id: this.id,
						generator: {
							currentState: this.generator.currentState,
							staticValues: this.generator.staticValues,
						},
					});
				}
			}, this.interval);
		});
	};

	/**
	 * Starts the device
	 * @returns the result of the device run
	 */
	async run() {
		this.stage = "running";
		try {
			//start generating messages on given interval
			return this.sendOnInterval();
		} catch (err) {
			console.error("Error occurred while starting to generate messages", err);
			throw err;
		}
	}

	/**
	 * Stops the device
	 */
	stop() {
		this.stage = "sleeping";
	}

	/**
	 * publishes the message payload to the given IoT topic
	 * @param {string} topic
	 * @param {object} messagePayload
	 * @returns the data from the publish call
	 */
	async _publishMessage(topic, messagePayload) {
		//set iot publish params
		let params = {
			topic: topic,
			payload: messagePayload,
			qos: 0,
		};
		//publish to IoT topic
		try {
			return await iotData.send(new PublishCommand(params));
		} catch (err) {
			console.error("Error occurred while publishinig message to IoT topic", err);
			throw err;
		}
	}

	/**
	 * Generates the message to be published
	 * and publishes to the given IoT topic
	 */
	async _generateMessage() {
		//check if the duration has elapsed
		let timeDelta = moment().diff(moment(this.started));
		if (timeDelta > this.duration || !this.generator.isRunning) {
			console.log(`Device '${this.id}' run duration has elapsed.`);
			this.stop();
		} else {
			//generate the message payload
			this.generator.generateMessagePayload(this.payload, this.topic, this.id);
			//publish all messages
			let messagePromises = this.generator.messages.map((_message) => {
				let _payload = JSON.stringify(_message.payload);
				return this._publishMessage(_message.topic, _payload);
			});
			//wait for messages to publish then clear the generator messages
			try {
				await Promise.all(messagePromises);
				this.generator.clearMessages();
			} catch (err) {
				console.error("Error occurred while clearing the generator messages", err);
				throw err;
			}
		}
	}
}

module.exports = Device;
