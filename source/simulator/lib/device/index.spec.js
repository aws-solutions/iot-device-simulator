// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

"use strict";
const { PublishCommand, IoTDataPlaneClient } = require("@aws-sdk/client-iot-data-plane");
const AWSMock = require("aws-sdk-client-mock");
const iotMock = AWSMock.mockClient(IoTDataPlaneClient);
require("aws-sdk-client-mock-jest");
const Generator = require("./generators/random/generator");
const Vehicle = require("./generators/vehicle/generator");
let Device = require("./index.js");

jest.mock("./generators/random/generator");
jest.mock("./generators/vehicle/generator");

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

process.env.AWS_REGION = "us-east-1";
process.env.IOT_ENDPOINT = "endpoint.fake";

let options = {
	timeLeft: 50000,
	context: {
		getRemainingTimeInMillis: () => {
			return options.timeLeft;
		},
	},
};

jest.useFakeTimers();
describe("Device", function () {
	beforeEach(() => {
		iotMock.reset();
	});
	afterEach(() => {
		jest.restoreAllMocks();
		iotMock.restore();
	});
	describe("constructor()", function () {
		it("should use conditional values when they are provided", async () => {
			deviceInfo.started = "today";
			deviceInfo.stage = "stage";
			deviceInfo.generator = {
				currentState: { key: "value" },
				staticValues: { key: "value" },
			};
			const device = new Device(options, simulation, deviceInfo);

			expect(device.started).toEqual(deviceInfo.started);
			expect(device.stage).toEqual(deviceInfo.stage);
			expect(device.options.currentState).toEqual(deviceInfo.generator.currentState);
			expect(device.options.staticValues).toEqual(deviceInfo.generator.staticValues);
			delete deviceInfo.started;
			delete deviceInfo.stage;
			delete deviceInfo.generator;
		});
		it("should use Vehicle as generator when simId contains idsAutoDemo", async () => {
			simulation.simId = "123idsAutoDemo";
			const device = new Device(options, simulation, deviceInfo);
			expect(device.generator).toBeInstanceOf(Vehicle);
			simulation.simId = "123";
		});
	});
	describe("run()", function () {
		it("should return sendOnInterval() result on successful run()", async () => {
			const device = new Device(options, simulation, deviceInfo);
			jest.spyOn(device, "sendOnInterval").mockImplementationOnce(async () => {
				return "complete";
			});

			const result = await device.run();
			expect(result).toEqual("complete");
		});
		it("should throw error if run() fails due to sendOnInterval() error", async () => {
			const device = new Device(options, simulation, deviceInfo);
			jest.spyOn(device, "sendOnInterval").mockImplementationOnce(async () => {
				throw Error("error");
			});
			try {
				await device.run();
			} catch (err) {
				expect(err).toEqual(Error("error"));
			}
		});
	});
	describe("sendOnInterval()", function () {
		const device = new Device(options, simulation, deviceInfo);
		it("should return complete when simlation stage is sleeping, and run on given interval", async () => {
			jest.spyOn(device, "_generateMessage").mockImplementation(async () => {
				return;
			});

			Generator.mockImplementationOnce(() => {
				return {
					stop: () => {
						return;
					},
				};
			});
			const result = device.sendOnInterval();
			jest.advanceTimersByTime(2000);
			//should have run once after 2 seconds
			expect(device._generateMessage).toHaveBeenCalledTimes(1);
			jest.advanceTimersByTime(2000);
			//should have run twice after 4 seconds
			expect(device._generateMessage).toHaveBeenCalledTimes(2);
			device.stage = "sleeping";
			jest.advanceTimersByTime(2000);
			//should not have been called again since stage is sleeping
			expect(device._generateMessage).toHaveBeenCalledTimes(3);

			expect(await result).toEqual("complete");
		});
		it("should return necessary info when time is up and it is not finished", async () => {
			options.timeLeft = 1000;
			const device = new Device(options, simulation, deviceInfo);
			jest.spyOn(device, "_generateMessage").mockImplementationOnce(() => ({}));
			Generator.mockImplementationOnce(() => {
				return {
					currentState: {},
					staticValues: {},
					isRunning: true,
					stop: () => {
						return;
					},
				};
			});
			device.generator.isRunning = true;
			const result = device.sendOnInterval();
			jest.advanceTimersByTime(2000);
			expect(await result).toEqual({
				stage: device.stage,
				started: device.started,
				id: device.id,
				generator: {
					currentState: device.generator.currentState,
					staticValues: device.generator.staticValues,
				},
			});
		});
	});
	describe("stop()", function () {
		it("should set device stage to sleeping", async () => {
			const device = new Device(options, simulation, deviceInfo);
			device.stop();
			expect(device.stage).toEqual("sleeping");
		});
	});
	describe("_publishMessage()", function () {
		it("should return data from AWS.IotData.publish() function call", async () => {
			let device = new Device(options, simulation, deviceInfo);
			iotMock.on(PublishCommand).resolves("published data");
			const results = await device._publishMessage("topic", {});
			expect(results).toEqual("published data");
		});
		it("should throw an error if AWS.IotData.publish() returns an error", async () => {
			let device = new Device(options, simulation, deviceInfo);
			iotMock.on(PublishCommand).rejects("error");
			try {
				await device._publishMessage("topic", {});
			} catch (err) {
				expect(err).toEqual(Error("error"));
			}
		});
	});
	describe("generateMessage()", function () {
		jest.clearAllMocks();
		it("should generate, publish, and clear every message in generator", async () => {
			Generator.mockImplementation(() => {
				return {
					generateMessagePayload: jest.fn(() => {
						return;
					}),
					messages: [{ first: "1" }, { second: "2" }],
					clearMessages: jest.fn(),
					isRunning: true,
				};
			});
			const device = new Device(options, simulation, deviceInfo);
			jest.spyOn(device, "_publishMessage").mockImplementation(async () => {
				return;
			});
			await device._generateMessage();
			expect(device.generator.generateMessagePayload).toHaveBeenCalledTimes(1);
			expect(device._publishMessage).toHaveBeenCalledTimes(2);
			expect(device.generator.clearMessages).toHaveBeenCalledTimes(1);
		});
		it("should stop device when duration has exceeded", async () => {
			Generator.mockImplementation(() => {
				return {
					generateMessagePayload: jest.fn(() => {
						return;
					}),
					messages: [{ first: "1" }, { second: "2" }],
					clearMessages: jest.fn(),
					isRunning: true,
				};
			});
			const realDateNow = Date.now.bind(Date);
			Date.now = jest.fn(() => "2020-05-13T12:33:37.000Z");
			const device = new Device(options, simulation, deviceInfo);
			jest.spyOn(device, "_publishMessage").mockImplementation(async () => {
				throw Error("error");
			});
			Date.now = jest.fn(() => "2020-05-13T12:33:50.000Z");
			await device._generateMessage();
			expect(device.stage).toEqual("sleeping");
			Date.now = realDateNow;
		});
		it("should throw error when one of the _publishMessage promises rejects", async () => {
			Generator.mockImplementation(() => {
				return {
					generateMessagePayload: jest.fn(() => {
						return;
					}),
					messages: [{ first: "1" }, { second: "2" }],
					clearMessages: jest.fn(),
					isRunning: true,
				};
			});
			const device = new Device(options, simulation, deviceInfo);
			jest.spyOn(device, "_publishMessage").mockImplementation(async () => {
				throw Error("error");
			});
			try {
				await device._generateMessage();
			} catch (err) {
				expect(err).toEqual(Error("error"));
			}
		});
	});
});
