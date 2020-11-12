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
      if(meta.status !== MetaStatus.DOWNLOAD_SCHEDULED) {
        const err = new Error("It's not a DOWNLOAD_SCHEDULED Status");
        done(err)
        return;
      }

      const url = job.data.url;
      const fileName = job.data.fileName;
      const filePath = propertyConfigs.uploadDist.localPath + "/" + fileName
      const writer = createWriteStream(filePath);
      job.progress(20);
      Axios({
        method: "get",
        url: url,
        responseType: 'stream'
      }).then(
        response => {
          job.progress(40);
          response.data.pipe(writer);
          let error = null;
          writer.on('error', err => {
            error = err;
            writer.close();
            done(err);
          });
          writer.on('close', async () => {
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
      done();
    } catch(err) {
      done(err);
    }
  }

  static async loadMetaFromFile(fileParam:MetaLoaderFileParam):Promise<any> {
    return new Promise( async (resolve, reject) => {
      try {
        let loadStrategy: MetaLoadStrategy;
        switch(fileParam.ext) {
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