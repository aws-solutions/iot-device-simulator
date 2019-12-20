/*********************************************************************************************************************
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

/**
 * @author Solution Builders
 */

'use strict';

let AccelerationCalc = require('./acceleration-calc.js');
let SpeedCalc = require('./speed-calc.js');
let GearCalc = require('./gear-calc.js');
let GearIntCalc = require('./gear-int-calc.js');
let TorqueCalc = require('./torque-calc.js');
let EngineSpeedCalc = require('./engine-speed-calc.js');
let FuelConsumedCalc = require('./fuel-consumed-calc.js');
let OdometerCalc = require('./odometer-calc.js');
let FuelLevelCalc = require('./fuel-level-calc.js');
let OilTempCalc = require('./oil-temp-calc.js');
let RouteCalc = require('./route-calc.js');
let HeadingCalc = require('./heading-calc.js');
let LatCalc = require('./lat-calc.js');
let LonCalc = require('./lon-calc.js');
let Aggregator = require('./aggregator-calc.js');

class DynamicsModel {
    // ..and an (optional) custom class constructor. If one is
    // not supplied, a default constructor is used instead:
    // constructor() { }
    constructor(params) {
        this._initialize_data(params);
        this.logger.log('Dynamics Model initialized');
    }

    _initialize_data(params) {
        this.logger = params.logger;
        this.pollerDelay = 500;

        let _route_params = {
            route: params.route,
            odometer: 0.0,
            logger: params.logger
        };

        this.calculations = [];
        this.calculations.push(new SpeedCalc());
        this.calculations.push(new AccelerationCalc());
        this.calculations.push(new GearCalc());
        this.calculations.push(new GearIntCalc());
        this.calculations.push(new TorqueCalc());
        this.calculations.push(new EngineSpeedCalc());
        this.calculations.push(new FuelConsumedCalc());
        this.calculations.push(new OdometerCalc());
        this.calculations.push(new FuelLevelCalc());
        this.calculations.push(new OilTempCalc());
        // this.calculations.push(new HeadingCalc());
        // this.calculations.push(new LatCalc());
        // this.calculations.push(new LonCalc());
        this.calculations.push(new RouteCalc(_route_params));

        this.aggregator = new Aggregator();

        this.snapshot = {};
        for (let i = 0; i < this.calculations.length; i++) {
            this.snapshot[this.calculations[i].name] = this.calculations[i].get();
        }

        this.accelerator = 0.0;
        this.brake = 0.0;
        this.steering_wheel_angle = 0.0;
        this.parking_brake_status = false;
        this.engine_running = true;
        this.ignition_data = 'run';
        this.gear_lever = 'drive';
        this.manual_trans_status = false;
        this._route = params.route;
        this.triggers = {};

        this.snapshot.accelerator_pedal_position = this.accelerator;
        this.snapshot.brake = this.brake;
        this.snapshot.steering_wheel_angle = this.steering_wheel_angle;
        this.snapshot.parking_brake_status = this.parking_brake_status;
        this.snapshot.engine_running = this.engine_running;
        this.snapshot.ignition_status = this.ignition_data;
        this.snapshot.brake_pedal_status = this.brake_pedal_status;
        this.snapshot.gear_lever_position = this.gear_lever;
        this.snapshot.manual_trans = this.manual_trans_status;
        this.snapshot.triggers = this.triggers;
    }

    start_physics_loop() {
        let _this = this;
        this.pollerInterval = setInterval(function () {
            _this._get_snapshot_data();
        }, _this.pollerDelay);
    }

    stop_physics_loop() {
        clearInterval(this.pollerInterval);
    }

    _get_snapshot_data() {
        let new_snapshot = {};
        let end = false;
        for (let i = 0; i < this.calculations.length; i++) {
            this.calculations[i].iterate(this.snapshot);
            new_snapshot[this.calculations[i].name] = this.calculations[i].get();
            if (this.calculations[i].name == 'route_stage') {
                new_snapshot.latitude = this.calculations[i].latitude;
                new_snapshot.longitude = this.calculations[i].longitude;
                new_snapshot.accelerator_pedal_position = this.calculations[i].throttle_position;
                new_snapshot.brake = this.calculations[i].brake_position;
                this.brake_pedal_status = this.calculations[i].brake_position > 0 ? true : false;
                if (this.calculations[i].route_ended) {
                    new_snapshot.route_duration = this.calculations[i].route_duration;
                    new_snapshot.route_ended = true;
                }

                if (this.calculations[i].dtc_code !== '') {
                    new_snapshot.dtc_code = this.calculations[i].dtc_code;
                }

                if (this.calculations[i].update_triggers) {
                    this.triggers = this.calculations[i].triggers;
                    this.logger.log(['Updating model triggers', JSON.stringify(this.triggers)].join(': '), this.logger.levels.ROBUST);
                }
            }
        }

        new_snapshot.steering_wheel_angle = this.steering_wheel_angle;
        new_snapshot.parking_brake_status = this.parking_brake_status;
        new_snapshot.engine_running = this.engine_running;
        new_snapshot.ignition_status = this.ignition_data;
        new_snapshot.brake_pedal_status = this.brake_pedal_status;
        new_snapshot.gear_lever_position = this.gear_lever;
        new_snapshot.manual_trans = this.manual_trans_status;
        new_snapshot.triggers = this.triggers;

        if (new_snapshot.route_ended) {
            this.stop_physics_loop();
        }

        this.snapshot = new_snapshot;
        this.aggregator.iterate(this.snapshot);
    }

    update_metrics_snapshot() {
        this._get_snapshot_data();
    }

    get aggregated_metrics() {
        return this.aggregator.get();
    }

    get engine_speed() {
        return this.snapshot.engine_speed;
    }

    get vehicle_speed() {
        return this.snapshot.vehicle_speed;
    }

    get route() {
        return this._route;
    }

};

module.exports = DynamicsModel;