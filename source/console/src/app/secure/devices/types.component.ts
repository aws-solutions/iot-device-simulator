import { Component, Input, OnInit, ViewChild, NgZone } from '@angular/core';
import { FormGroup, FormBuilder, Validators, NgForm } from '@angular/forms';
import { DeviceService } from '../../service/device.service';
import { Router } from '@angular/router';
import { SwalComponent } from '@toverux/ngx-sweetalert2';
import { ProfileInfo } from '../../model/profileInfo';
import { DeviceType } from '../../model/deviceType';
import { AsyncLocalStorage } from 'angular-async-local-storage';
import { LoggerService } from '../../service/logger.service';
import { StatsService } from '../../service/stats.service';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import * as moment from 'moment';
declare var jquery: any;
declare var $: any;
declare var swal: any;

@Component({
    selector: 'app-ratchet-device-types',
    templateUrl: './types.component.html'
})
export class DeviceTypesComponent implements OnInit { // implements LoggedInCallback {

    public title: string = 'Device Types';
    public deviceStats: any = {};
    private profile: ProfileInfo;
    public deviceTypes: DeviceType[] = [];
    public pages: any = {
        current: 1,
        total: 0,
        pageSize: 20
    };
    public metrics: any = {
        total: 0,
        running: 0,
        provisioning: 0,
        sleeping: 0
    };

    @BlockUI() blockUI: NgBlockUI;

    constructor(public router: Router,
        private deviceService: DeviceService,
        protected localStorage: AsyncLocalStorage,
        private logger: LoggerService,
        private statsService: StatsService,
        private _ngZone: NgZone) {
    }

    ngOnInit() {

        this.blockUI.start('Loading device types...');

        const _self = this;
        this.statsService.statObservable$.subscribe(message => {
            this.deviceStats = message;
            this._ngZone.run(() => { });
        });

        this.localStorage.getItem<ProfileInfo>('profile').subscribe((profile) => {
            _self.profile = new ProfileInfo(profile);
            _self.loadDeviceTypes();
        });

    }

    loadDeviceTypes() {
        this.deviceService.getDeviceTypeStats().then((data: any) => {
            this.metrics = data;
            this.pages.total = Math.ceil(data.total / this.pages.pageSize);
            this.deviceService.getDeviceTypes((this.pages.current - 1)).then((types: DeviceType[]) => {
                this.blockUI.stop();
                this.deviceTypes = types;
            }).catch((err) => {
                this.blockUI.stop();
                swal(
                    'Oops...',
                    'Something went wrong! Unable to retrieve the devices.',
                    'error');
                this.logger.error('error occurred calling getAllDevices api, show message');
                this.logger.error(err);
            });
        }).catch((err) => {
            this.blockUI.stop();
            swal(
                'Oops...',
                'Something went wrong! Unable to retrieve the device statistics.',
                'error');
            this.logger.error('error occurred calling getDeviceStats api, show message');
            this.logger.error(err);
        });
    }

    refreshData() {
        this.blockUI.start('Loading device types...');
        this.loadDeviceTypes();
    }

    openDeviceType(typeId: string) {
        this.router.navigate([['/securehome/types', typeId].join('/')]);
    }

    formatDate(dt: string) {
        if (dt) {
            return moment(dt).format('MMM Do YYYY');
        } else {
            return '';
        }
    }

    nextPage() {
        this.pages.current++;
        this.blockUI.start('Loading device types...');
        this.loadDeviceTypes();
    }

    previousPage() {
        this.pages.current--;
        this.blockUI.start('Loading device types...');
        this.loadDeviceTypes();
    }

}
