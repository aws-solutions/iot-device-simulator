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

class TorqueCalc extends DataCalc {

    constructor() {
        super();
        this.data = 0.0;
        this.engine_to_torque = 500.0 / 16382.0;
        this.name = 'torque_at_transmission';
        this.gear_numbers = {
            'neutral': 0,
            'first': 1,
            'second': 2,
            'third': 3,
            'fourth': 4,
            'fifth': 5,
            'sixth': 6
        };
    }

    iterate(snapshot) {
        let accelerator = snapshot['accelerator_pedal_position'];
        let engine_speed = snapshot['engine_speed'];
        let engine_running = snapshot['engine_running'];
        let gear_number = this.gear_numbers[snapshot['transmission_gear_position']];
        gear_number = gear_number - 1; //First gear is the basline.

        if (gear_number < 1) {
            gear_number = 1;
        }

        // Giving sixth gear half the torque of first.
        let gear_ratio = 1 - (gear_number * .1);

        let drag = engine_speed * this.engine_to_torque;
        let power = accelerator * 15 * gear_ratio;

        if (engine_running) {
            this.data = power - drag;
        } else {
            this.data = -drag;
        }
    }

};

module.exports = TorqueCalc;
