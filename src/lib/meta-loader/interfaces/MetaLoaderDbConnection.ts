/**
 * DBMS 데이터 연결 정보 인터페이스
 */
export default interface MetaLoaderDbConnection {
  dbms: string,
  username: string,
  password: string,
  hostname: string,
  port: string,
  database: string,
  tableNm: string,
  title: string
}