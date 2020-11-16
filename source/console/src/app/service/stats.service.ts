import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';


import { LoggerService } from './logger.service';
import { CognitoUtil } from './cognito.service';
import { environment } from '../../environments/environment';
import { DeviceService } from './device.service';
import * as moment from 'moment';
declare var AWS: any;


@Injectable()
export class StatsService {

    private stat: any = new Subject<any>();
    private pollerInterval: any = null;
    statObservable$ = this.stat.asObservable();

    constructor(
        private logger: LoggerService,
        private deviceService: DeviceService
    ) {
        const _self = this;
        this.loadStats();
        this.pollerInterval = setInterval(function() {
            _self.loadStats();
        }, environment.refreshInterval);
    }

    loadStats() {
        this.deviceService.getDeviceStats('').then((data: any) => {
            this.stat.next(data);
        }).catch((err) => {
            this.logger.error('error occurred calling getDeviceStats api, show message');
            this.logger.error(err);
        });
    }

    refresh() {
        this.loadStats();
    }

}
