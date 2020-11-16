import { Component, Input, OnInit, ViewChild, NgZone } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { SwalComponent } from '@toverux/ngx-sweetalert2';
import { ProfileInfo } from '../../model/profileInfo';
import { Subscription } from 'rxjs';
import * as _ from 'underscore';
import { AsyncLocalStorage } from 'angular-async-local-storage';
import { DeviceType } from '../../model/deviceType';
import { AutoConfiguration } from '../../model/autoConfiguration';
import { DeviceService } from '../../service/device.service';
import { LoggerService } from '../../service/logger.service';
import { StatsService } from '../../service/stats.service';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import * as moment from 'moment';
declare var jquery: any;
declare var $: any;
declare var swal: any;

@Component({
    selector: 'app-ratchet',
    templateUrl: './customize.component.html'
})
export class CustomizeAutomotiveComponent implements OnInit {

    public cognitoId: string;
    public title: string = 'Automotive Configuration';
    private sub: Subscription;
    public deviceStats: any = {};
    private profile: ProfileInfo;
    public config: AutoConfiguration = new AutoConfiguration();
    public errors: string[] = [];

    @BlockUI() blockUI: NgBlockUI;

    constructor(public router: Router,
        public route: ActivatedRoute,
        private deviceService: DeviceService,
        protected localStorage: AsyncLocalStorage,
        private logger: LoggerService,
        private statsService: StatsService,
        private _ngZone: NgZone) {
    }

    ngOnInit() {

        this.blockUI.start('Loading configuration...');

        const _self = this;
        this.statsService.statObservable$.subscribe(message => {
            this.deviceStats = message;
            this._ngZone.run(() => { });
        });
        this.statsService.refresh();

        this.localStorage.getItem<ProfileInfo>('profile').subscribe((profile) => {
            _self.profile = new ProfileInfo(profile);
            _self.loadAutomotiveConfiguration();
        });
    }

    loadAutomotiveConfiguration() {
        const _self = this;
        this.deviceService.getDeviceType('automotive').then((type: DeviceType) => {
            _self.blockUI.stop();
            _self.config = new AutoConfiguration(JSON.parse(JSON.stringify(type)));
        }).catch((err) => {
            this.blockUI.stop();
            swal(
                'Oops...',
                'Something went wrong! Unable to retrieve the configuration for automotive.',
                'error');
            this.logger.error('error occurred calling getDeviceType api, show message');
            this.logger.error(err);
        });
    }

    cancel() {
        this.router.navigate(['/securehome/automotive']);
    }

    save() {
        this.errors.length = 0;

        if (this.config.spec.measurementPollerInterval < 2000) {
            this.errors.push('The Sensor Data Transmision Interval must be >= 2000.');
        }

        if (this.config.spec.aggregationTransmissionTime < 2000) {
            this.errors.push('The Aggregated Telemetry Transmision Interval must be >= 2000.');
        }

        if (this.config.spec.dataTopic.length === 0) {
            this.errors.push('The Telemetry Data Topic is required.');
        }

        if (this.config.spec.dataAggregatedTopic.length === 0) {
            this.errors.push('The Aggregated Telemetry Data Topic is required.');
        }

        if (this.config.spec.errorTopic.length === 0) {
            this.errors.push('The Error Topic is required.');
        }

        if (this.errors.length > 0) {
            return;
        }

        this.blockUI.start('Saving the configuration...');
        if (this.config.userId === '_default_') {
            // create new config for user
            this.createUserConfiguration();
        } else {
            this.updateUserConfiguration();
        }
    }

    createUserConfiguration() {
        this.logger.info(this.config);
        this.deviceService.createDeviceType(this.config).then((resp: any) => {
            this.blockUI.stop();
            swal(
                'Configuration Updated',
                `The automotive configuration was successfully saved.`,
                'success').then((result) => {
                    if (result.value) {
                        this.router.navigate(['/securehome/automotive']);
                    }
                });
        }).catch((err) => {
            this.blockUI.stop();
            swal(
                'Oops...',
                'Something went wrong! Unable to save the updated configuration.',
                'error');
            this.logger.error('error occurred calling createDeviceType api, show message');
            this.logger.error(err);
        });
    }

    updateUserConfiguration() {
        this.logger.info(this.config);
        this.deviceService.updateDeviceType(this.config).then((resp: any) => {
            this.blockUI.stop();
            swal(
                'Configuration Updated',
                `The automotive configuration was successfully saved.`,
                'success').then((result) => {
                    if (result.value) {
                        this.router.navigate(['/securehome/automotive']);
                    }
                });
        }).catch((err) => {
            this.blockUI.stop();
            swal(
                'Oops...',
                'Something went wrong! Unable to save the updated configuration.',
                'error');
            this.logger.error('error occurred calling updateDeviceType api, show message');
            this.logger.error(err);
        });
    }

    removeSchemaAttribute(attribute: string, configItem: any) {
        configItem.schema = _.filter(configItem.schema, function(o: any) { return o.attribute !== attribute; });
    }

    addSchemaAttribute(configItem: any) {
        configItem.schema.push({ attribute: '', value: '' });
    }

    getDataSample(type: string) {
        let sample = {};

        if (type === 'sensor') {
            for (let i = 0; i < this.config.spec.telemetrySchema.length; i++) {
                sample[this.config.spec.telemetrySchema[i].attribute] = this.generateSampleData(this.config.spec.telemetrySchema[i].value);
            }
        }
        return JSON.stringify(sample, undefined, 2);

    }

    generateSampleData(value: string) {
        if (value === 'measurement_name') {
            return 'speed';
        } else if (value === 'measurement_value') {
            return 47.4;
        } else if (value === 'vin') {
            return '1NXBR32E84Z995078';
        } else if (value === 'trip_id') {
            return '799fc110-fee2-43b2-a6ed-a504fa77931a';
        } else if (value === 'timestamp') {
            return moment('2018-02-15 13:50:18').utc().format('YYYY-MM-DD HH:mm:ss.SSSSSSSSS');
        } else if (value === 'dtc_name') {
            return 'dtc';
        } else if (value === 'dtc_code') {
            return 'P0108';
        }
    }

}
