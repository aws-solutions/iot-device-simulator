// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @author Solution Builders
 */

'use strict';

const DataCalc = require('./data-calc.js');

class GearCalc extends DataCalc {

    constructor() {
        super();
        this.gears = ['neutral', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth'];
        this.data = this.gears[0];
        this.name = 'transmissionGearPosition';
    }

    iterate(snapshot) {
        let gear = snapshot['transmissionGearInt'];
        this.data = this.gears[gear];
    }

}

module.exports = GearCalc;
