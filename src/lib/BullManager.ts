import Bull, { JobOptions } from "bull";
import CrawlerController from "../controller/CrawlerController";
import DataLoaderController from "../controller/DataLoaderController";
import MetaLoaderController from "../controller/MetaLoaderController";
import propertyConfigs from "../config/propertyConfig"

/**
 * Jobqueue를 관리하기 위한 클래스<br>
 * Singleton pattern 으로 구현 됨
 */
export default class BullManager {

  /**
   * Singleton class의 인스턴스
   */
  private static _instance: BullManager;

  /**
   * 데이터 적재를 위한 작업 큐
   */
  dataLoaderQueue: Bull.Queue;
  /**
   * 메타 로드를 위한 작업 큐
   */
  metaLoaderQueue: Bull.Queue;
  /**
   * file-url을 입력으로 받은 경우 파일 다운로드를 위한 작업 큐
   */
  downloadQueue: Bull.Queue;
  /**
   * 데이터 크롤링을 위한 작업 큐. 공공데이터 포털 데이터 수집을 위하여 사용됩니다.
   */
  crawlerQueue: Bull.Queue;

  /**
   * 생성자<br>
   * 환경 설정 정보에 따른 Redis jobqueue 연결
   */
  constructor() {
    
    let redisHost = propertyConfigs.jobqueueRedis.host
    if(process.env.NODE_ENV !== 'production') {
      redisHost = "localhost"
    }

    this.dataLoaderQueue = new Bull('dataLoader', {
      redis: {
        port: propertyConfigs.jobqueueRedis.port,
        host: redisHost
      }
    });

    this.metaLoaderQueue = new Bull('metaLoader', {
      redis: {
        port: propertyConfigs.jobqueueRedis.port,
        host: redisHost
      }
    })

    this.crawlerQueue = new Bull('crawler', {
      redis: {
        port: propertyConfigs.jobqueueRedis.port,
        host: redisHost
      }
    })

    this.downloadQueue = new Bull('download', {
      redis: {
        port: propertyConfigs.jobqueueRedis.port,
        host: redisHost
      }
    })

  }

  /**
   * Singleton Class의 instance를 받아오기 위한 메소드 
   */
  public static get Instance() {
    if(!this._instance) {
      this._instance = new BullManager();
    }
    return this._instance;
  }

  /**
   * Job Queue 와 관련된 설정을 하는 메소드<br>
   * Job queue 작업을 처리하기 위하여 Queue 상태 별 실행되는 메소드를 매핑<br>
   * Scheduled 작업 또한 등록
   */
  setupQueues = async () => {
    // data loader
    this.dataLoaderQueue.process((job, done) => DataLoaderController.loadData(job, done))
    this.dataLoaderQueue.on("failed", (job, err) => DataLoaderController.handleFailed(job, err));
    this.dataLoaderQueue.on("completed", (job) => DataLoaderController.handleCompleted(job));

    // meta loader
    this.metaLoaderQueue.process((job, done) => MetaLoaderController.loadMeta(job, done));

    //download
    this.downloadQueue.process((job, done) => MetaLoaderController.downloadFile(job, done));
    this.downloadQueue.on('completed', (job) =>{ this.metaLoaderQueue.add({metaId: job.data.metaId})});

    const jobOption:JobOptions = {
      repeat: {
        cron: '5 0 * * *'
      }
    }

    const jobRepoeatOption:JobOptions = {
      repeat: {
        every: 1,
        limit: 1
      }
    }
    // await this.crawlerQueue.add({}, jobOption)
    // await this.crawlerQueue.add({}, jobRepoeatOption)

    this.crawlerQueue.process((job, done) => CrawlerController.start(job, done));
  }
}