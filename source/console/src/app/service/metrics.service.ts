import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { CognitoUtil } from './cognito.service';
import { LoggerService } from './logger.service';




import * as _ from 'underscore';
declare var appVariables: any;

@Injectable()
export class MetricsService {

    constructor(private http: HttpClient, private cognito: CognitoUtil, private logger: LoggerService) {
    }

    public getDashboardMetrics() {
        const _self = this;

        const promise = new Promise((resolve, reject) => {
            this.cognito.getIdToken({
                callback() {
                },
                callbackWithParam(token: any) {
                    _self.logger.info(token);

                    _self.http
                        .get<any>([appVariables.APIG_ENDPOINT, 'metrics'].join('/'), {
                            headers: new HttpHeaders().set('Authorization', token)
                        })
                        .toPromise()
                        .then((metrics: any) => {
                            resolve(metrics);
                        },
                        (err: HttpErrorResponse) => {
                            if (err.error instanceof Error) {
                                // A client-side or network error occurred.
                                _self.logger.error('An error occurred:', err.error.message);
                            } else {
                                // The backend returned an unsuccessful response code.
                                // The response body may contain clues as to what went wrong,
                                _self.logger.error(`Backend returned code ${err.status}, body was: ${err.error}`);
                            }
                            reject(err);
                        }
                        );
                }
            });
        });

        return promise;
    }

}
