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

class OdometerCalc extends DataCalc {
    // ..and an (optional) custom class constructor. If one is
    // not supplied, a default constructor is used instead:
    // constructor() { }
    constructor() {
        super();
        this.data = 0.0;
        this.last_calc = moment();
        this.KPH_to_KPS = 60 * 60;
        this.name = 'odometer';
    }

    iterate(snapshot) {
        let vehicle_speed = snapshot['vehicle_speed'] // Any necessary data should be passed in

        let current_time = moment();
        let time_delta = moment.duration(current_time.diff(this.last_calc));
        let time_step = time_delta.get('seconds') + (time_delta.get('milliseconds').toFixed(4) / 1000);
        this.last_calc = moment();

        this.data = this.data + (vehicle_speed * time_step / this.KPH_to_KPS);
    }

};

module.exports = OdometerCalc;
