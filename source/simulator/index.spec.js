// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

process.env.AWS_REGION = "us-east-1";
process.env.IOT_ENDPOINT = "endpoint.fake";
const Engine = require("./lib/engine/index");
let index = require("./index.js");
jest.mock("./lib/engine/index");

const simulation = {
	simId: "123",
	name: "abc",
	stage: "running",
	devices: [{ typeId: "456", name: "xyz", amount: 1 }],
	interval: 2,
	duration: 5,
};

const deviceInfo = {
	id: { S: "1234560" },
	typeId: { S: "456" },
	name: { S: "xyz" },
	topic: { S: "topic/test" },
	payload: {
		L: [{ S: "aString" }, { S: "string" }, { S: "2" }, { S: "4" }, { BOOL: false }],
	},
};

const device = {
	amount: 1,
	typeId: "456",
	info: { ...deviceInfo },
};

const devices = [device];
const context = {};

describe("index", function () {
	describe("restart", function () {
		it("should restart simulation for devices", async () => {
			const event = {
				options: {
					restart: true,
				},
				simulation: simulation,
				devices: devices,
			};
			await index.handler(event, context);
			expect(Engine.prototype.start).toBeCalled();
		});

		it("should start engine for each device type", async () => {
			const event = {
				options: {
					restart: false,
				},
				simulation: simulation,
				devices: devices,
			};
			await index.handler(event, context);
			expect(Engine.prototype.start).toBeCalled();
		});
	});
});
