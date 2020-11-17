import { Component, Input, OnInit, OnDestroy, ViewChild, NgZone } from '@angular/core';
import { FormGroup, FormBuilder, Validators, NgForm } from '@angular/forms';
import { DeviceService } from '../../service/device.service';
import { Router } from '@angular/router';
import { SwalComponent } from '@toverux/ngx-sweetalert2';
import { ProfileInfo } from '../../model/profileInfo';
import { Device } from '../../model/device';
import { WidgetRequest } from '../../model/widgetRequest';
import { LocalStorage } from '@ngx-pwa/local-storage';
import { LoggerService } from '../../service/logger.service';
import { StatsService } from '../../service/stats.service';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { environment } from '../../../environments/environment';
import * as moment from 'moment';
import * as _ from 'underscore';
declare var jquery: any;
declare var $: any;
declare var swal: any;
declare var mapboxgl: any;

@Component({
    selector: 'app-ratchet',
    templateUrl: './fleet.component.html'
})
export class FleetComponent implements OnInit, OnDestroy {

    public title: string = 'My Automotive Fleet';
    public deviceStats: any = {};
    private profile: ProfileInfo;
    public fleet: Device[] = [];
    public allSelected: boolean = false;
    public widgetRequest: WidgetRequest = new WidgetRequest();
    private pollerInterval: any = null;
    public provisionCountError: boolean = false;
    public filterStages: string[] = ['< All >', 'provisioning', 'sleeping', 'stopping', 'running'];
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
    public filter: any = {
        category: 'automotive',
        subCategory: 'vehicle',
        stage: '< All >',
        deviceId: ''
    };

    @BlockUI() blockUI: NgBlockUI;

    constructor(public router: Router,
        private deviceService: DeviceService,
        protected localStorage: LocalStorage,
        private logger: LoggerService,
        private statsService: StatsService,
        private _ngZone: NgZone) {
    }

    ngOnInit() {

        this.blockUI.start('Loading fleet...');

        const _self = this;
        this.statsService.statObservable$.subscribe(message => {
            this.deviceStats = message;
            this._ngZone.run(() => { });
        });

        this.localStorage.getItem<ProfileInfo>('profile').subscribe((profile) => {
            _self.profile = new ProfileInfo(profile);
            _self.loadDevices();
            this.pollerInterval = setInterval(function() {
                _self.loadDevices();
            }, environment.refreshInterval);
        });

    }

    ngOnDestroy() {
        this.logger.info('destroying fleet page, attempting to remove poller.');
        clearInterval(this.pollerInterval);
    }

