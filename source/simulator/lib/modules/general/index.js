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
const Widget = require('./widget.js');
let WidgetFactory = require('./widget-factory');
let SimController = require('../sim-controller');
const _ = require('underscore');

// Logging class for sending messages to console log
class General extends SimController {

    constructor(options) {
        super(options);
        this.key = 'widget';
        this.name = 'Widget Simulation Controller';
        this.description = 'Creates random data for a custom defined payload';
        this.enabled = true;
        this.widgetFactory = new WidgetFactory(options);
    }

    prepModule() {
        const _self = this;
        return new Promise((resolve, reject) => {
            _self.runGC();
            _self.moduleReady = true;
            resolve([_self.name, 'module preparation complete.'].join(' '));
        });
    }

    _processCreate(request) {
        let _self = this;
        this.options.logger.log('Create new device for \'Widget\' module', this.options.logger.levels.ROBUST);
        let _count = 1;
        if (request.hasOwnProperty('count')) {
            _count = request.count;
        }

        for (let i = 0; i < _count; i++) {
            this.widgetFactory.provision(request).then((widget) => {
                _self.options.logger.log(`Attempting to start widget '${widget.id}'.`, _self.options.logger.levels.ROBUST);
                widget.start().then((result) => {
                    _self.options.logger.log(result, _self.options.logger.levels.ROBUST);
                }).catch((err) => {
                    _self.options.logger.error(err, _self.options.logger.levels.ROBUST);
                });;
                _self.devices.push(widget);
                _self.options.logger.log(`Number of active devices for Widget module: ${_self.devices.length}`, _self.options.logger.levels.ROBUST);
            }).catch((err) => {
                _self.options.logger.error(err, _self.options.logger.levels.ROBUST);
            });
        }
    }


    _processHydrate(request) {
        let _self = this;
        this.options.logger.log('Hydrating device for \'Widget\' module', this.options.logger.levels.ROBUST);
        this.widgetFactory.hydrate(request).then((widget) => {
            _self.options.logger.log(`Attempting to start widget '${widget.id}'.`, _self.options.logger.levels.ROBUST);
            widget.start().then((data) => {
                _self.devices.push(widget);
                _self.options.logger.log(`Number of active devices for Widget module: ${_self.devices.length}`, _self.options.logger.levels.ROBUST);
                _self.options.logger.log(data, _self.options.logger.levels.ROBUST);
                _self._updateCurrentSimulationCount('increment').then((res) => {
                    _self.options.logger.log(res, _self.options.logger.levels.ROBUST);
                }).catch((err) => {
                    _self.options.logger.error(err, this.options.logger.levels.INFO);
                });
            }).catch((err) => {
                _self.options.logger.error(err, _self.options.logger.levels.INFO);
            });
            _self.options.logger.log(`Number of active devices for Widget module: ${_self.devices.length}`, _self.options.logger.levels.ROBUST);
        }).catch((err) => {
            _self.options.logger.error(err, _self.options.logger.levels.INFO);
        });
    }

    _processStop(request) {
        let _self = this;
        this.options.logger.log('Attempting to stop device for \'Widget\' module', this.options.logger.levels.ROBUST);
        var _widget = _.where(this.devices, {
            id: request.id
        });
        if (_widget.length > 0) {
            _widget[0].stop().then((result) => {
                _self.options.logger.log(result, _self.options.logger.levels.ROBUST);
            }).catch((err) => {
                _self.options.logger.error(err, _self.options.logger.levels.INFO);
            });
        }
    }

};

module.exports = Object.freeze(General);