import MetaLoaderDbConnection from "./interfaces/MetaLoaderDbConnection";
import MetaLoaderFileParam from "./interfaces/MetaLoaderFileParam";

/**
 * 데이터 유형별 메타 적재를 위한 Strategy 클래스
 */
export default interface MetaLoadStrategy {
  /**
   * 실제 메타 정보를 적재하는 함수<br>
   * Interface 이기 때문에 상속받는 Class에서 구현 필요
   * 
   * @param info DB 접속 정보 또는 파일 정보
   */
  loadMeta(info:MetaLoaderDbConnection|MetaLoaderFileParam);
}