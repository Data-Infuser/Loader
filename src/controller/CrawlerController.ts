
import { getConnection, getManager } from 'typeorm';
import Crawler from '../lib/crawler/Crawler';
import BullManager from '../lib/BullManager';

interface MetaLoaderJob {
  data: {
    metaId: number,
    url: string,
    fileName: string
  }
}
class CrawlerController {

  static async start(job, done) {
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
          for(let meta of stage.metas) {
            const job: MetaLoaderJob = {
              data: {
                metaId: meta.id,
                url: meta.remoteFilePath,
                fileName: `${application.userId}-${meta.id}-${Date.now()}.${meta.extension}`
              }
            }
            jobs.push(job);
          }
        }
      }
      BullManager.Instance.downloadQueue.addBulk(jobs);
      await queryRunner.commitTransaction();
    } catch(err) {
      await queryRunner.rollbackTransaction();
      console.error(err);
      done(err);
    } finally {
      await queryRunner.release();
    }
    done();
  }

}

export default CrawlerController;