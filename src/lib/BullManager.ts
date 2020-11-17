import Bull, { JobOptions } from "bull";
import CrawlerController from "../controller/CrawlerController";
import DataLoaderController from "../controller/DataLoaderController";
import MetaLoaderController from "../controller/MetaLoaderController";
import propertyConfigs from "../config/propertyConfig"
import { Meta } from "../entity/manager/Meta";
import { getRepository } from "typeorm";
import MetaLoaderFileParam from "./meta-loader/interfaces/MetaLoaderFileParam";

export default class BullManager {

  private static _instance: BullManager;

  dataLoaderQueue: Bull.Queue;
  metaLoaderQueue: Bull.Queue;
  downloadQueue: Bull.Queue;
  crawlerQueue: Bull.Queue;

  constructor() {
    
    let redisHost = propertyConfigs.jobqueueRedis.host
    if(process.env.NODE_ENV !== 'production') {
      redisHost = "localhost"
    }

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
    })

    this.crawlerQueue = new Bull('crawler', {
      redis: {
        port: propertyConfigs.jobqueueRedis.port,
        host: redisHost
      }
    })

    this.downloadQueue = new Bull('download', {
      redis: {
        port: propertyConfigs.jobqueueRedis.port,
        host: redisHost
      }
    })

  }

  public static get Instance() {
    if(!this._instance) {
      this._instance = new BullManager();
    }
    return this._instance;
  }

  setupQueues = async () => {
    // data loader
    this.dataLoaderQueue.process((job, done) => DataLoaderController.loadData(job, done))
    this.dataLoaderQueue.on("failed", (job, err) => DataLoaderController.handleFailed(job, err));
    this.dataLoaderQueue.on("completed", (job) => DataLoaderController.handleCompleted(job));

    // meta loader
    this.metaLoaderQueue.process((job, done) => MetaLoaderController.loadMeta(job, done));

    //download
    this.downloadQueue.process((job, done) => MetaLoaderController.downloadFile(job, done));
    this.downloadQueue.on('completed', (job) =>{ this.metaLoaderQueue.add({metaId: job.data.metaId})});

    const jobOption:JobOptions = {
      repeat: {
        cron: '5 0 * * *'
      }
    }

    const jobRepoeatOption:JobOptions = {
      repeat: {
        every: 1,
        limit: 1
      }
    }
    // await this.crawlerQueue.add({}, jobOption)
    // await this.crawlerQueue.add({}, jobRepoeatOption)

    this.crawlerQueue.process((job, done) => CrawlerController.start(job, done));
  }
}