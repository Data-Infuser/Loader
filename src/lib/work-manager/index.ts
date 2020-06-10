import { getRepository } from 'typeorm';

import { jobQueue, ScheduledJob } from "../job-queue";


enum ManagerStatus {
    Stopped,
    Running,
    Stopping
}
enum WorkerStatus {
    Waiting,
    Running,
    Error
}


class WorkerManager {
    workers: Array<Worker>;
    status: ManagerStatus;

    constructor() {
        this.workers = new Array<Worker>();
        this.status = ManagerStatus.Stopped;
    }

    public initialize(numOfWorker: number): void {
        for (let i=0; i<numOfWorker; i++) {
            this.workers.push(new Worker());
        }
    }

    public start(): void {
        var self = this;
        this.status = ManagerStatus.Running;

        (async () => {
            while(true) {
                if (this.status == ManagerStatus.Stopping) {
                    this.status = ManagerStatus.Stopped;
                    break;
                }

                if (jobQueue.isExistJob()) {
                    let job = jobQueue.dequeue();
                    let worker = await self.getAvailableWorker();

                    worker.run(job);
                    continue;
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }) ();
    }

    public async getAvailableWorker(): Promise<Worker> {
        var self = this;

        while(true) {
            for (let worker of self.workers) {
                if (worker.isAvailable()) return worker;
            }

            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    public stop() {
        this.status = ManagerStatus.Stopping;
    }
}

class Worker {
    status: WorkerStatus;
    job: ScheduledJob;

    constructor() {
        this.status = WorkerStatus.Waiting;
    }

    public isAvailable(): boolean {
        return this.status == WorkerStatus.Waiting;
    }

    public async run(job: ScheduledJob): Promise<any> {
        this.status = WorkerStatus.Running;
        this.job = job;

        // To-Do data load 작업 작성

        this.status = WorkerStatus.Waiting;
    }
}

export const manager = new WorkerManager();