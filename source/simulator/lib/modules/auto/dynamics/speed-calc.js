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

let DataCalc = require('./data-calc.js');
let moment = require('moment');

class SpeedCalc extends DataCalc {

    constructor() {
        super();
        this.data = 0.0;
        this.last_calc = moment();
        this.name = 'vehicle_speed';
    }

    iterate(snapshot) {
        let accelerator_percent = snapshot.accelerator_pedal_position;
        let brake = snapshot.brake;
        let parking_brake_status = snapshot.parking_brake_status;
        let ignition_status = snapshot.engine_running;
        let engine_speed = snapshot.engine_speed;
        let gear = snapshot.transmission_gear_int;

        // Any necessary data should be passed in
        let AIR_DRAG_COEFFICIENT = .000008;
        let ENGINE_DRAG_COEFFICIENT = 0.0004;
        let BRAKE_CONSTANT = 0.1;
        let ENGINE_V0_FORCE = 30; //units are cars * km / h / s
        let CAR_MASS = 1; //Specifically, one car.
        let speed = this.data; //Just to avoid confution

        let air_drag = speed * speed * speed * AIR_DRAG_COEFFICIENT;

        let engine_drag = engine_speed * ENGINE_DRAG_COEFFICIENT;

        let engine_force = 0.0;
        if (ignition_status) {
            //accelerator_percent is 0.0 to 100.0, not 0
            engine_force = (ENGINE_V0_FORCE * accelerator_percent / (50 * gear));
        }

        let acceleration = engine_force - air_drag - engine_drag - .1 - (brake * BRAKE_CONSTANT);

        if (parking_brake_status) {
            acceleration = acceleration - (BRAKE_CONSTANT * 100);
        }

        let current_time = moment();
        let time_delta = moment.duration(current_time.diff(this.last_calc));
        let time_step = time_delta.get('seconds') + (time_delta.get('milliseconds').toFixed(4) / 1000);
        this.last_calc = moment();

        let impulse = acceleration * time_step;
        if ((impulse + speed) < 0.0) {
            impulse = -speed;
        }

        this.data = speed + impulse;

    }

};

module.exports = SpeedCalc;
