import { Component, Input, OnInit, ViewChild, NgZone } from '@angular/core';
import { FormGroup, FormBuilder, Validators, NgForm } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { DeviceService } from '../../service/device.service';
import { DeviceType } from '../../model/deviceType';
import { SwalComponent } from '@toverux/ngx-sweetalert2';
import { ProfileInfo } from '../../model/profileInfo';
import { LoggerService } from '../../service/logger.service';
import { StatsService } from '../../service/stats.service';
import { Attribute } from '../../model/attribute';
import { Subscription } from 'rxjs';
import * as _ from 'underscore';
import { AsyncLocalStorage } from 'angular-async-local-storage';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import * as moment from 'moment';
import * as shortid from 'shortid';
import { integer } from 'aws-sdk/clients/storagegateway';
declare var jquery: any;
declare var $: any;
declare var swal: any;


@Component({
    selector: 'app-ratchet-device-type',
    templateUrl: './type.component.html'
})
export class DeviceTypeComponent implements OnInit {

    public typeId: string;
    public title: string = 'Device Type';
    private sub: Subscription;
    public deviceStats: any = {};
    private profile: ProfileInfo;
    public attribute: Attribute;
    public hasError: boolean = false;
    public errorMsg: string = '';
    public readOnly: boolean = true;
    public stringMinError: boolean = false;
    public boolMinError: boolean = false;
    public floatIntMinError: boolean = false;
    public floatDecMinError: boolean = false;
    public intMinError: boolean = false;
    public nestedDepth: integer = 0;
    private refAttr = null;

    public dtype: DeviceType;

    @BlockUI() blockUI: NgBlockUI;

    constructor(public router: Router,
        public route: ActivatedRoute,
        private deviceService: DeviceService,
        protected localStorage: AsyncLocalStorage,
        private logger: LoggerService,
        private statsService: StatsService,
        private _ngZone: NgZone) {
        this.attribute = new Attribute();
    }

    ngOnInit() {

        this.blockUI.start('Loading device type...');
        this.dtype = new DeviceType({
            name: '',
            spec: {
                duration: 60000,
                interval: 2000,
                payload: [],
                topic: '/sample/topic'
            },
            visibility: 'private'
        });

        this.sub = this.route.params.subscribe(params => {
            this.typeId = params['typeId'];
        });

        const _self = this;
        this.statsService.statObservable$.subscribe(message => {
            this.deviceStats = message;
            this._ngZone.run(() => { });
        });
        this.statsService.refresh();

        this.localStorage.getItem<ProfileInfo>('profile').subscribe((profile) => {
            console.log(profile)
            this.profile = new ProfileInfo(profile);
            if (this.typeId !== 'new') {
                _self.loadDeviceType();
            } else {
                this.readOnly = false;
                this.blockUI.stop();
            }
        });
    }

    loadDeviceType() {
        const _self = this;
        this.deviceService.getDeviceType(this.typeId).then((type: DeviceType) => {
            this.blockUI.stop();
            this.logger.info(type);
            this.dtype = new DeviceType(type);
            if (this.dtype.userId === this.profile.user_id) {
                this.readOnly = false;
            }
        }).catch((err) => {
            this.blockUI.stop();
            swal(
                'Oops...',
                'Something went wrong! Unable to retrieve the device type.',
                'error');
            this.logger.error('error occurred calling getDeviceType api, show message');
            this.logger.error(err);
        });
    }

    cancel() {
        this.router.navigate(['/securehome/types']);
    }

    removeSchemaAttribute(id: string) {
        this.dtype.spec.payload = this._removePayloadAttribute(this.dtype.spec.payload, id);
    }

    _removePayloadAttribute(payload: any, id: string) {
        let _this = this;
        let _newPayload = [];
        _newPayload = _.filter(payload, function(o: any) { return o._id_ !== id; });
        _newPayload.forEach(function(item) {
            if (item.type === 'object') {
                item.payload = _this._removePayloadAttribute(item.payload, id);
            }
        });
        return _newPayload;
    }

    viewSchemaAttribute(id: string) {
        let attribute: any = this.getSchemaAttribute(id, this.dtype.spec.payload);
        if (!_.isEmpty(attribute)) {
            swal({ title: `${attribute.name} config`, html: '<pre style=\'text-align:left; font-size:14px;\'>' + JSON.stringify(attribute, undefined, 2) + '</pre>' });
        } else {
            swal(
                'Oops...',
                'Something went wrong! Unable to display the schema attribute configuration.',
                'error');
        }
    }

    getSchemaAttribute(id: string, payload: any) {
        let attribute = {};
        for (let i = 0; i < payload.length; i++) {
            if (payload[i]._id_ === id) {
                attribute = payload[i];
            } else if (payload[i].type === 'object') {
                attribute = this.getSchemaAttribute(id, payload[i].payload);
            }

            if (!_.isEmpty(attribute)) {
                console.log(attribute)
                break;
            }
        }

        return attribute;
    }

    addSchemaAttribute(reference: any = null, depth: integer = 0) {
        this.nestedDepth = depth;
        console.log(this.nestedDepth)
        this.attribute = new Attribute();
        this.attribute._id_ = shortid.generate();
        this.attribute.name = this.attribute._id_;
        this.refAttr = reference;
        $('#attributeModal').modal('show');
    }

