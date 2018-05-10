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

class LonCalc extends DataCalc {

    constructor() {
        super();
        this.data = 42.292834;
        this.last_calc = moment();
        this.earth_circumference_equator_km = 40075.0;
        this.km_per_deg_equator = this.earth_circumference_equator_km / 360.0;
        this.name = 'longitude';
    }

    iterate(snapshot) {
        let vehicle_speed = snapshot.vehicle_speed;
        let heading = snapshot.heading;
        let lat = snapshot.latitude;

        let current_time = moment();
        let time_delta = moment.duration(current_time.diff(this.last_calc));
        let time_step = time_delta.get('seconds') + (time_delta.get('milliseconds').toFixed(4) / 1000);
        this.last_calc = moment();

        let distance = time_step * (vehicle_speed / 3600); // Time * km / s.
        let E_W_dist = distance * Math.sin(heading);
        let lat_rad = lat * Math.PI / 180;
        let km_per_deg = Math.abs(this.km_per_deg_equator * Math.sin(lat_rad));

        let delta_lon = E_W_dist / km_per_deg;
        let new_lon = this.data + delta_lon;
        while (new_lon >= 180.0) {
            new_lon = new_lon - 360;
        }

        while (new_lon < -180) {
            new_lon = new_lon + 360;
        }

        this.data = new_lon;

    }

};

module.exports = LonCalc;
