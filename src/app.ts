import {createConnection} from "typeorm";
import Bull, { JobOptions } from 'bull';
import property from "../property.json"
import ormConfig from "./config/ormConfig";
import DataLoaderController from './controller/DataLoaderController';
import MetaLoaderController from './controller/MetaLoaderController';
import CrawlerController from './controller/CrawlerController';

export class Loader {
  dataLoaderQueue:Bull.Queue;
  metaLoaderQueue: Bull.Queue;
  crawlerQueue: Bull.Queue;
  
  constructor() {}

  setupDbAndServer = async () => {
    const defaultConnection = {
      ...ormConfig.defaultConnection
    }
    const datasetConnection = {
      ...ormConfig.datasetConnection
    }
    let redisHost = property["jobqueue-redis"].host
    if(process.env.NODE_ENV !== 'production') {
      redisHost = "localhost"
      defaultConnection.database ="designer-test"
    }
    await createConnection(defaultConnection).catch(error => console.log(error));
    await createConnection(datasetConnection).catch(error => console.log(error));
    console.log("Server starts");
    
    this.dataLoaderQueue = new Bull('dataLoader', {
      redis: {
        port: property["jobqueue-redis"].port,
        host: redisHost
      }
    });

    this.metaLoaderQueue = new Bull('metaLoader', {
      redis: {
        port: property["jobqueue-redis"].port,
        host: redisHost
      }
    })

    this.crawlerQueue = new Bull('crawler', {
      redis: {
        port: property["jobqueue-redis"].port,
        host: redisHost
      }
    })

    // data loader
    this.dataLoaderQueue.process((job, done) => DataLoaderController.loadData(job, done))
    this.dataLoaderQueue.on("failed", (job, err) => DataLoaderController.handleFailed(job, err));
    this.dataLoaderQueue.on("completed", (job) => DataLoaderController.handleCompleted(job));

    // meta loader
    this.metaLoaderQueue.process((job, done) => MetaLoaderController.loadMeta(job, done));

    const jobOption:JobOptions = {
      repeat: {
        cron: '5 0 * * *'
      }
    }
    // await this.crawlerQueue.add({}, jobOption)
    await this.crawlerQueue.add({})

    this.crawlerQueue.process((job, done) => CrawlerController.start(job, done));
  }
}