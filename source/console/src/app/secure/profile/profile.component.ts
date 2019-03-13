import { Component, Input, OnInit, ViewChild, NgZone } from '@angular/core';
import { FormGroup, FormBuilder, Validators, NgForm } from '@angular/forms';
import { UserLoginService } from '../../service/user-login.service';
import { Router, ActivatedRoute } from '@angular/router';
import { ProfileInfo } from '../../model/profileInfo';
import { Subscription } from 'rxjs/Subscription';
import { LoggerService } from '../../service/logger.service';
import { StatsService } from '../../service/stats.service';
import * as _ from 'underscore';
import { AsyncLocalStorage } from 'angular-async-local-storage';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import * as moment from 'moment';
declare var jquery: any;
declare var $: any;
declare var swal: any;

@Component({
    selector: 'app-ratchet',
    templateUrl: './profile.component.html'
})
export class ProfileComponent implements OnInit {

    public cognitoId: string;
    public title: string = 'My Profile';
    private sub: Subscription;
    public deviceStats: any = {};
    public profile: ProfileInfo = new ProfileInfo();
    public complexityError: boolean = false;
    public creds: any = {
        newpassword: '',
        confirmpassword: '',
        oldpassword: ''
    };

    @BlockUI() blockUI: NgBlockUI;

    constructor(public router: Router,
        public route: ActivatedRoute,
        public userService: UserLoginService,
        protected localStorage: AsyncLocalStorage,
        private statsService: StatsService,
        private logger: LoggerService,
        private _ngZone: NgZone) {
    }

    ngOnInit() {

        this.blockUI.start('Loading profile...');

        const _self = this;
        this.statsService.statObservable$.subscribe(message => {
            this.deviceStats = message;
            this._ngZone.run(() => { });
        });
        this.statsService.refresh();

        this.localStorage.getItem<any>('deviceStats').subscribe((stats) => {
            _self.deviceStats = stats;
        });

        this.localStorage.getItem<ProfileInfo>('profile').subscribe((profile) => {
            _self.profile = new ProfileInfo(profile);
            // refresh profile info
            _self.loadProfileData().then(() => {
                this.blockUI.stop();
            }).catch((err) => {
                this.blockUI.stop();
                swal(
                    'Oops...',
                    'Something went wrong! Unable to retrieve the user\'s profile.',
                    'error');
            });
        });
    }

    loadProfileData() {
        const _self = this;
        const promise = new Promise((resolve, reject) => {
            this.userService.getUserInfo().then((data) => {
                _self.profile = new ProfileInfo(data);
                this.localStorage.setItem('profile', data).subscribe(() => { });
                resolve();
            }).catch((err) => {
                this.logger.error('[error] Error occurred calling getUserInfo API.');
                reject();
            });
        });
        return promise;
    }

    cancelPasswordChange(form: NgForm) {
        this.router.navigate(['/securehome']);
    }

    changePassword(form: NgForm) {
        console.log(form)
        let regex1 = RegExp(/(?=^.{8,}$)(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?!.*\s).*$/, 'g');
        if (regex1.exec(this.creds.newpassword) === null) {
            this.complexityError = true;
            return;
        } else {
            this.complexityError = false;
            this.userService.changePassword(this.creds.oldpassword, this.creds.newpassword).then((data: any) => {
                swal(
                    'Done...',
                    'Your password has been successfully updates.',
                    'success');
                this.creds.newpassword = '';
                this.creds.confirmpassword = '';
                this.creds.oldpassword = '';
            }).catch((err) => {
                this.blockUI.stop();
                swal(
                    'Oops...',
                    'Something went wrong! Unable to change your password.',
                    'error');
                this.creds.newpassword = '';
                this.creds.confirmpassword = '';
                this.creds.oldpassword = ''; 
            });
        }
    }

    formatDate(dt: string) {
        return moment(dt).format('MMM Do YYYY, h:mm:ss a');
    }

}
