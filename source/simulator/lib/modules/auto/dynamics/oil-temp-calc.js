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

class OilTempCalc extends DataCalc {

    constructor() {
        super();
        this.data = 0;
        this.last_calc = moment();
        this.total_time = 0;
        this.operating_zone = 0.0;
        this.trigger_tripped = false;
        this.name = 'oil_temp';
    }

    iterate(snapshot) {

        let TEMP_COEFFICIENT = 2.0417;
        let _snapshot_triggers = snapshot.triggers;

        let _current_time = moment();
        let _time_delta = moment.duration(_current_time.diff(this.last_calc));
        let _time_step = _time_delta.get('seconds') + (_time_delta.get('milliseconds').toFixed(4) / 1000);
        this.last_calc = moment();
        this.total_time = this.total_time + _time_step;

        if (this.total_time <= 120 && !_snapshot_triggers.high_oil_temp) {
            let _oiltemp = _time_step * TEMP_COEFFICIENT; // Time * degree/sec.
            this.data = this.data + _oiltemp;
            this.operating_zone = this.data;
        } else {
            // normal oil temp jitter
            let _upper = this.operating_zone + 5;
            let _lower = this.operating_zone - 5;
            this.data = (Math.random() * (_upper - _lower) + _lower);
        }

        if (_snapshot_triggers) {
            if (_snapshot_triggers.high_oil_temp && !this.trigger_tripped) {
                this.operating_zone = this._get_high_temp();
                this.trigger_tripped = true;
            }
        }
    }

    _get_high_temp() {
        let _rand = Math.floor(Math.random() * (320 - 275)) + 275;
        return _rand;
    }

};

module.exports = OilTempCalc;
