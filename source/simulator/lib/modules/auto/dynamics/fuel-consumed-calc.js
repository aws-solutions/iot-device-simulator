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

class FuelConsumedCalc extends DataCalc {

    constructor() {
        super();
        this.data = 0.0;
        this.last_calc = moment();
        this.max_fuel = 0.0015; // #In liters per second at full throttle.
        this.idle_fuel = 0.000015;
        this.name = 'fuel_consumed_since_restart';
    }

    iterate(snapshot) {
        let accelerator_percent = snapshot['accelerator_pedal_position'];
        let ignition_status = snapshot['engine_running'];

        let current_time = moment();
        let time_delta = moment.duration(current_time.diff(this.last_calc));
        let time_step = time_delta.get('seconds') + (time_delta.get('milliseconds').toFixed(4) / 1000);
        this.last_calc = moment();

        if (ignition_status) {
            this.data = this.data + this.idle_fuel + (this.max_fuel * (accelerator_percent / 100) * time_step);
        }
    }

};

module.exports = FuelConsumedCalc;
