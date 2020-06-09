import { getRepository } from "typeorm";
import cron from "node-cron";

import { Service, ServiceStatus } from '../../entity/manager/Service';
import { Application, ApplicationStatus } from '../../entity/manager/Application';

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

    constructor(service: Service) {
        this.service = service;
    }
}
export const jobQueue = new JobQueue();