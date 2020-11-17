import propertyConfigs from "../../config/propertyConfig";
import FileManageStrategy from "./FileManageStrategy";
import { FsStrategy } from "./strategies/FsStrategy";
import { S3Strategy } from "./strategies/S3Strategy"


interface FileManagerOptions {
  type: string,
  awsConfigPath?: string,
  localPath?: string,
  s3Bucket?: string
}

class FileManager {

  private static _instance: FileManager;

  type: string
  awsConfigPath?: string
  localPath?: string

  fileManageStrategy: FileManageStrategy

  constructor(options:FileManagerOptions) {
    this.type = options.type;
    if(options.awsConfigPath) { this.awsConfigPath = options.awsConfigPath; }
    if(options.localPath) { this.localPath = options.localPath; }

    if(this.type === 's3') {
      this.fileManageStrategy = new S3Strategy(this.awsConfigPath, options.s3Bucket);
    }
    else if(this.type === 'local') {
      this.fileManageStrategy = new FsStrategy();
    }
  }

  public static get Instance() {
    if(!this._instance) {
      const config = propertyConfigs.uploadDist
      this._instance = new FileManager({
        type: config.type,
        awsConfigPath: config.awsConfigPath,
        localPath: config.localPath,
        s3Bucket: config.s3Bucket
      });
    }
    return this._instance;
  }

  async saveFile(path: string, file: Buffer) {
    return await this.fileManageStrategy.saveFile(path, file);
  }

  createWriteStream(path: string) {
    return this.fileManageStrategy.createWriteStream(path);
  }

  createReadStream(path: string) {
    return this.fileManageStrategy.createReadStream(path);
  }

}

export default FileManager;