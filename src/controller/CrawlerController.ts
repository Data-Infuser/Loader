
import { getManager } from 'typeorm';
import Crawler from '../lib/crawler/Crawler';

class CrawlerController {

  static async start(job, done) {
    const crawler = new Crawler();
    
    try {

      const applications = await crawler.start();
      await getManager().transaction("SERIALIZABLE", async transactionalEntityManager => {
      });
    } catch(err) {
      console.error(err);
      done(err);
    }
    
    done();
  }

}

export default CrawlerController;