import {createConnection} from "typeorm";
import Bull, { JobOptions } from 'bull';
import property from "../property.json"
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
    let redisHost = property["jobqueue-redis"].host
    if(process.env.NODE_ENV !== 'production') {
      redisHost = "localhost"
      defaultConnection.database ="designer-test"
    }
    await createConnection(defaultConnection).catch(error => console.log(error));
    await createConnection(datasetConnection).catch(error => console.log(error));

    await BullManager.Instance.setupQueues();

    console.log("Server starts");
  }
}