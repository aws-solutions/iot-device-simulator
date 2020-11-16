import { Component, Input, OnInit, OnDestroy, ViewChild, NgZone } from '@angular/core';
import { FormGroup, FormBuilder, Validators, NgForm } from '@angular/forms';
import { DeviceService } from '../../service/device.service';
import { Router, ActivatedRoute } from '@angular/router';
import { SwalComponent } from '@toverux/ngx-sweetalert2';
import { ProfileInfo } from '../../model/profileInfo';
import { Device } from '../../model/device';
import { DeviceType } from '../../model/deviceType';
import { AsyncLocalStorage } from 'angular-async-local-storage';
import { LoggerService } from '../../service/logger.service';
import { Subscription } from 'rxjs';
import { Message } from '../../model/message';
import { MQTTService } from '../../service/mqtt.service';
import { StatsService } from '../../service/stats.service';
import { environment } from '../../../environments/environment';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import * as moment from 'moment';
import * as _ from 'underscore';
declare var jquery: any;
declare var $: any;
declare var swal: any;
declare var mapboxgl: any;
declare var Gauge: any;

@Component({
    selector: 'app-ratchet',
    templateUrl: './vehicle.component.html'
})
export class VehicleComponent implements OnInit, OnDestroy { // implements LoggedInCallback {

    public title: string = 'Vehicle Details';
    public deviceStats: any = {};
    private profile: ProfileInfo;
    public vehicleId: string;
    private sub: Subscription;
    public device: Device = new Device();
    public deviceType: DeviceType = new DeviceType();
    public messages: Message[] = [];
    private throttle_gauge: any;
    private speed_gauge: any;
    private rpm_gauge: any;
    private oil_gauge: any;
    private map: any;
    public invalidMapboxToken: boolean = false;
    private pollerInterval: any = null;

    public telematics: any = {
        throttle: 0,
        speed: 0,
        engine_speed: 0,
        oil_temp: 0,
        transmission_torque: 0,
        odometer: 0,
        fuel_level: 0,
        gear: 0,
        latitude: 38.955796,
        longitude: -77.395869
    };

    @BlockUI() blockUI: NgBlockUI;

    constructor(public router: Router,
        public route: ActivatedRoute,
        private deviceService: DeviceService,
        protected localStorage: AsyncLocalStorage,
        private logger: LoggerService,
        private mqttService: MQTTService,
        private statsService: StatsService,
        private _ngZone: NgZone) {
    }

    ngOnInit() {

        this.sub = this.route.params.subscribe(params => {
            this.vehicleId = params['vehicleId'];
        });

        this.device.metadata = {
            vin: ''
        };

        this.blockUI.start('Loading vehicle...');

        const _self = this;
        this.statsService.statObservable$.subscribe(message => {
            this.deviceStats = message;
            this._ngZone.run(() => { });
        });
        this.statsService.refresh();

        this.localStorage.getItem<ProfileInfo>('profile').subscribe((profile) => {
            _self.profile = new ProfileInfo(profile);
            _self.loadDevice();
            this.createMap();
            this.createGuages();
            this.pollerInterval = setInterval(function() {
                _self.loadDevice();
            }, environment.refreshInterval);
        });
    }

    ngOnDestroy() {
        this.logger.info('destroying vehicle page, attempting to remove poller.');
        clearInterval(this.pollerInterval);
    }

