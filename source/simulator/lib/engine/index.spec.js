// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

"use strict";
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");
const AWSMock = require("aws-sdk-client-mock");
const dynamodbDocMock = AWSMock.mockClient(DynamoDBDocumentClient);
require("aws-sdk-client-mock-jest");
process.env.AWS_REGION = "us-east-1";
process.env.IOT_ENDPOINT = "endpoint.fake";
const Device = require("../device/index.js");
jest.mock("../device/index.js");
const Engine = require("./index.js");

let simulation = {
	simId: "123",
	name: "abc",
	stage: "running",
	devices: [{ typeId: "456", name: "xyz", amount: 1 }],
	interval: 2,
	duration: 5,
};

let deviceInfo = {
	id: "1234560",
	typeId: "456",
	name: "xyz",
	topic: "topic/test",
	payload: [
		{
			name: "aString",
			type: "string",
			min: "2",
			max: "4",
			static: false,
		},
	],
};

let device = {
	amount: 1,
	typeId: "456",
	info: { ...deviceInfo },
};

let options = {
	timeLeft: 50000,
	context: {
		getRemainingTimeInMillis: () => {
			return options.timeLeft;
		},
	},
};

jest.useFakeTimers();

describe("Engine", function () {
	beforeEach(() => {
		dynamodbDocMock.reset();
	});
	afterEach(() => {
		Device.mockImplementation(() => ({
			run: jest.fn(),
			stage: "running",
			stop: jest.fn(),
		}));
		dynamodbDocMock.restore();
	});

	describe("start()", function () {
		it("should return complete for each succesful device run", async () => {
			Device.mockImplementation(() => ({
				run: jest.fn(() => "complete"),
			}));
			const engine = new Engine(options, simulation, device);
			clearInterval(engine.stagePoller);
			device.amount = 5;
			const result = await engine.start();
			engine.deviceInstances.forEach((device) => {
				expect(device.run).toHaveReturnedWith("complete");
				expect(device.run).toHaveBeenCalledTimes(1);
			});
			expect(result).toEqual("complete");
		});
		it("should return relevant info for each device when not complete", async () => {
			Device.mockImplementation(() => ({
				run: jest.fn(() => ({ info: {} })),
			}));
			const engine = new Engine(options, simulation, device);
			clearInterval(engine.stagePoller);
			device.amount = 2;
			const result = await engine.start();
			engine.deviceInstances.forEach((device) => {
				expect(device.run).toHaveReturnedWith({ info: {} });
			});
			expect(result).toEqual({
				typeId: device.typeId,
				amount: device.amount,
				info: {
					topic: deviceInfo.topic,
					payload: deviceInfo.payload,
				},
				states: [{ info: {} }, { info: {} }],
			});
		});
		it("should run only non-complete devices", async () => {
			Device.mockImplementation(() => ({
				run: jest.fn(() => ({ info: {} })),
			}));
			device.states = ["complete", { info: {} }];
			const engine = new Engine(options, simulation, device);
			clearInterval(engine.stagePoller);
			device.amount = 2;
			const result = await engine.start();
			expect(engine.deviceInstances).toHaveLength(1);
			expect(engine.deviceInstances[0].run).toHaveReturnedWith({ info: {} });
			expect(result).toEqual({
				typeId: device.typeId,
				amount: device.amount,
				info: {
					topic: deviceInfo.topic,
					payload: deviceInfo.payload,
				},
				states: ["complete", { info: {} }],
			});
		});
	});
	describe("_pollDeviceStage()", function () {
		it('should get simulation from DynamoDB and keep running if simulation stage is not "stopping"', async () => {
			dynamodbDocMock.on(GetCommand).resolves({ Item: { stage: "running" } });
			jest.spyOn(Device.prototype, "stop");
			const engine = new Engine(options, simulation, device);
			clearInterval(engine.stagePoller);
			engine.deviceInstances.push(new Device(options, simulation, deviceInfo));

			try {
				await engine._pollDeviceStage();
				expect(engine.deviceInstances[0].stop).toHaveBeenCalledTimes(0);
				expect(engine.deviceInstances[0].stage).toEqual("running");
			} catch (err) {
				console.error(err);
				throw err;
			}
		});
		it('should get simulation from DynamoDB and stop if simulation stage is "stopping"', async () => {
			dynamodbDocMock.on(GetCommand).resolves({ Item: { stage: "stopping" } });
			const engine = new Engine(options, simulation, device);
			clearInterval(engine.stagePoller);
			engine.deviceInstances.push(new Device(options, simulation, deviceInfo));
			jest.spyOn(engine.deviceInstances[0], "stop");
			await engine._pollDeviceStage();
			expect(engine.deviceInstances[0].stop).toHaveBeenCalledTimes(1);
		});
		it("should thow error if DynamoDB get returns error", async () => {
			dynamodbDocMock.on(GetCommand).rejects("error");
			jest.spyOn(Device.prototype, "stop");
			const engine = new Engine(options, simulation, device);
			engine.deviceInstances.push(new Device(options, simulation, deviceInfo));
			clearInterval(engine.stagePoller);
			try {
				await engine._pollDeviceStage();
			} catch (err) {
				expect(err).toEqual(Error("error"));
			}
		});
		it("should throw error if DynamoDB returns empty value", async () => {
			dynamodbDocMock.on(GetCommand).resolves({});
			const engine = new Engine(options, simulation, device);
			clearInterval(engine.stagePoller);
			try {
				await engine._pollDeviceStage();
			} catch (err) {
				expect(err).toEqual(Error("simulation not found"));
			}
		});
		it("should poll device stage after 30 seconds", async () => {
			const engine = new Engine(options, simulation, device);
			engine.deviceInstances.push(new Device(options, simulation, deviceInfo));
			jest.spyOn(engine, "_pollDeviceStage").mockImplementation(async () => {
				return;
			});
			jest.advanceTimersByTime(30000);
			expect(engine._pollDeviceStage).toHaveBeenCalledTimes(1);
		});
	});
});
