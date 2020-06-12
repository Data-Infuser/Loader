import { Service } from '../../entity/manager/Service';

class JobQueue {
    queue: Array<ScheduledJob>;

    constructor() {
        this.queue = new Array<ScheduledJob>();
    }

    public isExistJob(): boolean {
        return this.queue.length != 0;
    }
    public dequeue(): ScheduledJob {
        const job = this.queue[0];
        this.queue = this.queue.splice(1);

        return job;
    }
    public enqueue(job: ScheduledJob): void {
        this.queue.push(job);
    }

    public getQueueList(): Array<string> {
        let results = [];

        this.queue.forEach((job) => {
            results.push(job.service.title);
        });

        return results;
    }
}

export class ScheduledJob {
    service: Service;
    queuedAt: Date;

    constructor(service: Service) {
        this.queuedAt = new Date();
        this.service = service;
    }
}
export const jobQueue = new JobQueue();