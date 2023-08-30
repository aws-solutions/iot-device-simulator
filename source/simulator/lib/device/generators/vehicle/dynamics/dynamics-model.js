// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @author Solution Builders
 */

"use strict";

const AccelerationCalc = require("./acceleration-calc.js");
const SpeedCalc = require("./speed-calc.js");
const GearCalc = require("./gear-calc.js");
const GearIntCalc = require("./gear-int-calc.js");
const TorqueCalc = require("./torque-calc.js");
const EngineSpeedCalc = require("./engine-speed-calc.js");
const FuelConsumedCalc = require("./fuel-consumed-calc.js");
const OdometerCalc = require("./odometer-calc.js");
const FuelLevelCalc = require("./fuel-level-calc.js");
const OilTempCalc = require("./oil-temp-calc.js");
const RouteCalc = require("./route-calc.js");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { customAlphabet } = require("nanoid");
const moment = require("moment");
const { SOLUTION_ID, VERSION } = process.env;
let options = {};
if (SOLUTION_ID && VERSION && SOLUTION_ID.trim() && VERSION.trim()) {
	const solutionUserAgent = `AwsSolution/${SOLUTION_ID}/${VERSION}`;
	const capability = `AwsSolution-Capability/${SOLUTION_ID}-C004/${VERSION}`;
	options.customUserAgent = [[`${solutionUserAgent}`], [`${capability}`]];
}
const s3 = new S3Client(options);

/**
 * Simulator for vehicle data
 * @class Dynamics Model
 */
class DynamicsModel {
	constructor(params) {
		this._initializeData(params);
	}

	/**
	 * Initializes data for class
	 * @param {object} params
	 */
	async _initializeData(params) {
		this.pollerDelay = 500;
		this.snapshot = params.snapshot;
		this.routeParams = await this.getRoute(this.snapshot);
		this.calculations = [];
		this.calculations.push(new SpeedCalc(this.snapshot));
		this.calculations.push(new AccelerationCalc(this.snapshot));
		this.calculations.push(new GearCalc(this.snapshot));
		this.calculations.push(new GearIntCalc(this.snapshot));
		this.calculations.push(new TorqueCalc(this.snapshot));
		this.calculations.push(new EngineSpeedCalc(this.snapshot));
		this.calculations.push(new FuelConsumedCalc(this.snapshot));
		this.calculations.push(new OdometerCalc(this.snapshot));
		this.calculations.push(new FuelLevelCalc(this.snapshot));
		this.calculations.push(new OilTempCalc(this.snapshot));
		this.calculations.push(new RouteCalc(this.routeParams, this.snapshot));
		//add initial calulationdata to snapshot
		for (let calculation of this.calculations) {
			//Add back data from previous lambda if available
			if (this.snapshot[calculation.name]) {
				calculation.put(this.snapshot[calculation.name]);
			} else {
				this.snapshot[calculation.name] = calculation.get();
			}
		}
		this.accelerator = this.snapshot.acceleratorPedalPosition || 0.0;
		this.brake = this.snapshot.brake || 0.0;
		this.steeringWheelAngle = this.snapshot.steeringWheelAngle || 0.0;
		this.parkingBrakeStatus = !!this.snapshot.parkingBrakeStatus;
		this.engineRunning = this.snapshot.engineRunning || true;
		this.ignitionData = this.snapshot.ignitionStatus || "run";
		this.gearLever = this.snapshot.gearLeverPosition || "drive";
		this.manualTransStatus = !!this.snapshot.manualTrans;
		this.triggers = {};

		this.snapshot.acceleratorPedalPosition = this.accelerator;
		this.snapshot.brake = this.brake;
		this.snapshot.steeringWheelAngle = this.steeringWheelAngle;
		this.snapshot.parkingBrakeStatus = this.parkingBrakeStatus;
		this.snapshot.engineRunning = this.engineRunning;
		this.snapshot.ignitionStatus = this.ignitionData;
		this.snapshot.brakePedalStatus = this.brakePedalStatus;
		this.snapshot.gearLeverPosition = this.gearLever;
		this.snapshot.manualTrans = this.manualTransStatus;
		this.snapshot.triggers = this.triggers;
		//start calculating vehicle data
		this.startPhysicsLoop();
	}

