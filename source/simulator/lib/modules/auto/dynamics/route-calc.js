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

class RouteCalc extends DataCalc {

    constructor(params) {
        super();
        this.data = 0.0;
        this.name = 'route_stage';
        this._initialize_data(params);
    }

    _initialize_data(params) {
        this.last_calc = moment();
        this.last_jitter_calc = moment();
        this._last_throttle_calc = moment();
        this._last_brake_calc = moment();
        this._last_burndown_calc = moment();
        this._throttle_adj_duration = this._get_random_throttle_adj_period();
        this._random_triggers = this._get_random_triggers(params.route);
        this.current_stage = 0;
        this._cur_throttle_position = this._get_random_start_speed(params.route.profile);
        this._throttle_position = this._cur_throttle_position;
        this._brake_position = 0.0;
        this._route_duration = 0;
        this._route_ended = false;
        this._burndown = false;
        this._dtc_sent = false;
        this._update_triggers = false;
        this._triggers = {};
        this.route = params.route;
        this.route.stages[this.current_stage].odometer_start = params.odometer;
        this.route.stages[this.current_stage].route_start = moment();
        this.latitude = this.route.stages[this.current_stage].start[1];
        this.longitude = this.route.stages[this.current_stage].start[0];
        this._dtc_code = '';
        this.logger = params.logger;

        // static jitter values
        this.jitter_period = 7000;
        this.throttle_jitter = 4;

    }

    get throttle_position() {
        return this._throttle_position;
    }

    get brake_position() {
        return this._brake_position;
    }

    get route_duration() {
        return this._route_duration;
    }

    get route_ended() {
        return this._route_ended;
    }

    get dtc_code() {
        return this._dtc_code;
    }

    get update_triggers() {
        return this._update_triggers;
    }

    get triggers() {
        return this._triggers;
    }

    iterate(snapshot) {
        let _odometer = snapshot.odometer;
        let _move_stage = false;
        let _current_time = moment();
        this._update_triggers = false;

        if (!this._route_ended) {

            if (!this._burndown) {
                let _milage = this.route.stages[this.current_stage].odometer_start +
                    this.route.stages[this.current_stage].km;

                if ((_milage) <= _odometer) {
                    // met or suprassed milage for stage, move to next stage
                    _move_stage = true;
                }

                // check for throttle adjustment
                let _throttle_time_delta = _current_time.diff(this._last_throttle_calc);
                if (this._throttle_adj_duration <= _throttle_time_delta) {
                    this._cur_throttle_position = this._cur_throttle_position + this._get_random_throttle_position(this.route
                        .profile);

                    if (this._cur_throttle_position >= 100) {
                        this._cur_throttle_position = 99;
                    }

                    if (this._cur_throttle_position < 0) {
                        this._cur_throttle_position = 5;
                    }

                    this._brake_position = 0.0;
                    this._throttle_position = this._cur_throttle_position;
                    this._throttle_adj_duration = this._get_random_throttle_adj_period();
                    this._last_throttle_calc = moment();
                }

                for (let j = 0; j < this._random_triggers.length; j++) {
                    if (_odometer >= this._random_triggers[j].km) {
                        if (this._random_triggers[j].type === 'brake' && !this._random_triggers[j].triggered) {
                            this._throttle_position = 0.0;
                            this._brake_position = 100.0;
                            this._random_triggers[j].triggered = true;
                        }

                        if (this._random_triggers[j].type === 'dtc' && !this._random_triggers[j].triggered) {
                            this._dtc_code = this._get_random_dtc();
                            this._dtc_sent = true;
                            this.logger.log(['DTC triggered', this._dtc_code].join(': '), this.logger.levels.ROBUST);
                            this._random_triggers[j].triggered = true;
                        }

                        if (this._random_triggers[j].type === 'oiltemp' && !this._random_triggers[j].triggered) {
                            // update to inculde new triggers
                            this._triggers = {
                                high_oil_temp: true
                            };
                            this._update_triggers = true;
                            this._random_triggers[j].triggered = true;
                        }
                    }
                }

                if (_move_stage) {
                    //transition to next stage in route
                    this.current_stage++;
                    if (this.current_stage < this.route.stages.length) {
                        //initialize the new stage
                        this.route.stages[this.current_stage].odometer_start = _odometer;
                        this.latitude = this.route.stages[this.current_stage].start[1];
                        this.longitude = this.route.stages[this.current_stage].start[0];
                        this.last_calc = moment();

                        if (this.route.stages[this.current_stage].triggers) {
                            // update to inculde new triggers
                            this._triggers = this.route.stages[this.current_stage].triggers;
                            this._update_triggers = true;
                        }
                    } else {
                        this._burndown = true;
                        this._last_burndown_calc = moment();
                    }
                }
            } else {
                //set end of route flag
                this._throttle_position = 0.0;
                this._brake_position = 100.0;
                let _end_time_delta = _current_time.diff(this._last_burndown_calc);
                if (_end_time_delta >= 20000) {
                    this._route_ended = true;
                    this._burndown = false;
                    this.latitude = this.route.stages[this.current_stage - 1].end[1];
                    this.longitude = this.route.stages[this.current_stage - 1].end[0];
                }
            }

            if (this._route_ended) {
                let _route_delta = moment.duration(_current_time.diff(this.route.stages[0].route_start));
                this._route_duration = _route_delta;
                this._cur_throttle_position = 0.0
                this._throttle_position = 0.0;
                this._brake_position = 0.0;
            } else {
                let _jitter_time_delta = _current_time.diff(this.last_jitter_calc);
                if (this.jitter_period <= _jitter_time_delta) {
                    // met or surpassed duration for jitter, set random throttle position
                    if (this._throttle_position !== 0 && this._throttle_position !== 100 &&
                        this._brake_position === 0) {
                        this._throttle_position = this._get_jitter_position(
                            this._cur_throttle_position,
                            this.throttle_jitter
                        );
                    }

                    this.last_jitter_calc = moment();
                }

                this.data = this.current_stage;
            }
        }

    }

