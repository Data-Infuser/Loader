import DataLoadStrategy from '../DataLoadStrategy';
import { Meta } from '../../../entity/manager/Meta';
import { createConnections, getManager, getConnection, Table, QueryRunner } from 'typeorm';
import CUBRID = require('node-cubrid');

/**
 * Cubrid DB에서 데이터를 적재하기 위한 Strategy
 */
class CubridStrategy extends DataLoadStrategy {

  constructor(defaultQueryRunner: QueryRunner) {
    super(defaultQueryRunner);
  }

  /**
   * Cubrid에 접속해서 데이터를 읽어와 DB에 입력할 row를 생성하는 메소드
   * 
   * @param meta Meta 객체
   * @param originalColumnNames 원본 컬럼 명, Select 쿼리 생성 시 사용
   */
  async generateRows(meta:Meta, originalColumnNames:string[]): Promise<any[]> {
    return new Promise(async (resolve, reject) => {
      let client;
      try {
        const dbConfig = {
          host: meta.host,
          port: Number(meta.port),
          user: meta.dbUser,
          password: meta.pwd,
          database: meta.db
        }
        client = CUBRID.createConnection(dbConfig);
        await client.connect();
        
        /**
         * Cubrid Query Result
         * {
         *  queryHandle: number,
         *  result : {
         *    ColumnDataTypes: [],
         *    ColumnNames: [],
         *    ColumnValues: [[]]
         *  }
         * }
         */
        const selectQuery = `SELECT ${originalColumnNames.join(",")} FROM \`${meta.table}\`;`
        let selectResult = await client.queryAll(selectQuery);
        await client.close();
        resolve(selectResult.ColumnValues);
      } catch(err) {
        await client.close();
        reject(err);
      }
    })
  }
}

export default CubridStrategy;
