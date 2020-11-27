import MetaLoaderDbConnection from "./interfaces/MetaLoaderDbConnection";
import MetaLoaderFileParam from "./interfaces/MetaLoaderFileParam";
import DescTableResult from "./interfaces/DescTableResult";
import { MetaStatus } from "../../entity/manager/Meta";

/**
 * Meta 데이터는 분석하고 적재하기 위한 클래스
 */
class MetaLoader {
  /**
   * 데이터 유형별 메타 적재 기능을 담당하는 Strategy
   */
  private metaLoadStrategy;

  constructor(metaLoadStrategy) {
    this.metaLoadStrategy = metaLoadStrategy;
  }

  /**
   * 메타데이터를 적재하는 메소드<br>
   * strategy의 loadMeta 함수를 호출
   * 
   * @param info DB 접속 정보 또는 파일 데이터 정보
   */
  public async loadMeta(info:MetaLoaderDbConnection|MetaLoaderFileParam):Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        const loadResult = await this.metaLoadStrategy.loadMeta(info)
        loadResult.meta.status = MetaStatus.METALOADED;
        resolve(loadResult);
      } catch (err) {
        console.error(err);
        reject(err);
      }
    })
  }

  /**
   * Database 접속 정보는 받아 테이블 목록을 반환하는 메소드
   * 
   * @param info DB 접속 정보
   */
  public async showTables(info:MetaLoaderDbConnection):Promise<string[]> {
    return new Promise(async (resolve, reject) => {
      try {
        resolve(await this.metaLoadStrategy.showTables(info));
      } catch (err) {
        console.error(err);
        reject(err);
      }
    })
  }

  /**
   * 테이블 정보를 읽어 반환하는 메소드
   * 
   * @param info 테이블 명을 포함하는 DB 접속 정보
   */
  public async descTable(info:MetaLoaderDbConnection):Promise<DescTableResult[]> {
    return new Promise(async (resolve, reject) => {
      try {
        resolve(await this.metaLoadStrategy.descTable(info));
      } catch (err) {
        console.error(err);
        reject(err);
      }
    })
  }

}

export default MetaLoader;