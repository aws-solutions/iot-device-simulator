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
import { Subscription } from 'rxjs/Subscription';
import * as _ from 'underscore';
import { AsyncLocalStorage } from 'angular-async-local-storage';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import * as moment from 'moment';
import * as shortid from 'shortid';
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
            }
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
            _self.profile = new ProfileInfo(profile);
            if (this.typeId !== 'new') {
                _self.loadDeviceType();
            } else {
                this.blockUI.stop();
            }
        });
    }

    loadDeviceType() {
        this.deviceService.getDeviceType(this.typeId).then((type: DeviceType) => {
            this.blockUI.stop();
            this.logger.info(type);
            this.dtype = new DeviceType(type);
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
        this.dtype.spec.payload = _.filter(this.dtype.spec.payload, function(o: any) { return o._id_ !== id; });
    }

    viewSchemaAttribute(id: string) {
        const attribute: any = _.filter(this.dtype.spec.payload, function(o: any) { return o._id_ === id; });
        if (attribute.length > 0) {
            swal({ title: `${attribute[0].name} config`, html: '<pre style=\'text-align:left; font-size:14px;\'>' + JSON.stringify(attribute[0], undefined, 2) + '</pre>' });
        } else {
            swal(
                'Oops...',
                'Something went wrong! Unable to display the schema attribute configuration.',
                'error');
        }
    }

    addSchemaAttribute() {
        this.attribute = new Attribute();
        this.attribute._id_ = shortid.generate();
        this.attribute.name = this.attribute._id_;
        $('#attributeModal').modal('show');
    }

    addAttribute(form: any) {
        this.logger.info(form);
        if (form.type === 'pickOne') {
            let _tmp = form.arr.replace(/\s/g, '');
            form.arr = _tmp.split(',');
        }
        form._id_ = this.attribute._id_;
        this.dtype.spec.payload.push(form);
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
            for (let i = 0; i < this.dtype.spec.payload.length; i++) {
                if (this.dtype.spec.payload[i].hasOwnProperty('default')) {
                    if (this.dtype.spec.payload[i].default === '') {
                        delete this.dtype.spec.payload[i].default;
                    }
                }
            }

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
        } else if (attr.type === 'int') {
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
        } else if (attr.type === 'boolean') {
            return 'true';
        } else if (attr.type === 'location') {
            return `{ 'latitude': ${attr.lat}, 'longitude': ${attr.long} }`;
        } else if (attr.type === 'pickOne') {
            return attr.arr[0];
        }
    }

}
