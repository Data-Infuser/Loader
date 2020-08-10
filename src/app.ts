import {createConnection, getRepository, getConnection, getManager} from "typeorm";
import Bull from 'bull';
import property from "../property.json"
import { Application, ApplicationStatus } from "./entity/manager/Application";
import { ServiceStatus, Service } from "./entity/manager/Service";
import DataLoader from './lib/data-loader/DataLoader';
import DataLoadStrategy from "./lib/data-loader/DataLoadStrategy";
import MysqlStrategy from "./lib/data-loader/strategies/MysqlStrategy";
import XlsxStrategy from "./lib/data-loader/strategies/XlsxStrategy";
import CubridStrategy from "./lib/data-loader/strategies/CubridStrategy";
import CsvStrategy from "./lib/data-loader/strategies/CsvStrategy";
import { LoaderLog } from "./entity/manager/LoaderLog";
import ormConfig from "./config/ormConfig";
import axios from "axios";
import Axios from "axios";
import { createWriteStream } from "fs";

export class Loader {
  dataLoaderQueue:Bull.Queue;
  metaLoaderQueue: Bull.Queue;
  
  constructor() {}

  setupDbAndServer = async () => {
      await createConnection(ormConfig.defaultConnection).catch(error => console.log(error));
      await createConnection(ormConfig.datasetConnection).catch(error => console.log(error));
      console.log("Server starts");
      this.dataLoaderQueue = new Bull('dataLoader', {
        redis: {
          port: property["jobqueue-redis"].port,
          host: property["jobqueue-redis"].host
        }
      });

      this.metaLoaderQueue = new Bull('metaLoader', {
        redis: {
          port: property["jobqueue-redis"].port,
          host: property["jobqueue-redis"].host
        }
      })

      this.dataLoaderQueue.process(async function(job, done) {
        const queryRunner = await getConnection().createQueryRunner();
        const applicationRepo = getRepository(Application);
        let application:Application;
        try {
          job.progress(1);
          await queryRunner.startTransaction();
          const data:DataLoaderJobData = job.data;
          application = await applicationRepo.findOneOrFail({
            relations: ["services", "services.meta", "services.meta.columns"],
            where: {
              id: data.id
            }
          });

          job.progress(10);

          // Scheduled 상태가 아닌 Application의 경우 Error
          if(application.status != ApplicationStatus.SCHEDULED) {
            throw new Error('Application has not set as Scheduled job! check status!')
          }

          job.progress(20);

          //transaction start
          //Scheduled 상태의 Service만 선택하여, Data Load 진행
          for(const service of application.services) {
            if(service.status != ServiceStatus.SCHEDULED) continue;
            //Load Data
            let loadStrategy: DataLoadStrategy;
            
            if(service.meta.dataType === 'dbms') {
              switch(service.meta.dbms) {
                case 'mysql':
                  loadStrategy = new MysqlStrategy(queryRunner);
                  break;
                case 'cubrid':
                  loadStrategy = new CubridStrategy(queryRunner);
                  break;
                default:
                  console.log("unacceptable dbms")
                  throw new Error("unacceptable dbms");
              }
            } else if(service.meta.dataType === 'file') {
              switch(service.meta.extension) {
                case 'xlsx':
                  loadStrategy = new XlsxStrategy(queryRunner);
                  break;
                case 'csv':
                  loadStrategy = new CsvStrategy(queryRunner);
                  break;
                default:
                  console.log("unacceptable file extenseion")
                  throw new Error("unacceptable file extenseion");
              }
            } else {
              console.log("unacceptable dataType")
              throw new Error("unacceptable dataType")
            }
            const loader = new DataLoader(loadStrategy);
            await loader.load(application, service);
          }

          job.progress(80);

          application.status = ApplicationStatus.DEPLOYED;
          await applicationRepo.save(application)
          job.progress(90);
          // transaction end
          await queryRunner.commitTransaction();
          job.progress(100);
          done()
        } catch (err) {
          console.error(err);
          await queryRunner.rollbackTransaction();
          application.status = ApplicationStatus.FAILED;
          await applicationRepo.save(application);
          done(err);
        }
      })

      this.dataLoaderQueue.on("failed", async (job, err) => {
        const applicationId = job.data.id;
        const applicationRepo = getRepository(Application);
        const logRepo = getRepository(LoaderLog);
        const application:Application = await applicationRepo.findOneOrFail(applicationId);
        application.status = ApplicationStatus.IDLE;

        const log = new LoaderLog();
        log.application = application;
        log.content = err.stack;
        log.message = err.message;
        log.isFailed = true;
        await logRepo.save(log);
        await applicationRepo.save(application);
        await job.remove();
      })

      this.dataLoaderQueue.on("completed", async (job) => {
        const applicationId = job.data.id;
        const applicationRepo = getRepository(Application);
        const logRepo = getRepository(LoaderLog);
        const application:Application = await applicationRepo.findOneOrFail(applicationId);

        const log = new LoaderLog();
        log.application = application;
        log.isFailed = false;
        await logRepo.save(log);
        await job.remove();
      })

      this.metaLoaderQueue.process(async function(job, done) {
        try {
          job.progress(1);
          const serviceRepo = getRepository(Service);
          const service = await serviceRepo.findOneOrFail({
            relations: ["meta"],
            where: {
              id: job.data.serviceId
            }
          });
          job.progress(10);
          if(service.status !== ServiceStatus.METASCHEDULED) {
            const err = new Error("It's not a MetaScheduled Status");
            done(err)
            return;
          }

          const url = job.data.url;
          const fileName = job.data.fileName;
          const filePath = property["upload-dist"].localPath + "/" + fileName
          const writer = createWriteStream(filePath);
          job.progress(20);
          Axios({
            method: "get",
            url: url,
            responseType: 'stream'
          }).then(
            response => {
              job.progress(40);
              response.data.pipe(writer);
              let error = null;
              writer.on('error', err => {
                error = err;
                writer.close();
                done(err);
              });
              writer.on('close', async () => {
                if (!error) {
                  job.progress(70);
                  service.status = ServiceStatus.METADOWNLOADED;
                  service.meta.filePath = filePath;
                  service.meta.originalFileName = fileName;
                  await getManager().transaction("SERIALIZABLE", async transactionalEntityManager => {
                    await transactionalEntityManager.save(service);
                    await transactionalEntityManager.save(service.meta);
                  });
                  job.progress(100);
                  done();
                }
              });
            }
          )
        } catch (err) {
          done(err);
        }
      });
  }
}

interface DataLoaderJobData {
  id: number,
  userId: number
}