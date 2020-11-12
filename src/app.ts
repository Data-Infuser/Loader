import {createConnection} from "typeorm";
import Bull, { JobOptions } from 'bull';
import property from "../property.json"
import propertyConfigs from "./config/propertyConfig"
import ormConfig from "./config/ormConfig";
import DataLoaderController from './controller/DataLoaderController';
import MetaLoaderController from './controller/MetaLoaderController';
import CrawlerController from './controller/CrawlerController';
import BullManager from './lib/BullManager';

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

    await BullManager.Instance.setupQueues();

    console.log("Server starts");
  }
}