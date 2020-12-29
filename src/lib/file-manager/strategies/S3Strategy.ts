import * as AWS from 'aws-sdk';
import { GetObjectRequest, PutObjectRequest } from 'aws-sdk/clients/s3';
import fs from "fs";
import { Readable } from 'typeorm/platform/PlatformTools';
import * as stream from "stream";
import FileManageStrategy from '../FileManageStrategy';

/**
 * S3 저장소에 파일을 관리하기 위한 Strategy
 */
export class S3Strategy implements FileManageStrategy {
  s3: AWS.S3
  bucket: string
  constructor(configPath: string, bucket: string, type: string) {
    if (configPath !== 'env') {
      AWS.config.loadFromPath(configPath);
    }
    this.bucket = bucket;


    if (type === 'ncloud') {
      // ncloud 공공존인 경우 추가 설정이 필요
      this.s3 = new AWS.S3({
        endpoint: 'https://kr.object.gov-ncloudstorage.com'
      });
    } else {
      this.s3 = new AWS.S3();
    }
    
  }

  saveFile(path:string, file: Buffer):Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        const objReq: PutObjectRequest = {
          Bucket: this.bucket,
          Key: path,
          Body: file
        }
  
        this.s3.upload(objReq, function (err, data) {
          if (err) { reject(err); }
          else { resolve(data.Key); }
        })
      } catch (err) {
        reject(err);
      }
    })
  }

  createReadStream(path: string): Readable {
    const objReq: GetObjectRequest = {
      Bucket: this.bucket,
      Key: path
    }
    const stream = this.s3.getObject(objReq).createReadStream();
    return stream;
  }

  createWriteStream(path: string) : { stream: Readable, path: string } {
    const Body = new stream.PassThrough();

    this.s3.upload({
      Bucket: this.bucket,
      Key: path,
      Body
    })
    .on('httpUploadProgress', progress => {
        // console.log('progress', progress);
    })
    .send((err, data) => {
      if (err) {
        Body.destroy(err);
      } else {
        // console.log(`File uploaded and available at ${data.Location}`);
        Body.destroy();
      }
    });

    return {
      stream: Body,
      path: path
    }
  }
}