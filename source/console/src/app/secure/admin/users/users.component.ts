import { Component, Input, OnInit, ViewChild, NgZone } from '@angular/core';
import { UserLoginService } from '../../../service/user-login.service';
import { FormGroup, FormBuilder, Validators, NgForm } from '@angular/forms';
import { User } from '../../../model/user';
import { AdminService } from '../../../service/admin.service';
import { Router } from '@angular/router';
import { ProfileInfo } from '../../../model/profileInfo';
import { Invitation } from '../../../model/invitation';
import { LocalStorage } from '@ngx-pwa/local-storage';
import { LoggerService } from '../../../service/logger.service';
import { StatsService } from '../../../service/stats.service';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import * as _ from 'underscore';
declare var jquery: any;
declare var $: any;
declare var swal: any;


@Component({
    selector: 'app-ratchet-users',
    templateUrl: './users.component.html'
})
export class UsersComponent implements OnInit { // implements LoggedInCallback {

    public title: string = 'Users';
    private users: User[] = [];
    public isAdminUser: boolean = false;
    public deviceStats: any = {};
    private profile: ProfileInfo;
    private name: string;
    private invite: Invitation;

    @BlockUI() blockUI: NgBlockUI;

    constructor(public router: Router,
        public userService: UserLoginService,
        private adminService: AdminService,
        protected localStorage: LocalStorage,
        private logger: LoggerService,
        private statsService: StatsService,
        private _ngZone: NgZone) {
        this.invite = new Invitation();
        this.invite.name = '';
        this.invite.email = '';
    }

    ngOnInit() {

        this.blockUI.start('Loading users...');

        const _self = this;
        this.statsService.statObservable$.subscribe(message => {
            this.deviceStats = message;
            this._ngZone.run(() => { });
        });

        this.localStorage.getItem<ProfileInfo>('profile').subscribe((profile) => {
            _self.profile = new ProfileInfo(profile);
            _self.isAdminUser = _self.profile.isAdmin();
            if (_self.profile.isAdmin()) {
                _self.loadUsers();
            }
        });

    }

    loadUsers() {
        this.adminService.getAllUsers().then((data: User[]) => {
            this.blockUI.stop();
            this.users = data;
        }).catch((err) => {
            this.blockUI.stop();
            swal(
                'Oops...',
                'Something went wrong! Unable to retrieve the users.',
                'error');
            this.logger.error('error occurred calling api, show message');
        });
    }

    refreshData() {
        this.blockUI.start('Loading users...');
        this.loadUsers();
    }

    openUser(username: string) {
        this.router.navigate([['/securehome/admin/users', username].join('/')]);
    }

    cancelInvite(form: NgForm) {
        form.reset();
        $('#inviteModal').modal('hide');
    }

    inviteUser(form: NgForm) {
        if (form.valid) {
            const _self = this;

            //check if user exists already
            const _exists = _.where(this.users, {
                email: form.value.email
            });

            if (_exists.length > 0) {
                this.invite.name = '';
                this.invite.email = '';
                this.blockUI.stop();
                swal(
                    'Oops...',
                    'It appears this user already exists. Please use an unregistered email address.',
                    'error');
                return;
            }

            const _invite: Invitation = {
                name: form.value.name,
                email: form.value.email,
                groups: [{
                    name: 'Members',
                    _state: 'new'
                }]
            };

            this.blockUI.start('Inviting user...');
            $('#inviteModal').modal('hide');
            this.adminService.inviteUser(_invite).then((result) => {
                this.invite.name = '';
                this.invite.email = '';
                _self.loadUsers();
            }).catch((err) => {
                this.blockUI.stop();
                swal(
                    'Oops...',
                    'Something went wrong! Unable to invite the user.',
                    'error');
                this.logger.error('[error] Error occurred calling updateUser API.');
            });
        }

    }

}
