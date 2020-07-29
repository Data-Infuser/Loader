import {createConnection, getRepository, getConnection} from "typeorm";
import Bull from 'bull';
import property from "../property.json"
import { Application, ApplicationStatus } from "./entity/manager/Application";
import { ServiceStatus } from "./entity/manager/Service";
import DataLoader from './lib/data-loader/DataLoader';
import DataLoadStrategy from "./lib/data-loader/DataLoadStrategy";
import MysqlStrategy from "./lib/data-loader/strategies/MysqlStrategy";
import XlsxStrategy from "./lib/data-loader/strategies/XlsxStrategy";
import CubridStrategy from "./lib/data-loader/strategies/CubridStrategy";
import CsvStrategy from "./lib/data-loader/strategies/CsvStrategy";

export class Loader {
  dataLoaderQueue:Bull.Queue;
  
  constructor() {}

  setupDbAndServer = async () => {
      await createConnection().catch(error => console.log(error));
      await createConnection('dataset').catch(error => console.log(error));
      
      this.dataLoaderQueue = new Bull('dataLoader', {
        redis: {
          port: property["jobqueue-redis"].port,
          host: property["jobqueue-redis"].host
        }
      });

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

      this.dataLoaderQueue.on("failed", async (job) => {
        const applicationId = job.data.id;
        const applicationRepo = getRepository(Application);
        const application:Application = await applicationRepo.findOneOrFail(applicationId);
        application.status = ApplicationStatus.FAILED;
        await applicationRepo.save(application);
      })
  }
}

interface DataLoaderJobData {
  id: number,
  userId: number
}