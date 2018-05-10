'use strict';

let Device = require('../../device.js');
let DynamicsModel = require('../dynamics/dynamics-model.js');
let AWS = require('aws-sdk');
const randomstring = require('randomstring');
const shortid = require('shortid');
const moment = require('moment');
const _ = require('underscore');
const uuidV4 = require('uuid/v4');

/**
 *
 * @class iotProxy
 */
class Vehicle extends Device {

    constructor(options, params, spec) {
        super(options);
        this._initialize_data(params);
    }

    _initialize_data(params) {
        this.id = '';
        if (!params.id) {
            this.id = this.uid;
        } else {
            this.id = params.id;
        }

        this.VIN = '';
        if (!params.vin) {
            this.VIN = this._createVIN();
        } else {
            this.VIN = params.vin;
        }

        // initialize vehicle params
        this.dynamics_model = new DynamicsModel({
            route: params.route,
            logger: this.options.logger
        });
        this.userId = params.userId;
        this.aggregateMetrics = params.aggregateMetrics;
        this.aggregationTransmissionTime = params.aggregationTransmissionTime;
        this.dataTopic = params.dataTopic;
        this.dataAggregatedTopic = params.dataAggregatedTopic;
        this.errorTopic = params.errorTopic;
        this.tripBucket = params.tripBucket;
        this.interval = params.measurementPollerInterval;

        // initialize object variables
        this.tripId = '';
        this.lastSnapshot = '';
        this.lastCalc = moment();
        this.suppress_codes = [];

        this.metadata = {
            vin: this.VIN,
            route: params.route.route_id
        }

        this.data = [];
        this.data.push({
            name: 'steering_wheel_angle',
            precision: 0.1,
            rounding: 1
        });
        this.data.push({
            name: 'torque_at_transmission',
            precision: 0.1,
            rounding: 1
        });
        this.data.push({
            name: 'engine_speed',
            precision: 0.1,
            rounding: 1
        });
        this.data.push({
            name: 'vehicle_speed',
            precision: 0.01,
            rounding: 2
        });
        this.data.push({
            name: 'acceleration',
            precision: 0.0001,
            rounding: 4
        });
        this.data.push({
            name: 'accelerator_pedal_position',
            precision: 0.1,
            rounding: 1
        });
        this.data.push({
            name: 'parking_brake_status',
            last_value: false,
            precision: 0
        });
        this.data.push({
            name: 'brake_pedal_status',
            last_value: false,
            precision: 0
        });
        this.data.push({
            name: 'transmission_gear_position',
            last_value: 'first',
            precision: 0
        });
        this.data.push({
            name: 'gear_lever_position',
            last_value: 'drive',
            precision: 0
        });
        this.data.push({
            name: 'odometer',
            precision: 0.002,
            rounding: 3
        });
        this.data.push({
            name: 'ignition_status',
            last_value: 'run',
            precision: 0
        });
        this.data.push({
            name: 'fuel_level',
            precision: 0.01,
            rounding: 2
        });
        this.data.push({
            name: 'fuel_consumed_since_restart',
            precision: 0.000001,
            rounding: 6
        });
        this.data.push({
            name: 'oil_temp',
            precision: 0.1,
            rounding: 1
        });
        this.data.push({
            name: 'latitude',
            precision: 0.00001,
            rounding: 5
        });
        this.data.push({
            name: 'longitude',
            precision: 0.00001,
            rounding: 5
        });
        this.data.push({
            name: 'brake',
            precision: 0.1,
            rounding: 1
        });
    }

    /**
     * Start vehicle engine and dynamics model.
     */
    start() {
        let _self = this;
        console.log(this.metadata)
        return new Promise((resolve, reject) => {
            _self.run(_self.interval, _self.metadata).then((result) => {
                _self.dynamics_model.engine_running = true;
                _self.dynamics_model.ignition_data = 'run';
                _self.tripId = uuidV4();
                _self.dynamics_model.start_physics_loop();
                _self.options.logger.log(result, this.options.logger.levels.ROBUST);
                resolve(`Vehicle ${_self.id} started.`);
            }).catch((err) => {
                this.options.logger.log(err, this.options.logger.levels.ROBUST);
                reject(`Vehicle ${_self.id} failed to start.`);
            });
        });
    }

