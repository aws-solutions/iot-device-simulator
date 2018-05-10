export class Group {
    GroupName: string;
    UserPoolId: string;
    Description: string;
    LastModifiedDate: string;
    CreationDate: string;

    constructor(values: Object = {}) {
        Object.assign(this, values);
    }

}
