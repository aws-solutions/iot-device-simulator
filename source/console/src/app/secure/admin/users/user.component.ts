import { Component, Input, OnInit, ViewChild, NgZone } from '@angular/core';
import { UserLoginService } from '../../../service/user-login.service';
import { User } from '../../../model/user';
import { Group } from '../../../model/group';
import { AdminService } from '../../../service/admin.service';
import { Router, ActivatedRoute } from '@angular/router';
import { ProfileInfo } from '../../../model/profileInfo';
import { Subscription } from 'rxjs/Subscription';
import * as _ from 'underscore';
import { AsyncLocalStorage } from 'angular-async-local-storage';
import { LoggerService } from '../../../service/logger.service';
import { StatsService } from '../../../service/stats.service';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import * as moment from 'moment';
declare var jquery: any;
declare var $: any;
declare var swal: any;

@Component({
    selector: 'app-ratchet-user',
    templateUrl: './user.component.html'
})
export class UserComponent implements OnInit {

    public cognitoId: string;
    public title: string = 'User';
    private user: User = new User();
    private groups: any = [];
    public isAdminUser: boolean = false;
    private username: string;
    private sub: Subscription;
    public deviceStats: any = {};
    private profile: ProfileInfo;

    @BlockUI() blockUI: NgBlockUI;

    constructor(public router: Router,
        public route: ActivatedRoute,
        public userService: UserLoginService,
        private adminService: AdminService,
        protected localStorage: AsyncLocalStorage,
        private logger: LoggerService,
        private statsService: StatsService,
        private _ngZone: NgZone) {
        this.logger.info('username from the url: ' + this.username);
    }

    ngOnInit() {

        this.sub = this.route.params.subscribe(params => {
            this.username = params['username'];
        });

        this.blockUI.start('Loading user...');

        const _self = this;
        this.statsService.statObservable$.subscribe(message => {
            this.deviceStats = message;
            this._ngZone.run(() => { });
        });
        this.statsService.refresh();

        this.localStorage.getItem<ProfileInfo>('profile').subscribe((profile) => {
            _self.profile = new ProfileInfo(profile);
            _self.isAdminUser = _self.profile.isAdmin();
            if (this.profile.isAdmin()) {
                this.loadGroupData().then(() => {
                    _self.loadUserData().then(() => {
                        this.blockUI.stop();
                    }).catch((err) => {
                        this.blockUI.stop();
                        swal(
                            'Oops...',
                            ['Something went wrong! Unable to retrieve the user ', _self.username, ' .'].join(''),
                            'error');
                    });
                }).catch((err) => {
                    this.blockUI.stop();
                    swal(
                        'Oops...',
                        'Something went wrong! Unable to retrieve the application groups.',
                        'error');
                });
            } else {
                this.blockUI.stop();
                this.router.navigate(['/securehome']);
            }
        });
    }

    loadUserData() {
        const _self = this;
        const promise = new Promise((resolve, reject) => {
            this.adminService.getUser(_self.username).then((data: User) => {
                _self.user = data;
                _self.title = ['User', data.name].join(': ');
                _self.setCurrentGroups();
                resolve();
            }).catch((err) => {
                this.logger.error('[error] Error occurred calling getUser API.');
                reject();
            });
        });
        return promise;
    }

    loadGroupData() {
        const _self = this;
        const promise = new Promise((resolve, reject) => {
            this.adminService.getGroups().then((data: Group[]) => {
                for (let i = 0; i < data.length; i++) {
                    _self.groups.push({
                        name: data[i].GroupName,
                        isMember: false
                    });
                }
                resolve();
            }).catch((err) => {
                this.logger.error('[error] Error occurred calling getGroups api');
                reject();
            });
        });
        return promise;
    }

    setCurrentGroups() {
        for (let i = 0; i < this.user.groups.length; i++) {
            for (let j = 0; j < this.groups.length; j++) {
                if (this.user.groups[i].name === this.groups[j].name) {
                    if (this.user.groups[i]._state) {
                        if (this.user.groups[i]._state !== 'deleted') {
                            this.groups[j].isMember = true;
                        } else {
                            this.groups[j].isMember = false;
                        }
                    } else {
                        this.groups[j].isMember = true;
                    }
                }
            }
        }
    }

    setGroup(group: any) {
        const grp = _.filter(this.user.groups, function(o: any) { return o.name === group.name; });
        if (grp.length > 0) {
            // this.user.groups = _.reject(this.user.groups, function(o: any) { return o.name === group.name; });
            grp[0]._state = 'deleted';
        } else {
            this.user.groups.push({
                name: group.name,
                _state: 'new'
            });
        }
    }


    formatDate(dt: string) {
        return moment(dt).format('MMM Do YYYY, h:mm:ss a');
    }

    disableUser() {
        const _self = this;
        this.blockUI.start('Disabling User...');
        this.adminService.disableUser(this.username).then((data: User) => {
            _self.loadUserData().then(() => {
                this.blockUI.stop();
            }).catch((err) => {
                this.blockUI.stop();
                swal(
                    'Oops...',
                    ['Something went wrong! Unable to retrieve the user ', _self.username, ' .'].join(''),
                    'error');
            });
        }).catch((err) => {
            this.blockUI.stop();
            swal(
                'Oops...',
                ['Something went wrong! Unable to disable the user ', _self.username, ' .'].join(''),
                'error');
            this.logger.error('[error] Error occurred calling diableUser API.');
        });
    }

    enableUser() {
        const _self = this;
        this.blockUI.start('Enabling User...');
        this.adminService.enableUser(this.username).then((data: User) => {
            _self.loadUserData().then(() => {
                this.blockUI.stop();
            }).catch((err) => {
                this.blockUI.stop();
                swal(
                    'Oops...',
                    ['Something went wrong! Unable to retrieve the user ', _self.username, ' .'].join(''),
                    'error');
            });
        }).catch((err) => {
            this.blockUI.stop();
            swal(
                'Oops...',
                ['Something went wrong! Unable to enable the user ', _self.username, ' .'].join(''),
                'error');
            this.logger.error('[error] Error occurred calling enableUser API.');
        });
    }

    deleteUser() {
        const _self = this;
        this.blockUI.start('Deleting User...');
        this.adminService.deleteUser(this.username).then(() => {
            this.blockUI.stop();
            this.router.navigate(['/securehome/admin/users']);
        }).catch((err) => {
            this.blockUI.stop();
            swal(
                'Oops...',
                ['Something went wrong! Unable to delete the user ', _self.username, ' .'].join(''),
                'error');
            this.logger.error('[error] Error occurred calling diableUser API.');
        });
    }

    saveUser(user: User) {
        const _self = this;
        this.blockUI.start('Updating User...');
        this.adminService.updateUser(this.user).then((data: User) => {
            _self.loadUserData().then(() => {
                this.blockUI.stop();
                swal(
                    'Complete.',
                    [_self.user.name, ' record was successfully updated..'].join(''),
                    'success');
            }).catch((err) => {
                this.blockUI.stop();
                swal(
                    'Oops...',
                    ['Something went wrong! Unable to retrieve the user ', _self.username, ' .'].join(''),
                    'error');
            });
        }).catch((err) => {
            this.blockUI.stop();
            swal(
                'Oops...',
                ['Something went wrong! Unable to enable the user ', _self.username, ' .'].join(''),
                'error');
            this.logger.error('[error] Error occurred calling updateUser API.');
        });
    }

    cancel() {
        this.router.navigate(['/securehome/admin/users']);
    }
}
