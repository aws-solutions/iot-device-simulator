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

class GearIntCalc extends DataCalc {

    constructor() {
        super();
        this.speeds = [
            [0, 0],
            [0, 25],
            [20, 50],
            [45, 75],
            [70, 100],
            [95, 125],
            [120, 500]
        ];
        this.data = 1;
        this.name = 'transmission_gear_int';
    }

    shift_up() {
        this.data = this.data + 1;
        if (this.data > 6) {
            this.data = 6;
        }
    }

    shift_down() {
        this.data = this.data - 1;
        if (this.data < 1) {
            this.data = 1;
        }
    }

    iterate(snapshot) {
        let manual = snapshot['manual_trans'];
        let vehicle_speed = snapshot['vehicle_speed'];
        let engine_running = snapshot['engine_running'];

        if (!manual) {
            if (vehicle_speed < this.speeds[this.data][0]) {
                this.data = this.data - 1;
            } else if (vehicle_speed > this.speeds[this.data][1]) {
                this.data = this.data + 1;
            }
        }
    }

};

module.exports = GearIntCalc;
