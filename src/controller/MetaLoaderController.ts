import { getRepository, getManager } from "typeorm";
import property from "../../property.json"
import { Service } from "../entity/manager/Service";
import propertyConfigs from "../config/propertyConfig"
import { createWriteStream } from "fs";
import Axios from "axios";
import { Meta, MetaStatus } from "../entity/manager/Meta";
import MetaLoaderFileParam from "../lib/meta-loader/interfaces/MetaLoaderFileParam";
import MetaLoadStrategy from "../lib/meta-loader/MetaLoadStrategy";
import XlsxMetaLoadStrategy from "../lib/meta-loader/strategies/XlsxMetaLoadStrategy";
import CsvMetaLoadStrategy from "../lib/meta-loader/strategies/CsvMetaLoadStrategy";
import MetaLoader from "../lib/meta-loader/MetaLoader";
import MysqlMetaLoadStrategy from "../lib/meta-loader/strategies/MysqlMetaLoadStrategy";
import CubridMetaLoadStrategy from "../lib/meta-loader/strategies/CubridMetaLoadStrategy";
import MetaLoaderDbConnection from "../lib/meta-loader/interfaces/MetaLoaderDbConnection";
import FileManager from '../lib/file-manager/FileManager';

class MetaLoaderController {
  static async downloadFile(job, done) {
    try {
      job.progress(1);
      const metaRepo = getRepository(Meta);
      const meta = await metaRepo.findOneOrFail({
        where: {
          id: job.data.metaId
        }
      });
      job.progress(10);
      if (meta.status !== MetaStatus.DOWNLOAD_SCHEDULED) {
        const err = new Error("It's not a DOWNLOAD_SCHEDULED Status");
        done(err)
        return;
      }

      const url = job.data.url;
      const fileName = job.data.fileName;
      const filePath = propertyConfigs.uploadDist.localPath + "/" + fileName

      job.progress(20);
      Axios({
        method: "get",
        url: url,
        responseType: 'stream'
      }).then(
        response => {
          job.progress(40);
          const uploadStream = response.data.pipe(FileManager.Instance.saveStream(fileName));
          let error = null;
          uploadStream.on('error', err => {
            error = err;
            uploadStream.close();
            done(err);
          });
          uploadStream.on('close', async () => {
            if (!error) {
              job.progress(70);
              meta.status = MetaStatus.DOWNLOAD_DONE;
              meta.filePath = filePath;
              meta.originalFileName = fileName;
              await getManager().transaction("SERIALIZABLE", async transactionalEntityManager => {
                await transactionalEntityManager.save(meta);
              });
              job.progress(100);
              done();
            }
          });
        }
      ).catch(
        err => {
          done(err);
        }
      )
    } catch (err) {
      done(err);
    }
  }

  static async loadMeta(job, done) {
    try {
      const metaRepo = getRepository(Meta);
      const metaId = job.data.metaId;
      const meta = await metaRepo.findOne(metaId);
      let loaderResult = await this.loadMetaFromSource(meta);;

      const loadedMeta: Meta = loaderResult.meta;
      const columns = loaderResult.columns;
      loadedMeta.dataType = meta.dataType;
      loadedMeta.remoteFilePath = meta.remoteFilePath;
      loadedMeta.id = meta.id;
      await getManager().transaction("SERIALIZABLE", async transactionalEntityManager => {
        await transactionalEntityManager.save(loadedMeta);
        await transactionalEntityManager.save(columns);
      });
      done();
    } catch (err) {
      done(err);
    }
  }

  static async loadMetaFromSource(meta: Meta): Promise<any> {
    switch (meta.dataType) {
      case 'file' || 'file-url':
        const fileOption: MetaLoaderFileParam = {
          title: meta.title,
          skip: meta.skip,
          sheet: meta.sheet,
          filePath: meta.filePath,
          originalFileName: meta.originalFileName,
          ext: meta.extension
        }
        return Promise.resolve(await this.loadMetaFromFile(fileOption));
      case 'dbms':
        const dbOption: MetaLoaderDbConnection = {
          dbms: meta.dbms,
          username: meta.dbUser,
          password: meta.pwd,
          hostname: meta.host,
          port: meta.port,
          database: meta.db,
          tableNm: meta.table,
          title: meta.title
        }
        return Promise.resolve(await this.loadMetaFromDbms(dbOption));
      default:
        throw new Error('UnAcceptable Data Type');
    }
  }

  static async loadMetaFromDbms(dbOption: MetaLoaderDbConnection): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        let loadStrategy: MetaLoadStrategy;
        switch (dbOption.dbms) {
          case 'mysql':
            loadStrategy = new MysqlMetaLoadStrategy();
            break;
          case 'cubrid':
            loadStrategy = new CubridMetaLoadStrategy();
            break;
          default:
            throw new Error('UNACCEPTABLE_DBMS')
        }

        const metaLoader = new MetaLoader(loadStrategy);
        const loaderResult = await metaLoader.loadMeta(dbOption);
        resolve(loaderResult);
      } catch (err) {
        reject(err);
      }
    })

  }

  static async loadMetaFromFile(fileParam: MetaLoaderFileParam): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        let loadStrategy: MetaLoadStrategy;
        switch (fileParam.ext) {
          case 'xlsx':
            loadStrategy = new XlsxMetaLoadStrategy();
            break;
          case 'csv':
            loadStrategy = new CsvMetaLoadStrategy();
            break;
          default:
            throw new Error('UNACCEPTABLE_FILE_EXT')
        }
        const metaLoader = new MetaLoader(loadStrategy);
        const loaderResult = await metaLoader.loadMeta(fileParam);
        resolve(loaderResult)
      } catch (err) {
        reject(err);
      }
    })
  }
}

export default MetaLoaderController;