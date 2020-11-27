import { getConnection, getRepository } from "typeorm";
import DataLoadStrategy from "../lib/data-loader/DataLoadStrategy";
import MysqlStrategy from "../lib/data-loader/strategies/MysqlStrategy";
import CubridStrategy from "../lib/data-loader/strategies/CubridStrategy";
import XlsxStrategy from "../lib/data-loader/strategies/XlsxStrategy";
import CsvStrategy from "../lib/data-loader/strategies/CsvStrategy";
import DataLoader from "../lib/data-loader/DataLoader";
import { LoaderLog } from "../entity/manager/LoaderLog";
import { Stage, StageStatus } from "../entity/manager/Stage";
import { MetaStatus } from "../entity/manager/Meta";

/**
 * 데이터 적재를 담당하는 컨트롤러
 */
class DataLoaderController {
  /**
   * 데이터 적재를 하는 메소드
   * 
   * @param job Job queue 작업
   * @param done Callback
   */
  static async loadData(job, done) {
    const queryRunner = await getConnection().createQueryRunner();
    const stageRepo = getRepository(Stage);
    let stage:Stage;
    try {
      job.progress(1);
      await queryRunner.startTransaction();
      const data:DataLoaderJobData = job.data;
      stage = await stageRepo.findOneOrFail({
        relations: ["application", "metas", "metas.service", "metas.columns"],
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
      for(const meta of stage.metas) {
        if(meta.status != MetaStatus.DATA_LOAD_SCHEDULED) continue;
        //Load Data
        let loadStrategy: DataLoadStrategy;
        
        if(meta.dataType === 'dbms') {
          switch(meta.dbms) {
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
        } else if(meta.dataType === 'file' || meta.dataType === 'file-url') {
          switch(meta.extension) {
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
        await loader.load(stage, meta);
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
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 작업이 실패한 경우 실패 로그를 남기는 메소드
   * 
   * @param job 실패한 Job
   * @param err job이 실패할 때 발생한 오류
   */
  static async handleFailed(job, err) {
    try {
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
    } catch (err) {
      console.error(err);
    }
    
    //await job.remove();
  }

  /**
   * 작업이 정상적으로 완료 된 로그를 남기는 메소드
   * 
   * @param job 성공한 작업
   */
  static async handleCompleted(job) {
    try {
      const stageId = job.data.id;
      const stageRepo = getRepository(Stage);
      const logRepo = getRepository(LoaderLog);
      const stage:Stage = await stageRepo.findOneOrFail(stageId);

      const log = new LoaderLog();
      log.stage = stage;
      log.isFailed = false;
      await logRepo.save(log);
    } catch (err) {
      console.error(err);
    }
    
    //await job.remove();
  }
}

export default DataLoaderController;

interface DataLoaderJobData {
  id: number,
  userId: number
}