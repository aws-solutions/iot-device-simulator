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

class AccelerationCalc extends DataCalc {

    constructor() {
        super();
        this.data = 0;
        this.last_calc = moment();
        this.start_speed = 0.0;
        this.name = 'acceleration';
    }

    iterate(snapshot) {

        let ACCEL_PERIOD = 1000; // one second
        let _cur_speed = snapshot.vehicle_speed;

        let _current_time = moment();
        let _time_delta = _current_time.diff(this.last_calc);

        if (_time_delta >= ACCEL_PERIOD) {
            let _accel = (_cur_speed - this.start_speed) / 1; // speed difference / 1 sec = km/h/s
            // let _accel = ((_cur_speed - this.start_speed) / _time_delta) * 1000;
            this.start_speed = _cur_speed;
            this.data = _accel;
            this.last_calc = moment();
        }

    }

};

module.exports = AccelerationCalc;
