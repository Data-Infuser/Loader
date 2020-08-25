import DataLoadStrategy from '../DataLoadStrategy';
import { Meta } from '../../../entity/manager/Meta';
import { createConnections, getManager, getConnection, Table, QueryRunner } from 'typeorm';

class MysqlStrategy extends DataLoadStrategy {

  constructor(defaultQueryRunner: QueryRunner) {
    super(defaultQueryRunner);
  }

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
