import {createConnection, getRepository, getConnection, getManager} from "typeorm";
import Bull from 'bull';
import property from "../property.json"
import { Application, ApplicationStatus } from "./entity/manager/Application";
import { ServiceStatus, Service } from "./entity/manager/Service";
import DataLoader from './lib/data-loader/DataLoader';
import DataLoadStrategy from "./lib/data-loader/DataLoadStrategy";
import MysqlStrategy from "./lib/data-loader/strategies/MysqlStrategy";
import XlsxStrategy from "./lib/data-loader/strategies/XlsxStrategy";
import CubridStrategy from "./lib/data-loader/strategies/CubridStrategy";
import CsvStrategy from "./lib/data-loader/strategies/CsvStrategy";
import { LoaderLog } from "./entity/manager/LoaderLog";
import ormConfig from "./config/ormConfig";
import axios from "axios";
import Axios from "axios";
import { createWriteStream } from "fs";
import DataLoaderController from './DataLoaderController';
import MetaLoaderController from './MetaLoaderController';

export class Loader {
  dataLoaderQueue:Bull.Queue;
  metaLoaderQueue: Bull.Queue;
  
  constructor() {}

  setupDbAndServer = async () => {
      await createConnection(ormConfig.defaultConnection).catch(error => console.log(error));
      await createConnection(ormConfig.datasetConnection).catch(error => console.log(error));
      console.log("Server starts");
      this.dataLoaderQueue = new Bull('dataLoader', {
        redis: {
          port: property["jobqueue-redis"].port,
          host: property["jobqueue-redis"].host
        }
      });

      this.metaLoaderQueue = new Bull('metaLoader', {
        redis: {
          port: property["jobqueue-redis"].port,
          host: property["jobqueue-redis"].host
        }
      })

      this.dataLoaderQueue.process((job, done) => DataLoaderController.loadData(job, done))
      this.dataLoaderQueue.on("failed", (job, err) => DataLoaderController.handleFailed(job, err));
      this.dataLoaderQueue.on("completed", (job) => DataLoaderController.handleCompleted(job));

      this.metaLoaderQueue.process((job, done) => MetaLoaderController.loadMeta(job, done));
  }
}