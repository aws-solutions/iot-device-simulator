import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserRegistrationService } from '../../../service/user-registration.service';
import { CognitoCallback } from '../../../service/cognito.service';
import { LoggerService } from '../../../service/logger.service';
declare var jquery: any;
declare var $: any;

export class RegistrationUser {
    name: string;
    email: string;
    password: string;
}
/**
 * This component is responsible for displaying and controlling
 * the registration of the user.
 */
@Component({
    selector: 'app-ratchet',
    templateUrl: './registration.html'
})
export class RegisterComponent implements CognitoCallback, OnInit {
    registrationUser: RegistrationUser;
    router: Router;
    errorMessage: string;

    constructor(
        public userRegistration: UserRegistrationService,
        router: Router,
        private logger: LoggerService) {
        this.router = router;
    }

    ngOnInit() {
        this.registrationUser = new RegistrationUser();
        this.errorMessage = null;

        $('.owl-carousel').owlCarousel({
            slideSpeed: 300,
            paginationSpeed: 400,
            singleItem: !0,
            autoPlay: !0
        });
    }

    onRegister() {
        this.errorMessage = null;
        this.userRegistration.register(this.registrationUser, this);
    }

    cognitoCallback(message: string, result: any) {
        if (message != null) {
            // error
            this.errorMessage = message;
            this.logger.error('result: ' + this.errorMessage);
        } else {
            // success, move to the next step
            this.logger.info('redirecting');
            this.router.navigate(['/home/confirmRegistration', result.user.username]);
        }
    }
}
