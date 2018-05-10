import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

import { Logger } from './logger.service';

export let isDebugMode = environment.isDebugMode;

const noop = (): any => undefined;

@Injectable()
export class ConsoleLoggerService implements Logger {

    get info() {
        if (isDebugMode) {
            return console.info.bind(console);
        } else {
            return noop;
        }
    }

    get warn() {
        if (isDebugMode) {
            return console.warn.bind(console);
        } else {
            return noop;
        }
    }

    get error() {
        if (isDebugMode) {
            return console.error.bind(console);
        } else {
            return noop;
        }
    }

    invokeConsoleMethod(type: string, args?: any): void {
        const logFn: Function = (console)[type] || console.log || noop;
        logFn.apply(console, [args]);
    }

}