    loadDevice() {
        const _self = this;
        this.deviceService.getDevice(this.vehicleId).then((d: Device) => {
            this.device = d;
            if (this.deviceType.typeId === '') {
                _self.deviceService.getDeviceType(_self.device.typeId).then((type: DeviceType) => {
                    _self.blockUI.stop();
                    _self.deviceType = new DeviceType(type);
                    this.mqttService.subscribe(`${_self.deviceType.spec.dataTopic}/${_self.device.metadata.vin}`);
                    // * listen to the MQTT stream
                    _self.mqttService.messageObservable$.subscribe(message => {
                        if (message.topic.startsWith(`${_self.deviceType.spec.dataTopic}/${_self.device.metadata.vin}`)) {
                            if (_self.messages.length > 100) {
                                _self.messages.pop();
                            }
                            _self.messages.unshift(message);
                            _self.updateGauges(message);
                            _self._ngZone.run(() => { });
                        }
                    });
                }).catch((err) => {
                    this.blockUI.stop();
                    this.logger.error('error occurred calling getDeviceType api, show message');
                    this.logger.error(err);
                });
            } else {
                this.blockUI.stop();
            }
        }).catch((err) => {
            this.blockUI.stop();
            swal(
                'Oops...',
                'Something went wrong! Unable to retrieve the vehicle.',
                'error');
            this.logger.error('error occurred calling getDevice api, show message');
            this.logger.error(err);
        });
    }

    startDevice() {
        this.blockUI.start('Starting vehicle...');
        const _self = this;

        if (this.device.stage === 'sleeping') {
            this.device.operation = 'hydrate';
            this.deviceService.updateDevice(this.device).then((resp: any) => {
                _self.loadDevice();
            }).catch((err) => {
                this.blockUI.stop();
                swal(
                    'Oops...',
                    'Something went wrong! Unable to start the vehicle.',
                    'error');
                this.logger.error('error occurred calling updateDevice api, show message');
                this.logger.error(err);
                this.loadDevice();
            });
        }
    }

    stopDevice() {
        this.blockUI.start('Stopping vehicle...');
        const _self = this;
        if (this.device.stage === 'hydrated') {
            this.device.operation = 'stop';
            this.deviceService.updateDevice(this.device).then((resp: any) => {
                _self.loadDevice();
            }).catch((err) => {
                this.blockUI.stop();
                swal(
                    'Oops...',
                    'Something went wrong! Unable to stop the vehicle.',
                    'error');
                this.logger.error('error occurred calling updateDevice api, show message');
                this.logger.error(err);
                this.loadDevice();
            });
        } else {
            this.blockUI.stop();
        }
    }