    /**
     * Stop vehicle engine and dynamics model.
     */
    stop() {
        let _self = this;

        return new Promise((resolve, reject) => {
            _self.dynamics_model.stop_physics_loop();
            _self.dynamics_model.engine_running = false;
            _self.dynamics_model.ignition_data = 'off';
            _self.sleep().then((result) => {
                _self.options.logger.log(result, this.options.logger.levels.ROBUST);
                resolve(`Vehicle ${_self.id} stopped.`);
            }).catch((err) => {
                this.options.logger.log(err, this.options.logger.levels.ROBUST);
                reject(`Vehicle ${_self.id} failed to stop.`);
            });
        });

    };


    _publish(topic, payload) {
        let _payload = JSON.stringify(payload);
        this.options.logger.debug(`Sending data for '${this.id}' (${this.userId}) to AWS IoT ${_payload} to ${topic}`, this.options.logger.levels.DEBUG);
        this._publishMessage(topic, _payload).then((result) => {
            this.options.logger.debug(`Message successfully sent for '${this.id}' to configured topic.`, this.options.logger.levels.DEBUG);
        }).catch((err) => {
            this.options.logger.log(err, this.options.logger.levels.ROBUST);
            this.options.logger.debug(`Error occurred while attempting to send message for '${this.id}' to configured topic.`, this.options.logger.levels.DEBUG);
        });
    }

    _generateMessage() {
        this.options.logger.debug(`generating message for '${this.id}' device [automotive]`, this.options.logger.levels.ROBUST);

        if (this.dynamics_model.ignition_data === 'run') {
            let snapshot = this.dynamics_model.snapshot;

            //hydrate last snapshot
            let _lastSnapshot = {};
            if (this.lastSnapshot !== '') {
                _lastSnapshot = JSON.parse(this.lastSnapshot);
            }

            let _telem = {
                timestamp: moment.utc().format('YYYY-MM-DD HH:mm:ss.SSSSSSSSS'),
                trip_id: this.tripId,
                vin: this.VIN,
                name: 'location',
                latitude: 0,
                longitude: 0
            };

            for (let i = 0; i < this.data.length; i++) {
                if (snapshot.hasOwnProperty(this.data[i].name)) {

                    let value = snapshot[this.data[i].name];
                    if (this.data[i].precision != 0) {
                        // value = value - (value % this.data[i].precision)
                        value = Number(Math.round(value + 'e' + this.data[i].rounding) + 'e-' + this.data[i].rounding);
                    }

                    var data = {
                        timestamp: moment.utc().format('YYYY-MM-DD HH:mm:ss.SSSSSSSSS'),
                        trip_id: this.tripId,
                        vin: this.VIN,
                        name: this.data[i].name,
                        value: value
                    };

                    // skip lat / long to be able to send as pair
                    if (this.data[i].name === 'latitude') {
                        _telem.latitude = value;
                    } else if (this.data[i].name === 'longitude') {
                        _telem.longitude = value;
                    } else {
                        this._publish([this.dataTopic, this.VIN].join('/'), data);
                    }
                }
            }

            // save last processed snapshot
            this.lastSnapshot = JSON.stringify(snapshot);

            // send lat/long pair
            this._publish([this.dataTopic, this.VIN].join('/'), _telem);

            // process diagnostic trouble codes
            if (snapshot.hasOwnProperty('dtc_code')) {

                let suppress = false;
                for (var i = 0; i < this.suppress_codes.length; i++) {
                    if (this.suppress_codes[i] === snapshot.dtc_code) {
                        suppress = true;
                        break;
                    }
                }

                if (!suppress) {
                    let _dtc = {
                        timestamp: moment.utc().format('YYYY-MM-DD HH:mm:ss.SSSSSSSSS'),
                        trip_id: this.tripId,
                        vin: this.VIN,
                        name: 'dtc',
                        value: snapshot.dtc_code
                    };
                    this._publish([this.errorTopic, this.VIN].join('/'), _dtc);
                    this.suppress_codes.push(snapshot.dtc_code);
                }
            }

            if (snapshot.hasOwnProperty('route_ended')) {
                // route has ended, turn off vehicle and send last aggregation
                this.options.logger.log(['route ended for', this.VehicleId, this.VIN].join(' '), this.options.logger.levels.ROBUST);
                this.stop().then((result) => {
                    // send final aggregated metrics
                    this._sendTripGeoJSON(this.dynamics_model.route, this.tripBucket, this.tripId, this.VIN);
                    let _aggregatedMetrics = this._getAggregatedTelemetrics(true);
                    _aggregatedMetrics.geojson = {
                        bucket: this.tripBucket,
                        key: ['trip/', this.VIN, '/', this.tripId, '.json'].join('')
                    };
                    this._publish([this.dataAggregatedTopic, this.VIN].join('/'), _aggregatedMetrics);
                    this.dynamics_model.aggregator.reset();
                }).catch((err) => {
                    this.options.logger.log(err, this.options.logger.levels.ROBUST);
                });
            } else if (_.isEmpty(_lastSnapshot)) {
                // send initial baseline aggregations
                this._publish([this.dataAggregatedTopic, this.VIN].join('/'), this._getAggregatedTelemetrics(false));
                this.lastCalc = moment();
            } else {
                // check to see if time to send aggregations
                let _current_time = moment();
                let _time_delta = _current_time.diff(this.lastCalc);
                if (this.aggregationTransmissionTime <= _time_delta) {
                    this._publish([this.dataAggregatedTopic, this.VIN].join('/'), this._getAggregatedTelemetrics(false));
                    this.lastCalc = moment();
                }
            }
        }

    }

