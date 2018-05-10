import { Component, Input, OnInit, ViewChild, NgZone } from '@angular/core';
import { UserLoginService } from '../../../service/user-login.service';
import { FormGroup, FormBuilder, Validators, NgForm } from '@angular/forms';
import { AdminService } from '../../../service/admin.service';
import { Router } from '@angular/router';
import { ProfileInfo } from '../../../model/profileInfo';
import { Setting } from '../../../model/setting';
import { AsyncLocalStorage } from 'angular-async-local-storage';
import { LoggerService } from '../../../service/logger.service';
import { StatsService } from '../../../service/stats.service';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
declare var jquery: any;
declare var $: any;
declare var swal: any;

@Component({
    selector: 'app-ratchet-settings',
    templateUrl: './settings.component.html'
})
export class SettingsComponent implements OnInit { // implements LoggedInCallback {

    public title: string = 'System Settings';
    public isAdminUser: boolean = false;
    public deviceStats: any = {};
    public appConfig: Setting = new Setting();
    public appConfigError: boolean = false;
    public autoConfig: Setting = new Setting();
    public autoConfigError: boolean = false;
    public simEngineConfig: Setting = new Setting();
    public simEngineConfigError: boolean = false;
    private profile: ProfileInfo;
    private name: string;

    @BlockUI() blockUI: NgBlockUI;

    constructor(public router: Router,
        public userService: UserLoginService,
        private adminService: AdminService,
        protected localStorage: AsyncLocalStorage,
        private logger: LoggerService,
        private statsService: StatsService,
        private _ngZone: NgZone) {
    }

    ngOnInit() {

        this.blockUI.start('Loading settings...');

        const _self = this;
        this.statsService.statObservable$.subscribe(message => {
            this.deviceStats = message;
            this._ngZone.run(() => { });
        });

        this.localStorage.getItem<ProfileInfo>('profile').subscribe((profile) => {
            _self.profile = new ProfileInfo(profile);
            _self.isAdminUser = _self.profile.isAdmin();
            _self.loadAllSettings();
        });

    }

    loadAllSettings() {
        const _self = this;
        if (this.profile.isAdmin()) {
            this.loadGeneralSettings().then((data) => {
                _self.loadEngineSettings().then((data2) => {
                    _self.loadAutoSettings().then((data3) => {
                    });
                });
            });
        }
    }

    loadGeneralSettings(): Promise<any> {
        const _self = this;
        _self.appConfigError = false;
        const promise = new Promise((resolve, reject) => {
            this.adminService.getSettings('app-config').then((data: Setting) => {
                _self.blockUI.stop();
                _self.appConfig = data;
                resolve({});
            }).catch((err) => {
                _self.blockUI.stop();
                _self.appConfigError = true;
                _self.logger.error('error occurred calling getSettings api, show message');
                resolve({});
            });
        });
        return promise;
    }

    loadEngineSettings(): Promise<any> {
        const _self = this;
        _self.simEngineConfigError = false;
        const promise = new Promise((resolve, reject) => {
            this.adminService.getSettings('simulator').then((data: Setting) => {
                _self.blockUI.stop();
                _self.simEngineConfig = data;
                resolve({});
            }).catch((err) => {
                _self.blockUI.stop();
                _self.simEngineConfigError = true;
                _self.logger.error('error occurred calling getSettings api, show message');
                resolve({});
            });
        });
        return promise;
    }

    loadAutoSettings(): Promise<any> {
        const _self = this;
        _self.autoConfigError = false;
        const promise = new Promise((resolve, reject) => {
            this.adminService.getSettings('automotive').then((data: Setting) => {
                _self.blockUI.stop();
                _self.autoConfig = data;
                resolve({});
            }).catch((err) => {
                _self.blockUI.stop();
                _self.autoConfigError = true;
                _self.logger.error('error occurred calling getSettings api, show message');
                resolve({});
            });
        });
        return promise;
    }

    save(setting: Setting) {
        this.blockUI.start('Saving settings...');
        const _self = this;
        this.adminService.updateSettings(setting).then((data: any) => {
            _self.blockUI.stop();
            swal(
                'Settings Updated',
                'The settings were successfully updated.',
                'success').then((result) => {
                    _self.blockUI.start('Loading settings...');
                    _self.loadAllSettings();
                });
        }).catch((err) => {
            _self.blockUI.stop();
            swal(
                'Oops...',
                'Something went wrong! Unable to save your updated settings.',
                'error');
            _self.logger.error('error occurred calling updateSettings api, show message');
            _self.logger.error(err);
            _self.loadAllSettings();
        });
    }

}
