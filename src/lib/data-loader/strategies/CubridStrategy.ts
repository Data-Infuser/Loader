import DataLoadStrategy from '../DataLoadStrategy';
import { Meta } from '../../../entity/manager/Meta';
import { createConnections, getManager, getConnection, Table, QueryRunner } from 'typeorm';
import CUBRID = require('node-cubrid');

class CubridStrategy extends DataLoadStrategy {

  constructor(defaultQueryRunner: QueryRunner) {
    super(defaultQueryRunner);
  }

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
