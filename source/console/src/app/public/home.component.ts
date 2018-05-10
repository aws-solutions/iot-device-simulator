import { Component, OnInit } from '@angular/core';
import { LoggerService } from '../service/logger.service';

declare let AWS: any;
declare let AWSCognito: any;

@Component({
    selector: 'app-ratchet',
    templateUrl: './landinghome.html'
})
export class HomeLandingComponent {
    constructor() {
        console.log('HomeLandingComponent constructor');
    }
}

@Component({
    selector: 'app-ratchet-home',
    templateUrl: './home.html'
})
export class HomeComponent implements OnInit {

    constructor(private logger: LoggerService) {
    }

    ngOnInit() {

    }
}
