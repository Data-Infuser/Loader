import { MetaInfo } from "../interfaces/MetaInfo";
import { createConnections, getManager, getConnection, ConnectionOptions } from "typeorm";
import { Meta } from "../../../entity/manager/Meta";
import { MetaColumn } from "../../../entity/manager/MetaColumn";
import MetaLoaderDbConnection from "../interfaces/MetaLoaderDbConnection";
import DbmsMetaLoadStrategy from "./DbmsMetaLoadStrategy";
import DescTableResult from "../interfaces/DescTableResult";

const mysqlTypes = require("../dbms_data_types/mysql.json");
/**
 * Mysql 데이터의 메타 데이터를 분석하고 적재하기 위한 Strategy 클래스
 */
class MysqlMetaLoadStrategy implements DbmsMetaLoadStrategy {

  typeConvertMap:{};

  constructor() {
    this.typeConvertMap = mysqlTypes;
  }

  /**
   * Mysql showtable 구현체
   * 
   * @param info db 접속 정보
   */
  async showTables(info:MetaLoaderDbConnection):Promise<string[]> {
    return new Promise(async (resolve, reject) => {
      try {
        let { hostname, port, database, username, password } = info

        if(!password) password = ""

        const mysqlConnectionOption:ConnectionOptions = {
          name: "connectionForMeta",
          type: "mysql",
          host: hostname,
          port: Number(port),
          username: username,
          password: password,
          database: database
        }
        await createConnections([mysqlConnectionOption])
        const manager = await getManager('connectionForMeta')
        const showResults = await manager.query(`show tables;`)

        const resultArray = []
        for(const row of showResults) {
          const key = Object.keys(row)[0]
          resultArray.push(row[key]);
        }
        await getConnection("connectionForMeta").close();
        resolve(resultArray)
      } catch (err) {
        console.error(err);
        await getConnection("connectionForMeta").close();
        reject(err);
      }
    })
  }

  /**
   * Mysql desctable 구현체
   * 
   * @param info db 접속 정보
   */
  async descTable(info:MetaLoaderDbConnection):Promise<DescTableResult[]> {
    return new Promise(async (resolve, reject) => {
      try {
        let { hostname, port, database, username, password, tableNm } = info

        if(!password) password = ""

        const mysqlConnectionOption:ConnectionOptions = {
          name: "connectionForMeta",
          type: "mysql",
          host: hostname,
          port: Number(port),
          username: username,
          password: password,
          database: database
        }
        await createConnections([mysqlConnectionOption])
        const manager = await getManager('connectionForMeta')
        const descResults = await manager.query(`desc \`${tableNm}\`;`)
        const resultArray:DescTableResult[] = []
        for(const row of descResults) {
          resultArray.push({
            field: row["Field"],
            type: row["Type"]
          });
        }
        await getConnection("connectionForMeta").close();
        resolve(resultArray)
      } catch (err) {
        await getConnection("connectionForMeta").close();
        console.error(err);
        reject(err);
      }
    })
  }
  
  /**
   * cubrid load meta 구현체
   * 
   * @param info 파일 정보
   */
  async loadMeta(info:MetaLoaderDbConnection) {
    return new Promise<MetaInfo>(async(resolve, reject) => {
      try {
        let { title, hostname, port, database, username, password, tableNm } = info
        
        if(!password) password = ""

        const mysqlConnectionOption:ConnectionOptions = {
          name: "connectionForMeta",
          type: "mysql",
          host: hostname,
          port: Number(port),
          username: username,
          password: password,
          database: database
        }
        await createConnections([mysqlConnectionOption])

        const manager = await getManager('connectionForMeta')
        const count = await manager
        .query(
          `SELECT count(*) as count
          FROM \`${tableNm}\`;`
          )
        const tableInfo = await manager.query(`DESCRIBE \`${tableNm}\`;`);

        const meta = new Meta();
        meta.title = title;
        meta.dataType = 'dbms';
        meta.rowCounts = count[0].count;
        meta.host = hostname;
        meta.port = port;
        meta.db = database;
        meta.dbUser = username;
        meta.pwd = password;
        meta.table = tableNm;
        meta.samples = await this.getSampleData(manager, tableNm);

        let columns = []
        for(let i = 0; i < tableInfo.length; i++) {
          const info = tableInfo[i]
          const metaCol = new MetaColumn();
          metaCol.originalColumnName = info.Field;
          metaCol.columnName = info.Field;
          const convertedType = this.convertType(info.Type);
          metaCol.type = convertedType.type;
          if(convertedType.size) metaCol.size = `${convertedType.size}`;
          metaCol.meta = meta;
          metaCol.order = i;
          columns.push(metaCol);
        }

        await getConnection('connectionForMeta').close();

        resolve({
          meta: meta, 
          columns: columns
        });
        return;
      } catch (err) {
        try {
          await getConnection("connectionForMeta").close();
        } catch(err) {
          reject(err);
          return;
        }
        reject(err);
        return;
      }
    });
  }

  /**
   * DB에 적재하기 위해 적합한 data type을 확인
   * 
   * @param records n x m의 records
   * @returns {type: string, size: string}[]
   */
  convertType(originType: string){
    const lowercaseType:string = originType.toLowerCase()
    const tokens = lowercaseType.split("(");
    let type = this.typeConvertMap[tokens[0]]
    let size:number;

    if(tokens[1]) {
      let candidateSize = Number(tokens[1].split(")")[0]);
      if(!isNaN(candidateSize)) size = candidateSize;
    }
    
    if(!type) type = "varchar"

    return {
      type: type,
      size: size
    }
  }

  /**
   * 미리보기로 보여주기 위한 sample 데이터를 생성, 반환
   * 
   * @returns JSON string
   */
  getSampleData(manager, tableNm): Promise<string> {
    return new Promise( async (resolve, reject) => {
      try {
        const sampleDatas = []
        const rows = await manager.query(`SELECT * from \`${tableNm}\` limit 5;`);
        for(let row of rows) {
          const keys = Object.keys(row);
          const sampleRow = [];
          for(let key of keys) {
            sampleRow.push(row[key]);
          }
          sampleDatas.push(sampleRow);
        }
        resolve(JSON.stringify({items:sampleDatas}));
      } catch (err) {
        reject(err);
      }
    })
  }
    
}

export default MysqlMetaLoadStrategy;