    deleteDevice() {
        const _self = this;

        swal({
            title: 'Are you sure you want to delete this vehicle?',
            text: 'You won\'t be able to revert this!',
            type: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.value) {
                _self.blockUI.start('Deleting vehicle...');

                _self.deviceService.deleteDevice(_self.device.id).then((resp: any) => {
                    this.router.navigate(['/securehome/automotive']);
                }).catch((err) => {
                    _self.blockUI.stop();
                    swal(
                        'Oops...',
                        'Something went wrong! Unable to delete the vehicle.',
                        'error');
                    _self.logger.error('error occurred calling deleteDevice api, show message');
                    _self.logger.error(err);
                    _self.loadDevice();
                });
            }
        });
    }

    refreshData() {
        this.blockUI.start('Loading vehicle...');
        this.loadDevice();
    }

    formatDate(dt: string) {
        if (dt) {
            return moment(dt).format('MMM Do YYYY HH:mm');
        } else {
            return '';
        }
    }

    strinifyContent(m: any) {
        return JSON.stringify(m, undefined, 2);
    }

    clearMessages() {
        this.messages.length = 0;
    }

    updateGauges(message: any) {
        if (message.content.name === 'torque_at_transmission') {
            this.telematics.transmission_torque = message.content.value;
            $('#torque').css('width', [Math.ceil((this.telematics.transmission_torque / 500.0) * 100), '%'].join(''));
        } else if (message.content.name === 'fuel_level') {
            this.telematics.fuel_level = message.content.value;
            $('#fuel').css('width', [this.telematics.fuel_level, '%'].join(''));
        } else if (message.content.name === 'accelerator_pedal_position') {
            this.telematics.throttle = message.content.value;
            this.throttle_gauge.set(this.telematics.throttle);
        } else if (message.content.name === 'vehicle_speed') {
            this.telematics.speed = message.content.value;
            this.speed_gauge.set(this.telematics.speed);
        } else if (message.content.name === 'oil_temp') {
            this.telematics.oil_temp = message.content.value;
            this.oil_gauge.set(this.telematics.oil_temp);
        } else if (message.content.name === 'engine_speed') {
            this.telematics.engine_speed = message.content.value;
            this.rpm_gauge.set(this.telematics.engine_speed);
        } else if (message.content.name === 'transmission_gear_position') {
            this.telematics.gear = message.content.value;
        } else if (message.content.name === 'odometer') {
            this.telematics.odometer = message.content.value;
        } else if (message.content.name === 'location') {
            this.telematics.latitude = message.content.latitude;
            this.telematics.longitude = message.content.longitude;
            if (!this.invalidMapboxToken) {
                this.updateMap();
            }
        }
    }

    createGuages() {
        this.createThrottleGauge();
        this.createSpeedGuage();
        this.createRpmGuage();
        this.createOilGuage();

        $('#torque').css('width', [Math.ceil((this.telematics.transmission_torque / 500.0) * 100), '%'].join(''));
        $('#fuel').css('width', [this.telematics.fuel_level, '%'].join(''));
    }


    createMap() {
        if (this.profile.mapboxToken === '') {
            this.invalidMapboxToken = true;
            return;
        }

        const _self = this;
        mapboxgl.accessToken = this.profile.mapboxToken; // 'pk.eyJ1IjoiYW16bnNiIiwiYSI6ImNqMDN2ZGlveDBjcXoyd3AzNjM0YmpqeDQifQ.LGPO_wlElLvOJax3TO5aLQ';
        this.map = new mapboxgl.Map({
            container: 'map', // container id
            style: 'mapbox://styles/mapbox/bright-v9', // stylesheet location
            center: [this.telematics.longitude, this.telematics.latitude], // starting position [lng, lat]
            zoom: 14 // starting zoom
        });

        this.map.on('error', function(err: any) {
            _self.logger.error('mapbox gl error');
            _self.logger.error(err);
            _self.invalidMapboxToken = true;
            return;
        });

        this.map.on('load', function() {

            _self.map.addSource('sourceTest', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: [{
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'Point',
                            coordinates: [_self.telematics.longitude, _self.telematics.latitude]
                        }
                    }]
                }
            });

            _self.map.addLayer({
                id: 'layerTest',
                source: 'sourceTest',
                type: 'circle',
                paint: {
                    'circle-radius': 10,
                    'circle-color': '#1de9b6',
                    'circle-opacity': 0.7,
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#00897b'
                }
            });
        });
    }

    updateMap() {
        this.map.setCenter([this.telematics.longitude, this.telematics.latitude]);
        this.map.getSource('sourceTest').setData({
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'Point',
                    coordinates: [this.telematics.longitude, this.telematics.latitude]
                }
            }]
        });
    }

    createThrottleGauge() {
        // ==============================================================
        // Speed Gaugue
        // ==============================================================
        const throttle_opts = {
            angle: 0, // The span of the gauge arc
            lineWidth: 0.42, // The line thickness
            radiusScale: 1, // Relative radius
            pointer: {
                length: 0.64, // // Relative to gauge radius
                strokeWidth: 0.04, // The thickness
                color: '#000000' // Fill color
            },
            limitMax: false,     // If false, the max value of the gauge will be updated if value surpass max
            limitMin: false,     // If true, the min value of the gauge will be fixed unless you set it manually
            colorStart: '#26c6da',   // Colors
            colorStop: '#26c6da',    // just experiment with them
            strokeColor: '#E0E0E0',  // to see which ones work best for you
            generateGradient: true,
            highDpiSupport: true     // High resolution support
        };
        const throttle_target = document.getElementById('throttle'); // your canvas element
        this.throttle_gauge = new Gauge(throttle_target).setOptions(throttle_opts); // create sexy gauge!
        this.throttle_gauge.maxValue = 100; // set max gauge value
        this.throttle_gauge.setMinValue(0);  // Prefer setter over gauge.minValue = 0
        this.throttle_gauge.animationSpeed = 45; // set animation speed (32 is default value)
        this.throttle_gauge.set(this.telematics.throttle); // set actual value
    }

    createSpeedGuage() {
        // ==============================================================
        // Speed Gaugue
        // ==============================================================
        const speed_opts = {
            angle: 0, // The span of the gauge arc
            lineWidth: 0.42, // The line thickness
            radiusScale: 1, // Relative radius
            pointer: {
                length: 0.64, // // Relative to gauge radius
                strokeWidth: 0.04, // The thickness
                color: '#000000' // Fill color
            },
            limitMax: false,     // If false, the max value of the gauge will be updated if value surpass max
            limitMin: false,     // If true, the min value of the gauge will be fixed unless you set it manually
            colorStart: '#009efb',   // Colors
            colorStop: '#009efb',    // just experiment with them
            strokeColor: '#E0E0E0',  // to see which ones work best for you
            generateGradient: true,
            highDpiSupport: true     // High resolution support
        };
        const speed_target = document.getElementById('speed'); // your canvas element
        this.speed_gauge = new Gauge(speed_target).setOptions(speed_opts); // create sexy gauge!
        this.speed_gauge.maxValue = 160; // set max gauge value
        this.speed_gauge.setMinValue(0);  // Prefer setter over gauge.minValue = 0
        this.speed_gauge.animationSpeed = 45; // set animation speed (32 is default value)
        this.speed_gauge.set(this.telematics.speed); // set actual value
    }

    createRpmGuage() {
        // ==============================================================
        // RPM Gaugue
        // ==============================================================
        const rpm_opts = {
            angle: 0, // The span of the gauge arc
            lineWidth: 0.42, // The line thickness
            radiusScale: 1, // Relative radius
            pointer: {
                length: 0.64, // // Relative to gauge radius
                strokeWidth: 0.04, // The thickness
                color: '#000000' // Fill color
            },
            limitMax: false,     // If false, the max value of the gauge will be updated if value surpass max
            limitMin: false,     // If true, the min value of the gauge will be fixed unless you set it manually
            colorStart: '#7460ee',   // Colors
            colorStop: '#7460ee',    // just experiment with them
            strokeColor: '#E0E0E0',  // to see which ones work best for you
            generateGradient: true,
            highDpiSupport: true     // High resolution support
        };
        const rpm_target = document.getElementById('rpm'); // your canvas element
        this.rpm_gauge = new Gauge(rpm_target).setOptions(rpm_opts); // create sexy gauge!
        this.rpm_gauge.maxValue = 8000; // set max gauge value
        this.rpm_gauge.setMinValue(0);  // Prefer setter over gauge.minValue = 0
        this.rpm_gauge.animationSpeed = 45; // set animation speed (32 is default value)
        this.rpm_gauge.set(this.telematics.engine_speed); // set actual value
    }

    createOilGuage() {
        // ==============================================================
        // Oil Gaugue
        // ==============================================================
        const oil_opts = {
            angle: 0, // The span of the gauge arc
            lineWidth: 0.42, // The line thickness
            radiusScale: 1, // Relative radius
            pointer: {
                length: 0.64, // // Relative to gauge radius
                strokeWidth: 0.04, // The thickness
                color: '#000000' // Fill color
            },
            limitMax: false,     // If false, the max value of the gauge will be updated if value surpass max
            limitMin: false,     // If true, the min value of the gauge will be fixed unless you set it manually
            colorStart: '#f62d51',   // Colors
            colorStop: '#f62d51',    // just experiment with them
            strokeColor: '#E0E0E0',  // to see which ones work best for you
            generateGradient: true,
            highDpiSupport: true     // High resolution support
        };
        const oil_target = document.getElementById('oil'); // your canvas element
        this.oil_gauge = new Gauge(oil_target).setOptions(oil_opts); // create sexy gauge!
        this.oil_gauge.maxValue = 300; // set max gauge value
        this.oil_gauge.setMinValue(0);  // Prefer setter over gauge.minValue = 0
        this.oil_gauge.animationSpeed = 45; // set animation speed (32 is default value)
        this.oil_gauge.set(this.telematics.oil_temp); // set actual value
    }

}
