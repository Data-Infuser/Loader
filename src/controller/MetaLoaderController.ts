import { getRepository, getManager } from "typeorm";
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
import { Stage, StageStatus } from "../entity/manager/Stage";
import BullManager from '../lib/BullManager';
import { debug } from "console";

/**
 * 메타 데이저 적재를 담당하는 컨트롤러
 */
class MetaLoaderController {

  static delayedDownload(job, done) {
    setTimeout(function() {
      MetaLoaderController.downloadFile(job, done);
    }, 700);
  }
  /**
   * file-url 타입인 데이터의 경우 원천 데이터를 파일 저장소로 다운로드 받는 메소드
   * 
   * @param job Job queue 작업
   * @param done Callback
   */
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
      
      job.progress(20);
      Axios({
        method: "get",
        url: url,
        responseType: 'stream'
      }).then(
        response => {
          job.progress(40);
          const { stream, path } = FileManager.Instance.createWriteStream(fileName)
          const uploadStream = response.data.pipe(stream);
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
              meta.filePath = path;
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

  /**
   * 상세 메타 정보를 적재하는 메소드
   * 
   * @param job Jobqueue 작업
   * @param done Callback
   */
  static async loadMeta(job, done) {
    debug("metaloader controller > start")
    try {
      const metaRepo = getRepository(Meta);
      const metaId = job.data.metaId;
      const meta = await metaRepo.findOne({
        relations: ["stage"],
        where: {
          id: metaId
        }
      });
      let loaderResult = await this.loadMetaFromSource(meta);;

      const loadedMeta: Meta = loaderResult.meta;
      const columns = loaderResult.columns;
      loadedMeta.dataType = meta.dataType;
      loadedMeta.remoteFilePath = meta.remoteFilePath;
      loadedMeta.id = meta.id;
      loadedMeta.status = MetaStatus.METALOADED;
      await getManager().transaction("SERIALIZABLE", async transactionalEntityManager => {
        await transactionalEntityManager.save(loadedMeta);
        await transactionalEntityManager.save(columns);
      });

      if(job.data.loadData) {
        // loadData가 있는 경우 문제가 없다면 바로 데이터를 적재
        const stageRepo = getRepository(Stage);
        const stage = await stageRepo.findOneOrFail({
          relations: ["metas", "application"],
          where: {
            id: meta.stage.id
          }
        })
        stage.status = StageStatus.SCHEDULED;
        stage.metas.forEach( meta => {
          meta.status = MetaStatus.DATA_LOAD_SCHEDULED;
        })
        await getManager().transaction("SERIALIZABLE", async transactionalEntityManager => {
          await transactionalEntityManager.save(stage);
          await transactionalEntityManager.save(stage.metas);
        });
        BullManager.Instance.dataLoaderQueue.add({
          id: stage.id,
          userId: stage.application.userId
        })
        debug("meta loader controller > add data loader done")
      }
      done();
    } catch (err) {
      done(err);
    }
    debug("metaloader controller > end")
  }

  /**
   * 원천 데이터(DBMS // 파일 데이터)의 상세 메타를 분석하고 적재하는 메소드<br>
   * 데이터 타입에 따라 분기하여 진행됨
   * 
   * @param meta 상세 메타를 분석할 Meta 객체
   * 
   * @returns 적재 결과
   */
  static async loadMetaFromSource(meta: Meta): Promise<any> {
    const fileOption: MetaLoaderFileParam = {
      title: meta.title,
      skip: meta.skip,
      sheet: meta.sheet,
      filePath: meta.filePath,
      originalFileName: meta.originalFileName,
      ext: meta.extension
    }
    switch (meta.dataType) { 
      case 'file':
        return Promise.resolve(await this.loadMetaFromFile(fileOption));
      case 'file-url':
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

  /**
   * DBMS 타입 데이터의 메타 분석을 진행하는 메소드
   * 
   * @param dbOption DB 연결 옵션
   * 
   * @returns loadResult
   */
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

  /**
   * File 타입 데이터의 메타 분석을 진행하는 메소드
   * 
   * @param fileParam 파일 정보
   * 
   * @returns loadResult
   */
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