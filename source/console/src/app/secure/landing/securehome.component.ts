import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserLoginService } from '../../service/user-login.service';
import { LoggedInCallback } from '../../service/cognito.service';
import { ProfileInfo } from '../../model/profileInfo';
import { Subscription } from 'rxjs/Subscription';
import { AsyncLocalStorage } from 'angular-async-local-storage';
import { DeviceService } from '../../service/device.service';
import { LoggerService } from '../../service/logger.service';
declare let jquery: any;
declare let $: any;
declare let _: any;

@Component({
    selector: 'app-ratchet',
    templateUrl: './secureHome.component.html'
})
export class SecureHomeComponent implements OnInit, LoggedInCallback {

    isAdminUser: boolean;
    profile: ProfileInfo = new ProfileInfo();
    loadedProfile: boolean;

    private profileSubscription: Subscription;

    constructor(
        public router: Router,
        public userService: UserLoginService,
        private deviceService: DeviceService,
        protected localStorage: AsyncLocalStorage,
        private logger: LoggerService) {
        this.logger.info('SecureHomeComponent: checking if user is authenticated');
        this.isAdminUser = false;
        this.loadedProfile = false;

        const _deviceStats = {
            total: 0,
            simulations: 0
        };
        this.localStorage.setItem('deviceStats', _deviceStats).subscribe(() => { });

        const _self = this;
        this.localStorage.getItem<ProfileInfo>('profile').subscribe((profile) => {
            if (profile) {
                _self.logger.info('SecureHomeComponent: profile exists, issuing no request profile');
                _self.profile = new ProfileInfo(profile);
                _self.isAdminUser = _self.profile.isAdmin();
                _self.userService.isAuthenticated(_self, false);
            } else {
                _self.logger.info('SecureHomeComponent: no profile found, requesting profile');
                _self.loadedProfile = true;
                _self.userService.isAuthenticated(_self, true);
            }
        });
    }

    ngOnInit() {

        this.prepUI();

    }

    prepUI() {
        // ==============================================================
        // This is for the top header part and sidebar part
        // ==============================================================
        const set = function() {
            const width = (window.innerWidth > 0) ? window.innerWidth : this.screen.width;
            const topOffset = 70;
            if (width < 1170) {
                $('body').addClass('mini-sidebar');
                $('.navbar-brand span').hide();
                $('.scroll-sidebar, .slimScrollDiv').css('overflow-x', 'visible').parent().css('overflow', 'visible');
                $('.sidebartoggler i').addClass('ti-menu');
            } else {
                $('body').removeClass('mini-sidebar');
                $('.navbar-brand span').show();
            }

            let height = ((window.innerHeight > 0) ? window.innerHeight : this.screen.height) - 1;
            height = height - topOffset;
            if (height < 1) {
                height = 1;
            }

            if (height > topOffset) {
                $('.page-wrapper').css('min-height', (height) + 'px');
            }

        };
        $(window).ready(set);
        $(window).on('resize', set);

        // ==============================================================
        // Theme options
        // ==============================================================
        $('.sidebartoggler').on('click', function() {
            if ($('body').hasClass('mini-sidebar')) {
                $('body').trigger('resize');
                $('.scroll-sidebar, .slimScrollDiv').css('overflow', 'hidden').parent().css('overflow', 'visible');
                $('body').removeClass('mini-sidebar');
                $('.navbar-brand span').show();
            } else {
                $('body').trigger('resize');
                $('.scroll-sidebar, .slimScrollDiv').css('overflow-x', 'visible').parent().css('overflow', 'visible');
                $('body').addClass('mini-sidebar');
                $('.navbar-brand span').hide();
            }
        });

        // topbar stickey on scroll

        $('.fix-header .topbar').stick_in_parent({});

        // this is for close icon when navigation open in mobile view
        $('.nav-toggler').click(function() {
            $('body').toggleClass('show-sidebar');
            $('.nav-toggler i').toggleClass('ti-menu');
            $('.nav-toggler i').addClass('ti-close');
        });

        // ==============================================================
        // Auto select left navbar
        // ==============================================================
        $(function() {
            const url = window.location;
            let element = $('ul#sidebarnav a').filter(function() {
                console.log(url.href, this.href)
                if (this.href.endsWith('securehome')) {
                    return this.href === url.href;
                } else {
                    return url.href.includes(this.href);
                }
            }).addClass('active').parent().addClass('active');
            while (true) {
                if (element.is('li')) {
                    element = element.parent().addClass('in').parent().addClass('active');
                } else {
                    break;
                }
            }

        });

        $(function() {
            $('#sidebarnav').metisMenu();
        });
    }

    isLoggedIn(message: string, isLoggedIn: boolean, profile: ProfileInfo) {
        if (!isLoggedIn) {
            this.router.navigate(['/home/login']);
        } else {
            if (this.loadedProfile) {
                this.localStorage.setItem('profile', profile).subscribe(() => { });
                this.profile = profile;
                this.isAdminUser = this.profile.isAdmin();

                const _self = this;
            }
        }

    }
}