    loadDevices() {
        let _filter = { 
            ...this.filter
        };

        _filter.stage = _filter.stage === '< All >' ? '' : _filter.stage;
        _filter.stage = _filter.stage === 'running' ? 'hydrated' : _filter.stage;
        console.log(_filter)

        this.deviceService.getDeviceStats(_filter).then((data: any) => {
            this.metrics = data;
            this.pages.total = Math.ceil(data.total / this.pages.pageSize);
            this.deviceService.getAllDevices((this.pages.current - 1), _filter).then((devices: Device[]) => {
                if (this.allSelected) { 
                    this.allSelected = false;
                }
                this.blockUI.stop();
                this.fleet.length = 0;
                this.fleet = devices;
                for (let i = 0; i < this.fleet.length; i++) {
                    this.fleet[i].metadata.trip = '0 minutes';
                    if (this.fleet[i].stage === 'running') {
                        this.fleet[i].metadata.trip = moment.duration(moment().diff(moment(this.fleet[i].startedAt), 'minutes', true), 'minutes').humanize();
                    } else if (this.fleet[i].stage === 'sleeping' && this.fleet[i].endedAt) {
                        this.fleet[i].metadata.trip = moment.duration(moment(this.fleet[i].endedAt).diff(moment(this.fleet[i].startedAt), 'minutes', true), 'minutes').humanize();
                    }
                }
            }).catch((err) => {
                this.blockUI.stop();
                swal(
                    'Oops...',
                    'Something went wrong! Unable to retrieve the fleet.',
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

    selectAll() {
        const _self = this;
        this.fleet.forEach(function(d) {
            d.isSelected = _self.allSelected;
        });
    }

    getSelectedCount() {
        const _fleet = _.where(this.fleet, {
            isSelected: true
        });
        return (_fleet.length > 0);
    }

    startSelectedVehicles() {
        const _self = this;
        this.blockUI.start('Starting vehicles...');
        this.allSelected = false;
        const _devices = _.where(this.fleet, {
            isSelected: true,
            stage: 'sleeping'
        });

        let _counter = 0;
        let _errors = 0;
        if (_devices.length > 0) {
            _devices.forEach(function(device) {
                if(device.isSelected) {
                    _self.startDevice(device).then(() => {
                        _counter++;
                        if(_counter === _devices.length) {
                            if (_errors > 0) {
                                _self.blockUI.stop();
                                swal(
                                    'Oops...',
                                    'Unable to start some of the selected vehicles.',
                                    'info');
                                _self.logger.error('error occurred starting selected vehicles, show message');
                            }
                            _self.loadDevices();
                            _self.statsService.refresh();
                        }
                    }).catch((err) => {
                        _counter++;
                        _self.logger.error(err);
                        _errors++;
                        if(_counter === _devices.length) {
                            _self.blockUI.stop();
                            swal(
                                'Oops...',
                                'Unable to start some of the selected vehicles.',
                                'info');
                            _self.logger.error('error occurred starting selected vehicles, show message');
                            _self.loadDevices();
                            _self.statsService.refresh();
                        }
                    });
                }
            });
        } else {
            this.fleet.forEach(function(d) {
                d.isSelected = false;
            });
            this.blockUI.stop();
        }
 
    }


    stopSelectedVehicles() {
        const _self = this;
        this.blockUI.start('Stopping vehicles...');
        this.allSelected = false;
        const _devices = _.where(this.fleet, {
            isSelected: true,
            stage: 'hydrated'
        });

        let _counter = 0;
        let _devicesToUpdate = [];
        let _errors = 0;
        if (_devices.length > 0) {
            _devices.forEach(function(device) {
                if(device.isSelected) {
                    _counter++;
                    if (device.stage === 'hydrated') {
                        device.operation = 'stop';
                        _devicesToUpdate.push(device);
                    }
                    if (_devicesToUpdate.length === 20 || _counter === _devices.length) {
                        console.log(_devicesToUpdate.length)
                        let _sendDevices = [
                            ..._devicesToUpdate
                        ];
                        _devicesToUpdate.length = 0;
                        _self.bulkUpdateVehicles(_sendDevices).then(() => {
                            if(_counter === _devices.length) {
                                if (_errors > 0) {
                                    _self.blockUI.stop();
                                    swal(
                                        'Oops...',
                                        'Unable to stop some of the selected vehicles.',
                                        'info');
                                    _self.logger.error('error occurred stopping selected vehicles, show message');
                                }
                                _self.loadDevices();
                                _self.statsService.refresh();
                            }
                        }).catch((err) => {
                            _self.logger.error(err);
                            _devicesToUpdate.length = 0;
                            _errors++;
                            if(_counter === _devices.length) {
                                _self.blockUI.stop();
                                swal(
                                    'Oops...',
                                    'Unable to stop some of the selected vehicles.',
                                    'info');
                                _self.logger.error('error occurred stopping selected vehicles, show message');
                                _self.loadDevices();
                                _self.statsService.refresh();
                            }
                        });
                    }
                }
            });
        } else {
            this.fleet.forEach(function(d) {
                d.isSelected = false;
            });
            this.blockUI.stop();
        }
 
    }  

    startVehicle(vehicleId: string) {
        this.blockUI.start('Starting vehicle...');
        const device = _.where(this.fleet, {
            id: vehicleId
        });

        if (device.length > 0) {
            this.startDevice(device[0]).then(() => {
                this.loadDevices();
                this.statsService.refresh();
            }).catch((err) => {
                this.blockUI.stop();
                swal(
                    'Oops...',
                    'Something went wrong! Unable to start the vehicle.',
                    'error');
                this.logger.error('error occurred calling updateDevice api, show message');
                this.logger.error(err);
                this.loadDevices();
            });
        } else {
            this.blockUI.stop();
            this.loadDevices();
        }        
    }

    private bulkUpdateVehicles(devices: Device[]) {
        const _self = this;
        const promise = new Promise((resolve, reject) => {
            _self.deviceService.bulkUpdateDevices(devices).then((resp: any) => {
                console.log(resp)
                resolve();
            }).catch((err) => {
                console.log(err)
                reject(err);
            });
        });
        return promise;
    }

    private startDevice(device: Device) {
        const promise = new Promise((resolve, reject) => {
            if (device.stage === 'sleeping') {
                device.operation = 'hydrate';
                this.deviceService.updateDevice(device).then((resp: any) => {
                    resolve();
                }).catch((err) => {
                    reject(err);
                });
            }
        });
        return promise;
    }

    stopVehicle(vehicleId: string) {
        this.blockUI.start('Stopping vehicle...');
        const device = _.where(this.fleet, {
            id: vehicleId
        });

        if (device.length > 0) {
            if (device[0].stage === 'hydrated' || device[0].stage === 'provisioning') {
                device[0].operation = 'stop';
                this.deviceService.updateDevice(device[0]).then((resp: any) => {
                    this.loadDevices();
                }).catch((err) => {
                    this.blockUI.stop();
                    swal(
                        'Oops...',
                        'Something went wrong! Unable to stop the vehicle.',
                        'error');
                    this.logger.error('error occurred calling updateDevice api, show message');
                    this.logger.error(err);
                    this.loadDevices();
                });
            } else {
                this.blockUI.stop();
            }
        } else {
            this.blockUI.stop();
        }
    }

    refreshData() {
        this.blockUI.start('Loading fleet...');
        this.loadDevices();
    }

    search() {
        this.blockUI.start('Loading fleet...');
        this.pages.current = 1;
        this.loadDevices();
    }

    clear() {
        this.filter = {
            category: 'automotive',
            subCategory: 'vehicle',
            stage: '< All >',
            deviceId: ''
        };
        this.search();
    }

    openDevice(deviceId: string) {
        this.router.navigate([['/securehome/automotive/vehicle', deviceId].join('/')]);
    }

    formatDate(dt: string) {
        return moment(dt).format('MMM Do YYYY');
    }

    nextPage() {
        this.pages.current++;
        this.blockUI.start('Loading fleet...');
        this.loadDevices();
    }

    previousPage() {
        this.pages.current--;
        this.blockUI.start('Loading fleet...');
        this.loadDevices();
    }

    openVehicleAddModal() {
        this.widgetRequest = new WidgetRequest();
        this.provisionCountError = false;
        this.widgetRequest.typeId = 'automotive';
        $('#addModal').modal('show');
    }

    addVehicles(w: WidgetRequest) {
        this.provisionCountError = false;
        if (w.count > 100) {
            this.provisionCountError = true;
            return;
        }

        $('#addModal').modal('hide');
        this.blockUI.start('Provisioning vehicle...');
        this.deviceService.createDevice(w).then((resp: any) => {
            this.loadDevices();
            this.statsService.refresh();
        }).catch((err) => {
            this.blockUI.stop();
            swal(
                'Oops...',
                'Something went wrong! Unable to create the new vehicle.',
                'error');
            this.logger.error('error occurred calling createDevice api, show message');
            this.logger.error(err);
            this.loadDevices();
        });
    }

    deleteVehicle(vehicleId: string) {
        const _self = this;
        swal({
            title: 'Are you sure you want to delete this vehicle?',
            text: 'You won\'t be able to revert this!',
            type: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.value) {
                _self.blockUI.start('Deleting vehicle...');

                _self.deviceService.deleteDevice(vehicleId).then((resp: any) => {
                    _self.loadDevices();
                }).catch((err) => {
                    _self.blockUI.stop();
                    swal(
                        'Oops...',
                        'Something went wrong! Unable to delete the vehicle.',
                        'error');
                    _self.logger.error('error occurred calling deleteDevice api, show message');
                    _self.logger.error(err);
                    _self.loadDevices();
                });
            }
        });
    }

    cancelAddVehicles(form: NgForm) {
        $('#addModal').modal('hide');
    }

    customize() {
        this.router.navigate(['/securehome/automotive/customize']);
    }

}