	/**
	 * Get random route to run from S3 or get previous route
	 * from last lambda iteration
	 * @param {object} snapshot
	 * @returns relevant route information
	 */
	async getRoute(snapshot) {
		//Select random route
		let route = customAlphabet("abcdefghijklmnopq", 1)();
		let routeName = snapshot.routeInfo?.routeName || `route-${route}.json`;
		let params = {
			Bucket: process.env.ROUTE_BUCKET,
			Key: routeName,
		};

		try {
			let data = await s3.send(new GetObjectCommand(params));
			const readableStream = Buffer.concat(await data.Body.toArray());
			return {
				routeName: routeName,
				odometer: snapshot.odometer || 0,
				routeStage: snapshot.routeInfo?.routeStage || 0,
				burndown: !!snapshot.routeInfo?.burndown,
				burndownCalc: snapshot.routeInfo?.burndownCalc || moment().toISOString(),
				routeEnded: !!snapshot.routeEnded,
				route: JSON.parse(readableStream),
				randomTriggers: snapshot.routeInfo?.randomTriggers,
			};
		} catch (err) {
			console.error("Error while getting route", err);
			throw err;
		}
	}

	/**
	 * Start the phsyics loop
	 * Calculates simulated vehicle data every 0.5ms
	 */
	startPhysicsLoop() {
		let _this = this;
		this.pollerInterval = setInterval(function () {
			_this._getSnapshotData();
		}, _this.pollerDelay);
	}

	/**
	 * stops the timer for calculating simulated vechile data
	 */
	stopPhysicsLoop() {
		clearInterval(this.pollerInterval);
	}

	/**
	 * Updates the snapshot with the newest data
	 */
	_getSnapshotData() {
		let newSnapshot = {};
		//For each calculation, calculate new data, then update snapshot
		for (let calculation of this.calculations) {
			//calculate new data
			calculation.iterate(this.snapshot);
			newSnapshot[calculation.name] = calculation.get();
			//aggregate necessary route info into single object
			if (calculation.name === "routeInfo") {
				newSnapshot.latitude = calculation.latitude;
				newSnapshot.longitude = calculation.longitude;
				newSnapshot.acceleratorPedalPosition = calculation.throttlePosition;
				newSnapshot.brake = calculation.brakePosition;
				this.brakePedalStatus = calculation.brakePosition > 0;
				//check if route has ended
				if (calculation.routeEnded) {
					newSnapshot.routeDuration = calculation.routeDuration;
					newSnapshot.routeEnded = true;
				}
				//check if random triggers were triggered
				if (calculation.updateTriggers) {
					this.triggers = calculation.triggers;
				}
			}
		}
		newSnapshot.steeringWheelAngle = this.steeringWheelAngle;
		newSnapshot.parkingBrakeStatus = this.parkingBrakeStatus;
		newSnapshot.engineRunning = this.engineRunning;
		newSnapshot.ignitionStatus = this.ignitionData;
		newSnapshot.brakePedalStatus = this.brakePedalStatus;
		newSnapshot.gearLeverPosition = this.gearLever;
		newSnapshot.manualTrans = this.manualTransStatus;
		newSnapshot.triggers = this.triggers;
		//if route ended, clear timer for calculating vehicle data
		if (newSnapshot.routeEnded) {
			this.stopPhysicsLoop();
		}
		//update the snapshot
		this.snapshot = newSnapshot;
	}

	get engineSpeed() {
		return this.snapshot.engineSpeed;
	}

	get vehicleSpeed() {
		return this.snapshot.vehicleSpeed;
	}
}

module.exports = DynamicsModel;
