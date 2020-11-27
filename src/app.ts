import {createConnection} from "typeorm";
import Bull from 'bull';
import propertyConfigs from "./config/propertyConfig"
import ormConfig from "./config/ormConfig";

import BullManager from './lib/BullManager';

/**
 * Data Loader 클래스
 */
export class Loader {
  
  constructor() {}

  /**
   * Loader에서 사용할 DB를 설정
   */
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