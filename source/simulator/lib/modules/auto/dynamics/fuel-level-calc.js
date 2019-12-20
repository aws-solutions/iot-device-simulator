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

class FuelLevelCalc extends DataCalc {

    constructor() {
        super();
        this.data = 0.0;
        this.tank_size = 40.0; //liters
        this.name = 'fuel_level';
    }

    iterate(snapshot) {
        let fuel_consumed = snapshot['fuel_consumed_since_restart']

        this.data = 100.0 * (this.tank_size - fuel_consumed) / this.tank_size;
    }

};

module.exports = FuelLevelCalc;
