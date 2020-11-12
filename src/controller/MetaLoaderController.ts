import { getRepository, getManager } from "typeorm";
import property from "../../property.json"
import { Service } from "../entity/manager/Service";
import propertyConfigs from "../config/propertyConfig"
import { createWriteStream } from "fs";
import Axios from "axios";
import { Meta, MetaStatus } from "../entity/manager/Meta";

class MetaLoaderController {
  static async loadMeta(job, done) {
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
}

export default MetaLoaderController;