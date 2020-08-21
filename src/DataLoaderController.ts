import { getConnection, getRepository } from "typeorm";
import { ServiceStatus } from "./entity/manager/Service";
import DataLoadStrategy from "./lib/data-loader/DataLoadStrategy";
import MysqlStrategy from "./lib/data-loader/strategies/MysqlStrategy";
import CubridStrategy from "./lib/data-loader/strategies/CubridStrategy";
import XlsxStrategy from "./lib/data-loader/strategies/XlsxStrategy";
import CsvStrategy from "./lib/data-loader/strategies/CsvStrategy";
import DataLoader from "./lib/data-loader/DataLoader";
import { LoaderLog } from "./entity/manager/LoaderLog";
import { Stage, StageStatus } from "./entity/manager/Stage";

class DataLoaderController {
  static async loadData(job, done) {
    const queryRunner = await getConnection().createQueryRunner();
    const stageRepo = getRepository(Stage);
    let stage:Stage;
    try {
      job.progress(1);
      await queryRunner.startTransaction();
      const data:DataLoaderJobData = job.data;
      stage = await stageRepo.findOneOrFail({
        relations: ["application", "services", "services.meta", "services.meta.columns"],
        where: {
          id: data.id
        }
      });

      job.progress(10);

      // Scheduled 상태가 아닌 Application의 경우 Error
      if(stage.status != StageStatus.SCHEDULED) {
        throw new Error('Application has not set as Scheduled job! check status!')
      }

      job.progress(20);

      //transaction start
      //Scheduled 상태의 Service만 선택하여, Data Load 진행
      for(const service of stage.services) {
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
        } else if(service.meta.dataType === 'file' || service.meta.dataType === 'file-url') {
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
        await loader.load(stage, service);
      }

      job.progress(80);

      stage.status = StageStatus.LOADED;
      await stageRepo.save(stage)
      job.progress(90);
      // transaction end
      await queryRunner.commitTransaction();
      job.progress(100);
      done()
    } catch (err) {
      console.error(err);
      await queryRunner.rollbackTransaction();
      if(stage) {
        stage.status = StageStatus.FAILED;
        await stageRepo.save(stage);
      }
      done(err);
    }
  }

  static async handleFailed(job, err) {
    const stageId = job.data.id;
    const stageRepo = getRepository(Stage);
    const logRepo = getRepository(LoaderLog);
    const stage:Stage = await stageRepo.findOneOrFail(stageId);
    stage.status = StageStatus.FAILED;

    const log = new LoaderLog();
    log.stage = stage;
    log.content = err.stack;
    log.message = err.message;
    log.isFailed = true;
    await logRepo.save(log);
    await stageRepo.save(stage);
    await job.remove();
  }

  static async handleCompleted(job) {
    const stageId = job.data.id;
    const stageRepo = getRepository(Stage);
    const logRepo = getRepository(LoaderLog);
    const stage:Stage = await stageRepo.findOneOrFail(stageId);

    const log = new LoaderLog();
    log.stage = stage;
    log.isFailed = false;
    await logRepo.save(log);
    await job.remove();
  }
}

export default DataLoaderController;

interface DataLoaderJobData {
  id: number,
  userId: number
}