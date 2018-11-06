export class Device {
    userId: string;
    id: string;
    category: string;
    subCategory: string;
    typeId: string;
    stage: string;
    runs: number;
    metadata: any;
    createdAt: string;
    updatedAt: string;
    lastRunAt: string;
    startedAt: string;
    endedAt: string;
    operation: string;
    isSelected: boolean  = false;

    constructor(values: Object = {}) {
        Object.assign(this, values);
    }

}
