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

class LatCalc extends DataCalc {

    constructor() {
        super();
        this.data = 42.292834;
        this.last_calc = moment();
        this.earth_circumference_km = 40075.0;
        this.km_per_deg = this.earth_circumference_km / 360.0;
        this.name = 'latitude';
    }

    iterate(snapshot) {
        let vehicle_speed = snapshot.vehicle_speed;
        let heading = snapshot.heading;

        let current_time = moment();
        let time_delta = moment.duration(current_time.diff(this.last_calc));
        let time_step = time_delta.get('seconds') + (time_delta.get('milliseconds').toFixed(4) / 1000);
        this.last_calc = moment();

        let distance = time_step * (vehicle_speed / 3600); // Time * km / s.

        let N_S_dist = distance * Math.cos(heading);
        let delta_lat = N_S_dist / this.km_per_deg;

        this.data = this.data + delta_lat;

    }

};

module.exports = LatCalc;
