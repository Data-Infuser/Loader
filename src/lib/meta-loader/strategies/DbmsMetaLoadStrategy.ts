import MetaLoadStrategy from '../MetaLoadStrategy';
import MetaLoaderDbConnection from '../interfaces/MetaLoaderDbConnection';

/**
 * DBMS 정보를 읽어오기 위한 메소드가 포함된 Strategy 인터페이스
 */
export default interface DbmsMetaLoadStrategy extends MetaLoadStrategy{
  /**
   * db에 있는 모든 페이블 목록을 반환
   * 
   * @param info DB 접속 정보
   */
  showTables(info:MetaLoaderDbConnection);

  /**
   * 특정 table의 정보를 반환
   * 
   * @param info table명을 포함한 DB 접속 정보
   */
  descTable(info:MetaLoaderDbConnection);
}