import { Component, Input, OnInit, OnDestroy, ViewChild, NgZone } from '@angular/core';
import { FormGroup, FormBuilder, Validators, NgForm } from '@angular/forms';
import { DeviceService } from '../../service/device.service';
import { Router } from '@angular/router';
import { SwalComponent } from '@toverux/ngx-sweetalert2';
import { ProfileInfo } from '../../model/profileInfo';
import { Device } from '../../model/device';
import { LoggerService } from '../../service/logger.service';
import { StatsService } from '../../service/stats.service';
import { AsyncLocalStorage } from 'angular-async-local-storage';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import * as moment from 'moment';
declare var jquery: any;
declare var $: any;
declare var swal: any;

@Component({
    selector: 'app-ratchet-my-devices',
    templateUrl: './mydevices.component.html'
})
export class MyDevicesComponent implements OnInit { // implements LoggedInCallback {

    public title: string = 'My Devices';
    public deviceStats: any = {};
    private profile: ProfileInfo;
    public devices: Device[] = [];
    public pages: any = {
        current: 1,
        total: 0,
        pageSize: 100
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

        this.blockUI.start('Loading devices...');

        const _self = this;
        this.statsService.statObservable$.subscribe(message => {
            this.deviceStats = message;
            this._ngZone.run(() => { });
        });

        this.localStorage.getItem<ProfileInfo>('profile').subscribe((profile) => {
            _self.profile = new ProfileInfo(profile);
            _self.loadDevices();
        });

    }

    loadDevices() {
        this.deviceService.getDeviceStats('').then((data: any) => {
            this.metrics = data;
            this.pages.total = Math.ceil(data.total / this.pages.pageSize);
            this.deviceService.getAllDevices((this.pages.current - 1), '').then((devices: Device[]) => {
                this.blockUI.stop();
                this.devices = devices;
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
        this.blockUI.start('Loading devices...');
        this.loadDevices();
    }

    openDevice(device: Device) {
        let trgt: string = '';
        if (device.category === 'automotive') {
            trgt = `/securehome/automotive/vehicle/${device.id}`;
        } else if (device.category === 'custom widget') {
            trgt = `/securehome/general/${device.id}`;
        }
        this.router.navigate([trgt]);
    }

    formatDate(dt: string) {
        return moment(dt).format('MMM Do YYYY');
    }

    nextPage() {
        this.pages.current++;
        this.blockUI.start('Loading devices...');
        this.loadDevices();
    }

    previousPage() {
        this.pages.current--;
        this.blockUI.start('Loading devices...');
        this.loadDevices();
    }

}
