
import { getManager } from 'typeorm';
import Crawler from '../lib/crawler/Crawler';

interface MetaLoaderJob {
  metaId: number,
  url: string,
  fileName: string
}
class CrawlerController {

  static async start(job, done) {
    const crawler = new Crawler();
    const jobs = []
    try {
      const applications = await crawler.start();
      await getManager().transaction("SERIALIZABLE", async transactionalEntityManager => {
        await transactionalEntityManager.save(applications);
        for(let application of applications) {
          application.stages.map( el => {el.applicationId = application.id})
          await transactionalEntityManager.save(application.stages);
          for(let stage of application.stages) {
            stage.metas.map(el => { el.stageId = stage.id })
            await transactionalEntityManager.save(stage.metas);
            for(let meta of stage.metas) {
              const job: MetaLoaderJob = {
                metaId: meta.id,
                url: meta.remoteFilePath,
                fileName: `${application.userId}-${Date.now()}.${meta.extension}`
              }
              jobs.push(job);
            }
          }
        }

        console.log(jobs);
      });
    } catch(err) {
      console.error(err);
      done(err);
    }
    
    done();
  }

}

export default CrawlerController;