import { Component, Input, OnInit, ViewChild, NgZone } from '@angular/core';
import { FormGroup, FormBuilder, Validators, NgForm } from '@angular/forms';
import { UserLoginService } from '../../service/user-login.service';
import { Router, ActivatedRoute } from '@angular/router';
import { ProfileInfo } from '../../model/profileInfo';
import { Subscription } from 'rxjs';
import { DeviceService } from '../../service/device.service';
import { MetricsService } from '../../service/metrics.service';
import { StatsService } from '../../service/stats.service';
import * as _ from 'underscore';
import { LocalStorage } from '@ngx-pwa/local-storage';
import { LoggerService } from '../../service/logger.service';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import * as moment from 'moment';
declare var jquery: any;
declare var $: any;
declare var swal: any;
declare var Chartist: any;
declare var c3: any;


@Component({
    selector: 'app-ratchet',
    templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {

    public cognitoId: string;
    public title: string = 'My Dashboard';
    private sub: Subscription;
    public deviceStats: any = {
        total: 0,
        simulations: 0
    };
    private profile: ProfileInfo = new ProfileInfo();
    public reportDate: string = '';
    public reportMonth: string = '';
    public reportMonthSims: number = 0;
    public reportMonthHrs: number = 0;
    public deviceCounts: any = {
        total: 0,
        devices: []
    };
    public simulations: any = {
        total: 0,
        auto: 0,
        generic: 0,
        types: 0
    };
    public metrics: any = {
        monthlyRuns: [],
        deviceBreakdown: {},
        totalDuration: 0,
        totalRuns: 0
    };

    @BlockUI() blockUI: NgBlockUI;

    constructor(public router: Router,
        public route: ActivatedRoute,
        public userService: UserLoginService,
        private deviceService: DeviceService,
        private metricsService: MetricsService,
        protected localStorage: LocalStorage,
        private logger: LoggerService,
        private statsService: StatsService,
        private _ngZone: NgZone) {
    }

    ngOnInit() {

        this.blockUI.start('Loading dashboard...');
        this.reportDate = moment().format('ddd MMM Do YYYY');
        this.reportMonth = moment().format('MMMM YYYY');

        const _self = this;
        this.statsService.statObservable$.subscribe(message => {
            this.deviceStats = message;
            this._ngZone.run(() => { });
        });
        this.statsService.refresh();

        this.localStorage.getItem<ProfileInfo>('profile').subscribe((profile) => {
            _self.profile = new ProfileInfo(profile);
            this.loadDashboardMetrics();
        });
    }

    loadDashboardMetrics() {
        this.metricsService.getDashboardMetrics().then((data: any) => {
            this.metrics = data;
            this.deviceService.getDeviceStats({}, 'catstats').then((cstats: any) => {
                this.logger.info(cstats);
                this.setDeviceCategoryCounts(cstats);
                this.loadDashboardCharting();
            }).catch((err) => {
                this.loadDashboardCharting();
                this.logger.error('error occurred calling getDeviceStats api, show message');
                this.logger.error(err);
            });
        }).catch((err) => {
            this.blockUI.stop();
            swal(
                'Oops...',
                'Something went wrong! Unable to retrieve your dashboard metrics.',
                'error');
            this.logger.error('error occurred calling getDashboardMetrics api, show message');
            this.logger.error(err);
        });
    }

    setDeviceCategoryCounts(cstats: any) {
        let cs = [];
        for (let key in cstats) {
            if (key === 'total') {
                this.deviceCounts.total = cstats.total;
            } else {
                cs.push({
                    name: key,
                    count: cstats[key]
                });
            }
        }

        let bd = _.sortBy(cs, 'count');
        _.each(bd.reverse(), (stat) => {
            if (this.deviceCounts.devices.length === 3) {
                this.deviceCounts.devices.push({ name: 'Other', count: stat.count });
            } else if (this.deviceCounts.devices.length === 4) {
                this.deviceCounts.devices[3].count = this.deviceCounts.devices[3].count + stat.count;
            } else {
                this.deviceCounts.devices.push(stat);
            }
        });
    }

    loadDashboardCharting() {

        let auto_runs = [];
        let generic_runs = [];
        let labels = [];
        _.each(_.sortBy(this.metrics.monthlyRuns, 'id'), (month) => {
            labels.push(month.month);
            auto_runs.push(month.auto);
            generic_runs.push(month.generic);
        });

        const auto_max = _.max(auto_runs, function(run: number) { return run; });
        const generic_max = _.max(generic_runs, function(run: number) { return run; });
        this.simulations.auto = _.reduce(auto_runs, function(run: number, num: number) { return run + num; }, 0);
        this.simulations.generic = _.reduce(generic_runs, function(run: number, num: number) { return run + num; }, 0);
        this.simulations.total = this.simulations.auto + this.simulations.generic;
        this.simulations.types = this.metrics.deviceBreakdown.simulations.length;

        const monthstats = _.where(this.metrics.monthlyRuns, { id: moment().format('YYYYMM') });
        if (monthstats.length > 0) {
            this.reportMonthSims = monthstats[0].runs;
            this.reportMonthHrs = monthstats[0].auto + monthstats[0].generic;
        }

        let monthDeviceRunBreakdown: any = [];
        let breakdown = _.sortBy(this.metrics.deviceBreakdown.simulations, 'runs');
        _.each(breakdown.reverse(), (device) => {
            if (monthDeviceRunBreakdown.length === 3) {
                monthDeviceRunBreakdown.push(['Other', device.runs]);
            } else if (monthDeviceRunBreakdown.length === 4) {
                monthDeviceRunBreakdown[3][1] = monthDeviceRunBreakdown[3][1] + device.runs;
            } else {
                monthDeviceRunBreakdown.push([device.category, device.runs]);
            }
        });

        const chrt = new Chartist.Line('.sim-hours', {
            labels: labels
            , series: [
                auto_runs,
                generic_runs
            ]
        }, {
                high: (auto_max > generic_max ? auto_max : generic_max)
                , low: 0
                , showArea: true
                , fullWidth: true
                , plugins: [
                    Chartist.plugins.tooltip()
                ], // As this is axis specific we need to tell Chartist to use whole numbers only on the concerned axis
                axisY: {
                    onlyInteger: true
                    , offset: 20
                    , labelInterpolationFnc: function(value) {
                        return (value / 1);
                    }
                }
            });

        let chart = c3.generate({
            bindto: '#runs',
            data: {
                columns: monthDeviceRunBreakdown,

                type: 'donut',
            },
            donut: {
                label: {
                    show: false
                },
                title: 'Simulations',
                width: 20,

            },
            legend: {
                hide: true
            },
            color: {
                pattern: ['#745af2', '#26c6da', '#1e88e5', '#eceff1']
            }
        });

        const totHours = new Chartist.Line('.usage', {
            labels: ['0', '4', '8', '12', '16', '20', '24', '30']
            , series: [
                [5, 0, 12, 1, 8, 3, 12, 15]

            ]
        }, {
                high: 10
                , low: 0
                , showArea: true
                , fullWidth: true
                , plugins: [
                    Chartist.plugins.tooltip()
                ], // As this is axis specific we need to tell Chartist to use whole numbers only on the concerned axis
                axisY: {
                    onlyInteger: true
                    , offset: 20
                    , showLabel: false
                    , showGrid: false
                    , labelInterpolationFnc: function(value) {
                        return (value / 1) + 'k';
                    }
                }
                , axisX: {
                    showLabel: false
                    , divisor: 1
                    , showGrid: false
                    , offset: 0
                }
            });

        // ==============================================================
        // Download count
        // ==============================================================
        let sparklineLogin = function() {
            $('.spark-count').sparkline([4, 5, 0, 10, 9, 12, 4, 9, 4, 5, 3, 10, 9, 12, 10, 9, 12, 4, 9], {
                type: 'bar'
                , width: '100%'
                , height: '70'
                , barWidth: '2'
                , resize: true
                , barSpacing: '6'
                , barColor: 'rgba(255, 255, 255, 0.3)'
            });
        };

        sparklineLogin();

        this.blockUI.stop();
    }

    formatDate(dt: string) {
        return moment(dt).format('MMM Do YYYY, h:mm:ss a');
    }

    openDevices() {
        this.router.navigate(['/securehome/devices']);
    }

}
