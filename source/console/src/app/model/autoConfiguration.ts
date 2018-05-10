export class AutoConfiguration {
    userId: string = '';
    typeId: string = '';
    custom: boolean = true;
    name: string = '';
    spec: any = {
        aggregationTransmissionTime: 90000,
        measurementPollerInterval: 2000,
        sendErrorData: true,
        sendTelemetryData: true,
        sendAggregatedData: true,
        dataAggregatedTopic: '',
        errorTopic: '',
        payload: '',
        dataTopic: '',
        telemetrySchema: [
            { attribute: 'name', value: 'measurement_name' },
            { attribute: 'value', value: 'measurement_value' },
            { attribute: 'vin', value: 'vin' },
            { attribute: 'trip_id', value: 'trip_id' },
            { attribute: 'timestamp', value: 'timestamp' }
        ]
    };
    createdAt: string = '';
    updatedAt: string = '';

    constructor(values: Object = {}) {
        Object.assign(this, values);
    }

}
