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

/**
 * 프로젝트 파일 관리를 위한 FileManager Class<br>
 * 프로젝트 설정에 따라 S3 또는 Server localpath에 파일 쓰기/읽기를 수행<br>
 * Stream 기반의 구현을 통해 S3, local 에서 동일한 방식으로 파일에 접근 가능<br>
 * Singleton pattern으로 구현됨
 */
class FileManager {

  /**
   * Singleton 인스턴스
   */
  private static _instance: FileManager;

  /**
   * 프로젝트에서 사용중인 File 관리 타입 s3/local
   */
  type: string
  /**
   * AWS config 파일의 경로. s3 타입인 경우 사용됨
   */
  awsConfigPath?: string
  /**
   * local 파일을 저장할 경로. local 타입인 경우 사용됨
   */
  localPath?: string
  /**
   * Strategy pattern을 사용하여 S3/local Strategy를 해당 프로퍼티로 사용
   */
  fileManageStrategy: FileManageStrategy


  /**
   * 프로젝트 설정에 따라 S3 또는 local 관련 설정을 하고, Strategy를 생성한다.
   * 
   * @param options 프로젝트 config
   */
  constructor(options:FileManagerOptions) {
    this.type = options.type;
    if(options.awsConfigPath) { this.awsConfigPath = options.awsConfigPath; }
    if(options.localPath) { this.localPath = options.localPath; }

    if(this.type === 's3' || this.type === 'ncloud') {
      this.fileManageStrategy = new S3Strategy(this.awsConfigPath, options.s3Bucket, this.type);
    }
    else if(this.type === 'local') {
      this.fileManageStrategy = new FsStrategy();
    }
  }

  /**
   * Singleton Class의 instance를 받아오기 위한 메소드 
   */
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

  /**
   * 파일이 저장되는 경로를 반환<br>
   * s3인 경우 임시 저장 경로를 반환
   * 
   * @returns 경로 string
   */
  getLocalPath() {
    if(this.type === 's3') {
      return './upload';
    } else {
      return this.localPath;
    }
  }

  /**
   * AWS SDK의 S3 객체를 반환한다. local 타입인 경우 undefined를 반환.
   * 
   * @returns S3|undefined
   */
  getS3Object() {
    if(this.type === 's3') {
      return (<S3Strategy>this.fileManageStrategy).s3;
    }
    return;
  }

  /**
   * S3 bucket 이름을 반환한다. local 타입인 경우 undefined를 반환.
   * 
   * @returns s3 bucket
   */
  getBucket() {
    if(this.type === 's3') {
      return (<S3Strategy>this.fileManageStrategy).bucket;
    }
    return;
  }

  /**
   * 비동기로 파일을 저장
   * @param path 파일을 저장 할 경로
   * @param file 파일 버퍼 데이터
   */
  async saveFile(path: string, file: Buffer) {
    return await this.fileManageStrategy.saveFile(path, file);
  }

  /**
   * 파일을 쓰기 위한 Write stream을 생성, 반환
   * 
   * @param path 파일 경로 또는 s3 내부 파일 경로
   */
  createWriteStream(path: string) {
    return this.fileManageStrategy.createWriteStream(path);
  }

  /**
   * 파일을 읽기 위한 Read Stream을 생성, 반환
   * 
   * @param path 파일 경로 또는 s3 내부 파일 경로
   */
  createReadStream(path: string) {
    return this.fileManageStrategy.createReadStream(path);
  }

}

export default FileManager;