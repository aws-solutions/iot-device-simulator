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

class HeadingCalc extends DataCalc {

    constructor() {
        super();
        this.data = 0.0;
        this.last_calc = moment();
        this.name = 'heading';
    }

    iterate(snapshot) {
        let vehicle_speed = snapshot.vehicle_speed;
        let steering_wheel_angle = snapshot.steering_wheel_angle;

        // 600 degree steering == 45 degree wheels.
        let wheel_angle = steering_wheel_angle / 13.33;
        let wheel_angle_rad = wheel_angle * Math.PI / 180;
        let calc_angle = -wheel_angle_rad;
        if (wheel_angle < 0) {
            calc_angle = calc_angle - (Math.PI / 2);
        } else {
            calc_angle = calc_angle + (Math.PI / 2);
        }

        // should return number between 28 m and infinity
        let turning_circumference_km = 0.028 * Math.tan(calc_angle);

        let current_time = moment();
        let time_delta = moment.duration(current_time.diff(this.last_calc));
        let time_step = time_delta.get('seconds') + (time_delta.get('milliseconds').toFixed(4) / 1000);
        this.last_calc = moment();

        let distance = time_step * (vehicle_speed / 3600); // Time * km / s.

        let delta_heading = (distance / turning_circumference_km) * 2 * Math.PI;
        let temp_heading = this.data + delta_heading;
        while (temp_heading >= (2 * Math.PI)) {
            temp_heading = temp_heading - (2 * Math.PI);
        }

        while (temp_heading < 0) {
            temp_heading = temp_heading + (2 * Math.PI);
        }

        this.data = temp_heading;
    }

};

module.exports = HeadingCalc;
