import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserRegistrationService } from '../../../service/user-registration.service';
import { UserLoginService } from '../../../service/user-login.service';
import { ProfileInfo } from '../../../model/profileInfo';
import { LocalStorage } from '@ngx-pwa/local-storage';
declare var jquery: any;
declare var $: any;

@Component({
    selector: 'app-ratchet',
    template: ''
})
export class LogoutComponent implements OnInit {

    constructor(public router: Router, protected localStorage: LocalStorage, public userService: UserLoginService) {
    }

    ngOnInit() {
        console.log('logging out and clearing local storage');
        this.localStorage.clear().subscribe(() => { });
        this.userService.logout();
        this.router.navigate(['/home/login']);
    }

}

@Component({
    selector: 'app-ratchet',
    templateUrl: './confirmRegistration.html'
})
export class RegistrationConfirmationComponent implements OnInit, OnDestroy {
    confirmationCode: string;
    email: string;
    errorMessage: string;
    private sub: any;

    constructor(public regService: UserRegistrationService, public router: Router, public route: ActivatedRoute) {
    }

    ngOnInit() {
        this.sub = this.route.params.subscribe(params => {
            this.email = params['username'];
        });

        this.errorMessage = null;

        $('.owl-carousel').owlCarousel({
            slideSpeed: 300,
            paginationSpeed: 400,
            singleItem: !0,
            autoPlay: !0
        });
    }

    ngOnDestroy() {
        this.sub.unsubscribe();
    }

    onConfirmRegistration() {
        this.errorMessage = null;
        this.regService.confirmRegistration(this.email, this.confirmationCode, this);
    }

    cognitoCallback(message: string, result: any) {
        if (message != null) {
            // error
            this.errorMessage = message;
            console.log('message: ' + this.errorMessage);
        } else {
            // success, move to the next step
            console.log('Moving to securehome');
            this.router.navigate(['/securehome']);
        }
    }
}