    _getAggregatedTelemetrics(forceUpdate) {
        // set aggregated data
        if (forceUpdate) {
            this.dynamics_model.update_metrics_snapshot();
        }

        var aggregated_data = this.dynamics_model.aggregated_metrics;
        aggregated_data.timestamp = moment.utc().format('YYYY-MM-DD HH:mm:ss.SSSSSSSSS');
        aggregated_data.trip_id = this.tripId;
        aggregated_data.vin = this.VIN;
        aggregated_data.name = 'aggregated_telemetrics';
        return aggregated_data;
    };

    /**
     * Format simulator route to GeoJSON format.
     */
    _sendTripGeoJSON(route, bucket, tripId, vin) {
        const _self = this;
        let _geojson = {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: []
                }
            }]
        };

        if (route) {
            for (let i = 0; i < route.stages.length; i++) {
                _geojson.features[0].geometry.coordinates.push(route.stages[i].start);
            }
        }

        var s3 = new AWS.S3();
        let _filename = [tripId, 'json'].join('.');
        let params = {
            Bucket: bucket,
            Key: ['trip', vin, _filename].join('/'),
            // ServerSideEncryption: 'aws:kms',
            // SSEKMSKeyId: kmsKeyId,
            Body: JSON.stringify(_geojson)
        };

        s3.upload(params, function(err, data) {
            if (err) {
                _self.options.logger.log(['Error uploading geojson for trip', tripId, err].join(' '), _self.options.logger.levels.INFO);
            } else {
                _self.options.logger.log(['GeoJSON generated and uploaded for trip', tripId].join(' '), _self.options.logger.levels.INFO);
            }
        });

    };

    _createVIN() {
        return randomstring.generate({
            length: 17,
            charset: 'abcdefghijklmnopqrstuvwxyz0123456789',
            capitalization: 'uppercase'
        });
    };


};

module.exports = Vehicle;