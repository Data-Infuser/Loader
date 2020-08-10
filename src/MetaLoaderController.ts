import { getRepository, getManager } from "typeorm";
import { Service, ServiceStatus } from "./entity/manager/Service";
import property from "../property.json"
import { createWriteStream } from "fs";
import Axios from "axios";

class MetaLoaderController {
  static async loadMeta(job, done) {
    try {
      job.progress(1);
      const serviceRepo = getRepository(Service);
      const service = await serviceRepo.findOneOrFail({
        relations: ["meta"],
        where: {
          id: job.data.serviceId
        }
      });
      job.progress(10);
      if(service.status !== ServiceStatus.METASCHEDULED) {
        const err = new Error("It's not a MetaScheduled Status");
        done(err)
        return;
      }

      const url = job.data.url;
      const fileName = job.data.fileName;
      const filePath = property["upload-dist"].localPath + "/" + fileName
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
              service.status = ServiceStatus.METADOWNLOADED;
              service.meta.filePath = filePath;
              service.meta.originalFileName = fileName;
              await getManager().transaction("SERIALIZABLE", async transactionalEntityManager => {
                await transactionalEntityManager.save(service);
                await transactionalEntityManager.save(service.meta);
              });
              job.progress(100);
              done();
            }
          });
        }
      )
    } catch (err) {
      done(err);
    }
  }
}

export default MetaLoaderController;