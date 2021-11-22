// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @author Solution Builders
 */

'use strict';

const DataCalc = require('./data-calc.js');

class EngineSpeedCalc extends DataCalc {

    constructor() {
        super();
        this.data = 0;
        this.name = 'engineSpeed';
    }

    iterate(snapshot) {
        let vehicleSpeed = snapshot['vehicleSpeed'];
        let gear = snapshot['transmissionGearInt'];
        this.data = 16382 * vehicleSpeed / (100.0 * gear);
    }

}

module.exports = EngineSpeedCalc;
