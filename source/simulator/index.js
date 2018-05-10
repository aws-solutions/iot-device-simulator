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
const util = require('./lib/util');
const Engine = require('./lib/engine');
const colors = require('colors');
const moment = require('moment');

let rc = {};
rc = util.defaultValue(rc, {});

util.loadConfigValues('simulator').then((config) => {
    console.log(moment.utc().format('YYYY-MM-DD HH:mm:ss'), ' : ', '[info] ', `Simulator conifguration loaded...`.bold);
    rc.loggingLevel = util.getConfigValue(config.setting, 'loggingLevel');
    rc.targetIotRegion = util.getConfigValue(config.setting, 'targetIotRegion');
    rc.deviceTable = util.getConfigValue(config.setting, 'deviceTable');
    rc.deviceTypeTable = util.getConfigValue(config.setting, 'deviceTypeTable');
    rc.anonymousData = util.getConfigValue(config.setting, 'anonymousData');
    rc.queuePollerInterval = util.getConfigValue(config.setting, 'queuePollerInterval');
    rc.deviceQueueUrl = util.getConfigValue(config.setting, 'deviceQueueUrl');
    rc.region = util.getConfigValue(config.setting, 'region');
    rc.garbageCollectionInterval = util.getConfigValue(config.setting, 'garbageCollectionInterval');
    rc.metricsTable = util.getConfigValue(config.setting, 'metricsTable');
    rc.uuid = util.getConfigValue(config.setting, 'uuid');
    rc.settingsTable = util.getHardConfigValue('SETTINGS_TABLE');
    rc.simLimit = util.getHardConfigValue('SIM_LIMIT');

    util.getIotEndpoint(rc.targetIotRegion).then((endpoint) => {
        // create engine instance and start
        console.log(moment.utc().format('YYYY-MM-DD HH:mm:ss'), ' : ', `[info] The retrieved target IoT endpoint ${endpoint} for ${rc.targetIotRegion}`);
        rc.iotEndpoint = endpoint;
        let engine = new Engine(rc);
        engine.start();
    }).catch((err2) => {
        // create engine instance and start
        console.log(moment.utc().format('YYYY-MM-DD HH:mm:ss'), ' : ', `[critical] Unable to retrieve the IoT endpoint for the target region ${rc.targetIotRegion}`);
        rc.iotEndpoint = '';
        let engine = new Engine(rc);
        engine.start();
    });

}).catch((err) => {
    console.log(moment.utc().format('YYYY-MM-DD HH:mm:ss'), ' : ', '[info] ', err);
});