import {createConnection} from "typeorm";
import Bull from 'bull';
import property from "../property.json"

export class Application {
  dataLoaderQueue:Bull.Queue;

  constructor(controllers: any[]) {}

  setupDbAndServer = async () => {
      const conn = await createConnection().catch(error => console.log(error));
      const datasetConn = await createConnection('dataset').catch(error => console.log(error));

      this.dataLoaderQueue = new Bull('dataLoader', {
        redis: {
          port: property["jobqueue-redis"].port,
          host: property["jobqueue-redis"].host
        }
      });

      this.dataLoaderQueue.process(function(job, done) {
        const data = job.data;
        console.log(data);
        job.progress(100);
        done()
      })
  }
}