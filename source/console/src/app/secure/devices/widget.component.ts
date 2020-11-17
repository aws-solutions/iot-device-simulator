import { Component, Input, OnInit, OnDestroy, ViewChild, NgZone } from '@angular/core';
import { FormGroup, FormBuilder, Validators, NgForm } from '@angular/forms';
import { DeviceService } from '../../service/device.service';
import { Device } from '../../model/device';
import { DeviceType } from '../../model/deviceType';
import { Router, ActivatedRoute } from '@angular/router';
import { ProfileInfo } from '../../model/profileInfo';
import { LocalStorage } from '@ngx-pwa/local-storage';
import { LoggerService } from '../../service/logger.service';
import { MQTTService } from '../../service/mqtt.service';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { Subscription } from 'rxjs';
import { Message } from '../../model/message';
import { environment } from '../../../environments/environment';
import { StatsService } from '../../service/stats.service';
import * as moment from 'moment';
declare var jquery: any;
declare var $: any;
declare var swal: any;

@Component({
    selector: 'app-ratchet-widget',
    templateUrl: './widget.component.html'
})
export class WidgetComponent implements OnInit, OnDestroy { // implements LoggedInCallback {

    public title: string = 'Device Widget';
    public deviceId: string;
    public deviceStats: any = {};
    private profile: ProfileInfo;
    private sub: Subscription;
    public device: Device = new Device();
    public deviceType: DeviceType = new DeviceType();
    public messages: Message[] = [];
    public subscribeMessage = '';
    private pollerInterval: any = null;

    @BlockUI() blockUI: NgBlockUI;

    constructor(public router: Router,
        public route: ActivatedRoute,
        private deviceService: DeviceService,
        protected localStorage: LocalStorage,
        private logger: LoggerService,
        private mqttService: MQTTService,
        private statsService: StatsService,
        private _ngZone: NgZone) {
    }

    ngOnInit() {

        this.sub = this.route.params.subscribe(params => {
            this.deviceId = params['deviceId'];
        });

        this.blockUI.start('Loading device...');

        const _self = this;
        this.statsService.statObservable$.subscribe(message => {
            this.deviceStats = message;
            this._ngZone.run(() => { });
        });
        this.statsService.refresh();

        this.localStorage.getItem<ProfileInfo>('profile').subscribe((profile) => {
            _self.profile = new ProfileInfo(profile);
            _self.loadDevice();
            this.pollerInterval = setInterval(function() {
                _self.loadDevice();
            }, environment.refreshInterval);
        });

    }

    ngOnDestroy() {
        this.logger.info('destroying widget page, attempting to remove poller.');
        clearInterval(this.pollerInterval);
    }

    loadDevice() {
        const _self = this;
        this.deviceService.getDevice(this.deviceId).then((d: Device) => {
            this.device = d;
            if (this.deviceType.typeId === '') {
                _self.deviceService.getDeviceType(_self.device.typeId).then((type: DeviceType) => {
                    _self.blockUI.stop();
                    _self.deviceType = new DeviceType(type);

                    if (this._canSubscribeToTopic(_self.deviceType.spec.topic)) {
                        this.mqttService.subscribe(_self.deviceType.spec.topic);
                        // * listen to the MQTT stream
                        _self.mqttService.messageObservable$.subscribe(message => {
                            if (message.topic.startsWith(_self.deviceType.spec.topic) && message.content._id_ === _self.device.id) {
                                _self.messages.unshift(message);
                                _self._ngZone.run(() => { });
                            }
                        });
                    }
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
                'Something went wrong! Unable to retrieve the device.',
                'error');
            this.logger.error('error occurred calling getDevice api, show message');
            this.logger.error(err);
        });
    }

    startDevice() {
        this.blockUI.start('Starting device...');
        const _self = this;

        if (this.device.stage === 'sleeping') {
            this.device.operation = 'hydrate';
            this.deviceService.updateDevice(this.device).then((resp: any) => {
                _self.loadDevice();
            }).catch((err) => {
                this.blockUI.stop();
                swal(
                    'Oops...',
                    'Something went wrong! Unable to start the widget.',
                    'error');
                this.logger.error('error occurred calling updateDevice api, show message');
                this.logger.error(err);
                this.loadDevice();
            });
        }
    }

    stopDevice() {
        this.blockUI.start('Stopping device...');
        const _self = this;
        if (this.device.stage === 'hydrated') {
            this.device.operation = 'stop';
            this.deviceService.updateDevice(this.device).then((resp: any) => {
                _self.loadDevice();
            }).catch((err) => {
                this.blockUI.stop();
                swal(
                    'Oops...',
                    'Something went wrong! Unable to stop the widget.',
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
            title: 'Are you sure you want to delete this widget?',
            text: 'You won\'t be able to revert this!',
            type: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.value) {
                _self.blockUI.start('Deleting device...');

                _self.deviceService.deleteDevice(_self.device.id).then((resp: any) => {
                    this.router.navigate(['/securehome/general']);
                }).catch((err) => {
                    _self.blockUI.stop();
                    swal(
                        'Oops...',
                        'Something went wrong! Unable to delete the widget.',
                        'error');
                    _self.logger.error('error occurred calling deleteDevice api, show message');
                    _self.logger.error(err);
                    _self.loadDevice();
                });
            }
        });
    }

    refreshData() {
        this.blockUI.start('Loading device...');
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

    _canSubscribeToTopic(topic: string) {
        const _regex = /\$\{(\w+)\}/g; // matches ${name}
        let _result = true;

        let _found = topic.match(_regex);
        if (_found) {
            this.subscribeMessage = `Unable to subscribe to device type topics with attribute variables in the definition.  [ ${topic} ]`;
            _result = false;
        }

        return _result;
    }

}
