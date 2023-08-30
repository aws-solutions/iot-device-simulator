// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @author Solution Builders
 */

'use strict';

class DataCalc {

    constructor() {
        this.data = 0;
        this.name = 'data';
    }

    get() {
        return this.data;
    }

    put(newValue) {
        this.data = newValue;
    }

    /**
     * abstract function to be implemented in classes that extend data-calc
     * @param {*} data 
     */
    iterate(data) {
        //This is intentional abstract function to be implemented in classes that extend data-calc
    }

}

module.exports = DataCalc;
