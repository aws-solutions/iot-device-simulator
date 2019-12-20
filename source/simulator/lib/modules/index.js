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
 * Viperlight is a customized derivative of the open source project Hawkeye [https://github.com/Stono/hawkeye].
 */

/**
 * @author Solution Builders
 */

'use strict';
const glob = require('glob');
const path = require('path');
const util = require('../util');
const fs = require('fs');
const Logger = require('../logger');
require('colors');

module.exports = function Modules(options) {
    options = util.defaultValue(options, {});
    console.log(options)
    options.logger = new Logger(options.loggingLevel);
    options.logger.setLoggingLevel(options.loggingLevel);

    const pathToModules = path.join(__dirname, '*/**/index.js');
    const files = glob.sync(pathToModules);
    const modules = {
        byId: {},
        asArray: []
    };

    files.forEach(file => {
        const Constructor = require(file);
        const instance = new Constructor(options);
        options.logger.log([instance.name.bold, 'dynamically loaded'].join(' '), options.logger.levels.ROBUST);
        modules[Constructor.name] = Constructor;
        modules.byId[instance.key] = instance;
        modules.asArray.push(instance);
    });

    return Object.freeze(modules);
};