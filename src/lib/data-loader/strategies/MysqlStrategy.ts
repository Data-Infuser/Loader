import DataLoadStrategy from '../DataLoadStrategy';
import { Meta } from '../../../entity/manager/Meta';
import { createConnections, getManager, getConnection, Table, QueryRunner } from 'typeorm';

/**
 * Mysql DB에서 데이터를 적재하기 위한 Strategy
 */
class MysqlStrategy extends DataLoadStrategy {

  constructor(defaultQueryRunner: QueryRunner) {
    super(defaultQueryRunner);
  }

  /**
   * Mysql에 접속해서 데이터를 읽어와 DB에 입력할 row를 생성하는 메소드
   * 
   * @param meta Meta 객체
   * @param originalColumnNames 원본 컬럼 명, Select 쿼리 생성 시 사용
   */
  async generateRows(meta:Meta, originalColumnNames:string[]): Promise<any[]> {
    return new Promise(async (resolve, reject) => {
      try {
        let insertValues = []
        await createConnections([{
          name: "connectionForMeta",
          type: "mysql",
          host: meta.host,
          port: Number(meta.port),
          username: meta.dbUser,
          password: meta.pwd,
          database: meta.db
        }])

        const manager = await getManager('connectionForMeta');
        
        let results = await manager.query(`SELECT ${originalColumnNames.join(",")} FROM \`${meta.table}\`;`);

        results.forEach(row => {
          let values = []
          originalColumnNames.forEach(col => {
            values.push(row[col.slice(1, -1)])
          })
          insertValues.push(values)
        });
        await getConnection('connectionForMeta').close();
        resolve(insertValues);
      } catch(err) {
        reject(err);
      }
    })
  }
}

export default MysqlStrategy;
