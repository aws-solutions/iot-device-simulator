import { Component, Input, OnInit, ViewChild, NgZone } from '@angular/core';
import { FormGroup, FormBuilder, Validators, NgForm } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ProfileInfo } from '../../model/profileInfo';
import { Subscription } from 'rxjs/Subscription';
import { DeviceService } from '../../service/device.service';
import { StatsService } from '../../service/stats.service';
import * as _ from 'underscore';
import { AsyncLocalStorage } from 'angular-async-local-storage';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { LoggerService } from '../../service/logger.service';
import * as moment from 'moment';
declare var jquery: any;
declare var $: any;
declare var swal: any;
declare var Chartist: any;
declare var c3: any;


@Component({
    selector: 'app-ratchet-getstarted',
    templateUrl: './getstarted.component.html'
})
export class GetStartedComponent implements OnInit {

    public title: string = 'Home';
    private sub: Subscription;
    public deviceStats: any = {
        total: 0,
        simulations: 0
    };
    private profile: ProfileInfo = new ProfileInfo();

    @BlockUI() blockUI: NgBlockUI;

    constructor(public router: Router,
        public route: ActivatedRoute,
        private deviceService: DeviceService,
        protected localStorage: AsyncLocalStorage,
        private statsService: StatsService,
        private logger: LoggerService,
        private _ngZone: NgZone) {
    }

    ngOnInit() {
        const _self = this;
        this.statsService.statObservable$.subscribe(message => {
            this.deviceStats = message;
            this._ngZone.run(() => { });
        });
        this.statsService.refresh();

        this.localStorage.getItem<ProfileInfo>('profile').subscribe((profile) => {
            _self.profile = new ProfileInfo(profile);
        });
    }

    navTo(location: string) {
        this.router.navigate([location]);
    }

}