    _get_random_triggers(route) {
        let _triggers = [];
        let _upper = route.km;
        let _lower = 0.2;

        if (route.triggers) {
            for (let i = 0; i < route.triggers.length; i++) {
                for (let j = 0; j < route.triggers[i].occurances; j++) {
                    let _rand = (Math.random() * (_upper - _lower) + _lower).toFixed(1);
                    _triggers.push({
                        type: route.triggers[i].type,
                        km: Math.round(_rand * 100) / 100,
                        triggered: false
                    });
                }
            }
        }

        return _triggers;
    }

    _get_random_start_speed(profile) {
        let _triggers = [];
        let _upper = 40.0;
        let _lower = 10.0;

        if (profile === 'aggressive') {
            _lower = 20;
            let _upper = 50.0;
        }

        let _rand = Math.random() * (_upper - _lower) + _lower;
        return _rand;
    }

    _get_random_throttle_position(profile) {
        let _normal = [2, 2, 2, 2, 2, 2, 2, 2, 2, 25, 5, 5, 5, 5, 5, 5, 5, 5, 5, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 8, 8,
            8, 8, 8, 8, 8, 8, 8, 8, 15,
            15, 15, 15, 20, 20
        ];
        let _aggressive = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 15, 15, 15,
            15,
            15, 15, 15, 15, 15, 15, 20, 20, 20, 20, 20, 20, 20, 20, 25, 25, 25, 25
        ];
        let _upper = _normal.length;
        let _lower = 0;

        if (profile === 'aggressive') {
            _upper = _aggressive.length;
        }

        let _rand_multiplier = Math.floor(Math.random() * (2 - 0)) + 1;
        let _multipler = _rand_multiplier === 2 ? -1 : 1;
        let _rand = Math.floor(Math.random() * (_upper - _lower)) + _lower;
        return _multipler * (profile === 'aggressive' ? _aggressive[_rand] : _normal[_rand]);
    }

    _get_random_throttle_adj_period() {
        let _upper = 60000;
        let _lower = 30000;

        let _rand = Math.floor(Math.random() * (_upper - _lower)) + _lower;
        return _rand;
    }

    _get_random_dtc() {
        let _codes = require('./diagnostic-trouble-codes.js');
        let _rand = Math.floor(Math.random() * (_codes.length - 0)) + 0;
        return _codes[_rand];
    }

    _get_jitter_position(stage_position, jitter) {
        let _upper = stage_position + jitter;
        if (_upper > 100.0) {
            _upper = 100.0;
        }

        let _lower = 0.0;
        if (stage_position === 0.0) {
            _lower = 0.0;
        } else {
            _lower = stage_position - jitter;
            if (_lower < 0.0) {
                _lower = 0.0;
            }
        }

        let _rand = Math.floor(Math.random() * (_upper - _lower)) + _lower;
        return _rand;
    }

};

module.exports = RouteCalc;