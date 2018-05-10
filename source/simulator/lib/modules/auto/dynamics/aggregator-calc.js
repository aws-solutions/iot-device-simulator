/*********************************************************************************************************************
 *  Copyright 2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Amazon Software License (the "License"). You may not use this file except in compliance        *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://aws.amazon.com/asl/                                                                                    *
 *                                                                                                                    *
 *  or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

/**
 * @author Solution Builders
 */

'use strict';

let DataCalc = require('./data-calc.js');
let moment = require('moment');

class AggregatorCalc extends DataCalc {

    constructor() {
        super();
        this.name = 'aggregation';
        this._initialize_data();
    }

    _initialize_data() {
        this.last_calc = moment();
        this.last_accel_calc = moment();
        this.accel_start_speed = 0.0;

        this.data = {
            vehicle_speed_mean: 0.0,
            engine_speed_mean: 0.0,
            torque_at_transmission_mean: 0.0,
            oil_temp_mean: 0.0,
            accelerator_pedal_position_mean: 0.0,
            brake_mean: 0.0,
            high_speed_duration: 0,
            high_acceleration_event: 0,
            high_braking_event: 0,
            idle_duration: 0,
            start_time: moment()
        };
        this.measures = [{
            name: 'vehicle_speed',
            mean: true,
            cnt: 0
        }, {
            name: 'engine_speed',
            mean: true,
            cnt: 0
        }, {
            name: 'torque_at_transmission',
            mean: true,
            cnt: 0
        }, {
            name: 'oil_temp',
            mean: true,
            cnt: 0
        }, {
            name: 'accelerator_pedal_position',
            mean: true,
            cnt: 0
        }, {
            name: 'brake',
            mean: true,
            cnt: 0
        }, {
            name: 'ignition_status'
        }, {
            name: 'brake_pedal_status'
        }, {
            name: 'transmission_gear_position'
        }, {
            name: 'odometer'
        }, {
            name: 'fuel_level'
        }, {
            name: 'fuel_consumed_since_restart'
        }, {
            name: 'latitude'
        }, {
            name: 'longitude'
        }];
    }

    reset() {
        this._initialize_data();
    }

    iterate(snapshot) {
        let _current_time = moment();
        let _time_delta = _current_time.diff(this.last_calc);
        let _accel_time_delta = _current_time.diff(this.last_accel_calc);

        for (let i = 0; i < this.measures.length; i++) {
            if (this.measures[i].mean) {
                let _name = [this.measures[i].name, 'mean'].join('_');
                this.data[_name] = this._getMean(this.data[_name], snapshot[this.measures[i].name], this.measures[i].cnt);
                this.measures[i].cnt++;
            } else {
                this.data[this.measures[i].name] = snapshot[this.measures[i].name];
            }

            if (this.measures[i].name === 'vehicle_speed') {
                if (snapshot.vehicle_speed > 112.6) {
                    this.data.high_speed_duration += _time_delta;
                    // console.log(['high speed trigger', snapshot.vehicle_speed, this.data.high_speed_duration]);
                }

                if (snapshot.ignition_status === 'run' && snapshot.vehicle_speed <= 1.0) {
                    this.data.idle_duration += _time_delta;
                    // console.log(['idle trigger', snapshot.vehicle_speed, this.data.idle_duration]);
                }

                if (_accel_time_delta >= 1000) {
                    let _period = moment.duration(_accel_time_delta).asSeconds();
                    let _accel = this._getAcceleration(this.accel_start_speed, snapshot.vehicle_speed, _period);
                    if (_accel >= 12) {
                        this.data.high_acceleration_event++;
                        // console.log('high_acceleration_event', this.data.high_acceleration_event);
                    }

                    if (snapshot.brake > 0.0 && _accel < -16.0) {
                        this.data.high_braking_event++;
                    }

                    this.accel_start_speed = snapshot.vehicle_speed;
                    this.last_accel_calc = moment();
                }

            }

        };

        if (snapshot.ignition_status === 'off') {
            this.data.end_time = moment();
        }

        this.last_calc = moment();
    }

    // Returns the new average after including x
    _getMean(prev_avg, new_val, cnt) {
        return ((prev_avg * cnt) + new_val) / (cnt + 1);
    }

    // Returns the acceleration in km/hr/sec
    _getAcceleration(start_speed, end_speed, period) {
        return (end_speed - start_speed) / period;
    }

};

module.exports = AggregatorCalc;
