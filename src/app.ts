import {createConnection} from "typeorm";
import Bull from 'bull';
import propertyConfigs from "./config/propertyConfig"
import ormConfig from "./config/ormConfig";
import DataLoaderController from './DataLoaderController';
import MetaLoaderController from './MetaLoaderController';

export class Loader {
  dataLoaderQueue:Bull.Queue;
  metaLoaderQueue: Bull.Queue;
  
  constructor() {}

  setupDbAndServer = async () => {
    const defaultConnection = {
      ...ormConfig.defaultConnection
    }
    const datasetConnection = {
      ...ormConfig.datasetConnection
    }
    let redisHost = propertyConfigs.jobqueueRedis.host
    if(process.env.NODE_ENV !== 'production') {
      redisHost = "localhost"
      defaultConnection.database ="designer-test"
    }

    try {
      await createConnection(defaultConnection);
      await createConnection(datasetConnection);
    } catch(err) {
      console.log(err);
      process.exit(1);
    }

    console.log("Server starts");
    
    this.dataLoaderQueue = new Bull('dataLoader', {
      redis: {
        port: propertyConfigs.jobqueueRedis.port,
        host: redisHost
      }
    });

    this.metaLoaderQueue = new Bull('metaLoader', {
      redis: {
        port: propertyConfigs.jobqueueRedis.port,
        host: redisHost
      }
    });

    this.dataLoaderQueue.process((job, done) => DataLoaderController.loadData(job, done));
    this.dataLoaderQueue.on("failed", (job, err) => DataLoaderController.handleFailed(job, err));
    this.dataLoaderQueue.on("completed", (job) => DataLoaderController.handleCompleted(job));

    this.metaLoaderQueue.process((job, done) => MetaLoaderController.loadMeta(job, done));
  }
}