    addAttribute(form: any) {
        this.logger.info(form);
        if (!form.name) {
            return;
        }

        this.stringMinError = false;
        this.boolMinError = false;
        this.intMinError = false;
        this.floatIntMinError = false;
        this.floatDecMinError = false;

        if (form.type === 'string') {
            if (form.smin >= form.smax) {
                this.stringMinError = true;
                return;
            } else {
                this.stringMinError = false;
            }
        }

        if (form.type === 'bool') {
            if (form.bmin >= form.bmax) {
                this.boolMinError = true;
                return;
            } else {
                this.boolMinError = false;
            }
        }

        if (form.type === 'sinusoidal' || form.type === 'int') {
            if (form.min >= form.max) {
                this.intMinError = true;
                return;
            } else {
                this.intMinError = false;
            }
        }

        if (form.type === 'float') {
            if (form.imin >= form.imax) {
                this.floatIntMinError = true;
                return;
            } else {
                this.floatIntMinError = false;
            }

            if (form.dmin >= form.dmax) {
                this.floatDecMinError = true;
                return;
            } else {
                this.floatDecMinError = false;
            }
        }

        if (form.type === 'pickOne') {
            if (typeof form.arr === "string") {
                let _tmp = form.arr.replace(/\s/g, '');
                form.arr = _tmp.split(',');
            }
        }
        if (form.type === 'object') {
            form.payload = [];
        }

        form._id_ = this.attribute._id_;

        //remove empty default attribute if it exists
        if (form.hasOwnProperty('default')) {
            if (form.default === '') {
                delete form.default;
            }
        }

        //correct potential type cast issue
        if (form.hasOwnProperty('static')) {
            if (typeof form.static === 'string') {
                form.static = form.static === 'true' ? true : false;
            }
        }

        if (this.refAttr) {
            this.refAttr.payload.push(form);
        } else {
            this.dtype.spec.payload.push(form);
        }
        $('#attributeModal').modal('hide');
    }

    cancelAddAttribute(form: NgForm) {
        form.reset();
        $('#attributeModal').modal('hide');
    }

    saveDeviceType() {
        this.logger.info(this.dtype);
        this.hasError = false;
        this.errorMsg = '';
        // error checks
        if (!this.dtype.name) {
            this.hasError = true;
            this.errorMsg = 'Name is a required field for a device type.';
        } else if (!this.dtype.spec.topic) {
            this.hasError = true;
            this.errorMsg += 'Topic is a required field for a device type.';
        }

        if (!this.dtype.spec.interval) {
            this.dtype.spec.interval = 2000;
        }

        if (this.dtype.spec.interval < 1000) {
            this.dtype.spec.interval = 1000;
        }

        if (!this.dtype.spec.duration) {
            this.dtype.spec.duration = 60000;
        }

        if (this.dtype.spec.duration < 60000) {
            this.dtype.spec.duration = 60000;
        }

        if (this.hasError) {
            return;
        } else {
            this.blockUI.start('Saving device type...');

            if (this.typeId === 'new') {
                this.deviceService.createDeviceType(this.dtype).then((resp: any) => {
                    this.blockUI.stop();
                    swal(
                        'Device Type Created',
                        `The device type ${this.dtype.name} was successfully created.`,
                        'success').then((result) => {
                            if (result.value) {
                                this.router.navigate(['/securehome/types']);
                            }
                        });
                }).catch((err) => {
                    this.blockUI.stop();
                    swal(
                        'Oops...',
                        'Something went wrong! Unable to create the new device type.',
                        'error');
                    this.logger.error('error occurred calling createDeviceType api, show message');
                    this.logger.error(err);
                });
            } else {
                this.deviceService.updateDeviceType(this.dtype).then((resp: any) => {
                    this.blockUI.stop();
                    swal(
                        'Device Type Updated',
                        `The device type ${this.dtype.name} was successfully updated.`,
                        'success').then((result) => {
                            if (result.value) {
                                this.router.navigate(['/securehome/types']);
                            }
                        });
                }).catch((err) => {
                    this.blockUI.stop();
                    swal(
                        'Oops...',
                        'Something went wrong! Unable to update the device type.',
                        'error');
                    this.logger.error('error occurred calling updateDeviceType api, show message');
                    this.logger.error(err);
                });
            }

        }
    }

    getDataSample() {
        let sample = {};

        for (let i = 0; i < this.dtype.spec.payload.length; i++) {
            sample[this.dtype.spec.payload[i].name] = this.generateSampleData(this.dtype.spec.payload[i]);
        }

        return JSON.stringify(sample, undefined, 2);
    }

    generateSampleData(attr: any) {
        if (attr.default) {
            return attr.default;
        }

        if (attr.type === 'string') {
            if (attr.default) {
                return attr.default;
            } else {
                return 'asdqwiei1238';
            }
        } else if (attr.type === 'id') {
            return 'rLdMw4VRZ';
        } else if (attr.type === 'int' || attr.type === 'decay' || attr.type === 'sinusoidal') {
            return attr.max;
        } else if (attr.type === 'rstring') {
            return 'asdqwiei1238';
        } else if (attr.type === 'uuid') {
            return '799fc110-fee2-43b2-a6ed-a504fa77931a';
        } else if (attr.type === 'shortid') {
            return 'PPBqWA9';
        } else if (attr.type === 'timestamp') {
            if (attr.tsformat === 'unix') {
                return moment('2018-02-15 13:50:18').utc().format('x');
            } else {
                return moment('2018-02-15 13:50:18').utc().format('YYYY-MM-DDTHH:mm:ss');
            }
        } else if (attr.type === 'float') {
            return parseFloat([attr.imax, '.', attr.dmax].join(''));
        } else if (attr.type === 'bool') {
            return 'true';
        } else if (attr.type === 'location') {
            return `{ 'latitude': ${attr.lat}, 'longitude': ${attr.long} }`;
        } else if (attr.type === 'pickOne') {
            return attr.arr[0];
        } else if (attr.type === 'object') {
            let _s = {};
            for (let i = 0; i < attr.payload.length; i++) {
                _s[attr.payload[i].name] = this.generateSampleData(attr.payload[i]);
            }
            return _s;
        }
    }

}
