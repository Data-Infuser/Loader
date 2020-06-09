import { getRepository } from "typeorm";
import cron, { ScheduledTask } from "node-cron";

import { Service, ServiceStatus } from '../../entity/manager/Service';
import { Application, ApplicationStatus } from '../../entity/manager/Application';
import { jobQueue, ScheduledJob } from "../job-queue";

class Scheduler {
    schedule: any;

    constructor() {
        this.schedule = {};
    }

    public async initialize(): Promise<any> {
        var self = this;

        const appRepo = getRepository(Application);
        const serviceRepo = getRepository(Service);
        
        try {
            const apps = await appRepo
                .createQueryBuilder('application')
                .leftJoinAndSelect('application.services', 'service')
                .leftJoinAndSelect('service.meta', 'meta')
                .leftJoinAndSelect('service.application', '_application')
                .leftJoinAndSelect('meta.columns', 'columns')
                .where('meta.dataType = :type', { type: "dbms" })
                .getMany();
    

            apps.forEach(async app => {
                app.status = ApplicationStatus.SCHEDULED;
                // appRepo.save(app);

                app.services.forEach(async service => {
                    service.status = ServiceStatus.SCHEDULED;
                    // serviceRepo.save(service);

                    await self.setSchedule(service);
                });
            });
        } catch(err) {
            console.log(err);
            return;
        }
    }

    public async setSchedule(service: Service): Promise<any> {
        const scheduleNm = await this.buildScheduleName(service);

        if (this.isScheduled(scheduleNm)) {
            var s = this.getSchedule(scheduleNm);
            s.stop();
            s.destroy();
        }

        const task = cron.schedule("* * * * * *", () => {
            let job = new ScheduledJob(service);
            jobQueue.enqueue(job);
        }, {
            scheduled: true,
            timezone: "Asia/Seoul"
        });

        task.start();

        this.schedule[scheduleNm] = task;
    }

    public async unsetSchedule(service: Service): Promise<any> {
        const scheduleNm = await this.buildScheduleName(service);

        if (this.isScheduled(scheduleNm)) {
            var s = this.getSchedule(scheduleNm);
            s.stop();
            s.destroy();
        }
    }

    public getScheduleList(): Array<string> {
        return Object.keys(this.schedule);
    }

    private getSchedule(scheduleNm: string): ScheduledTask {
        return this.schedule[scheduleNm];
    }

    private isScheduled(scheduleNm: string): boolean {
        return Object.keys(this.schedule).indexOf(scheduleNm) > 0;
    }

    private async buildScheduleName(service: Service): Promise<string> {
        if (service.application == undefined) {
            const serviceRepo = getRepository(Service);

            try {
                service = await serviceRepo.findOneOrFail({
                    relations: ["application", "meta", "meta.columns"],
                    where: {id: service.id}
                });
            } catch(err) {
                console.log(err);
                return;
            }
        }

        return `${service.application.nameSpace}/${service.entityName}`;
    }
}

export const scheduler = new Scheduler();