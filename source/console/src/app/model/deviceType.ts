export class DeviceType {
    userId: string = '';
    typeId: string = '';
    custom: boolean = true;
    name: string = '';
    spec: {
        interval: number,
        duration: number,
        topic: string,
        payload: any,
        dataTopic: string
    };
    createdAt: string = '';
    updatedAt: string = '';

    constructor(values: Object = {}) {
        Object.assign(this, values);
    }

}
