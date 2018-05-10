import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoggerService } from './service/logger.service';

@Component({
    selector: 'app-root',
    templateUrl: 'template/app.html'
})
export class AppComponent implements OnInit {

    constructor(
        public router: Router,
        private logger: LoggerService) {
        logger.info('AppComponent: constructor');
    }

    ngOnInit() {
        this.logger.info('AppComponent: Checking if the user is already authenticated');
    }

}
