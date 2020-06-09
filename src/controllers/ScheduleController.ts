import { Service } from './../entity/manager/Service';
import { getRepository } from 'typeorm';
import { Request, Response, Router, NextFunction } from "express";
import { scheduler } from "../lib/scheduler";
import { jobQueue } from "../lib/job-queue";


export default class ScheduleController {
    public path = '/schedule';
    public router = Router();

    constructor() {
        this.initialRoutes();
    }

    public initialRoutes() {
        this.router.get("/:id", this.setSchedule);
    }

    setSchedule = async(req: Request, res: Response) => {
        const serviceRepo = getRepository(Service);
        const { id } = req.params;

        const service = await serviceRepo.findOne({
            relations: ["application"],
            where: {
                id: id
            }
        });

        await scheduler.setSchedule(service);

        res.json({"status": "success"});
    }
}