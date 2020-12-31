
import { getConnection, getManager } from 'typeorm';
import Crawler from '../lib/crawler/Crawler';
import BullManager from '../lib/BullManager';
import { debug } from 'console';

interface MetaLoaderJob {
  data: {
    metaId: number,
    url: string,
    fileName: string,
    loadData: boolean
  }
}

/**
 * SOS 데이터를 수집 기능을 담당하는 컨트롤러
 */
class CrawlerController {

  /**
   * 데이터를 수집하고 Data-Infuser 자료구조에 맞게 데이터를 생성하는 메소드<br>
   * 기본 Meta 정보가 정상적으로 DB에 저장 된 경우 MedaLoad Job을 생성 후 MetaLoad Job Queue에 enqueue 함
   * 
   * @param job Job queue 작업
   * @param done Callback
   */
  static async start(job, done) {
    debug("crawler controller > start")
    const crawler = new Crawler();
    const jobs = []
    const queryRunner = await getConnection().createQueryRunner();
    try {
      const applications = await crawler.start();
      await queryRunner.startTransaction();
      await queryRunner.manager.save(applications);
      for(let application of applications) {
        application.stages.map( el => {el.applicationId = application.id})
        await queryRunner.manager.save(application.stages);
        for(let stage of application.stages) {
          stage.metas.map(el => { el.stageId = stage.id })
          await queryRunner.manager.save(stage.metas);
          const service = stage.metas.map(el => { 
            el.service.meta = el
            return el.service;
          })
          await queryRunner.manager.save(service);
          for(let meta of stage.metas) {
            const job: MetaLoaderJob = {
              data: {
                metaId: meta.id,
                url: meta.remoteFilePath,
                fileName: `${application.userId}-${meta.id}-${Date.now()}.${meta.extension}`,
                loadData: true
              }
            }
            jobs.push(job);
          }
        }
      }
      //BullManager.Instance.downloadQueue.addBulk(jobs);
      await queryRunner.commitTransaction();
    } catch(err) {
      try{
        await queryRunner.rollbackTransaction();
      }catch(err) {}
      console.error(err);
      done(err);
    } finally {
      await queryRunner.release();
    }
    done();
    debug("crawler controller > end")
  }

}

export default CrawlerController;