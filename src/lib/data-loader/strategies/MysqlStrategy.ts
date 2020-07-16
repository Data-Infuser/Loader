import DataLoadStrategy from '../DataLoadStrategy';
import { Service, ServiceStatus } from '../../../entity/manager/Service';
import { createConnections, getManager, getConnection, Table, QueryRunner } from 'typeorm';
import { ServiceColumn } from '../../../entity/manager/ServiceColumn';
import { TableOptions } from 'typeorm/schema-builder/options/TableOptions';
import { Application } from '../../../entity/manager/Application';
import { Meta } from '../../../entity/manager/Meta';

class MysqlStrategy implements DataLoadStrategy {
  tablesForDelete: string[];
  defaultQueryRunner: QueryRunner;

  constructor(defaultQueryRunner: QueryRunner) {
    this.tablesForDelete = [];
    this.defaultQueryRunner = defaultQueryRunner;
  }

  async load(application: Application ,service: Service) {
    const datasetQueryRunner = await getConnection('dataset').createQueryRunner();
    return new Promise(async (resolve, reject) => {
      try {
        service.application = application;
        const meta = service.meta;  
        const metaColumns = meta.columns;
        service.tableName = service.application.nameSpace + "-" + service.entityName
        // column data 생성
        let columns = []
        let columnNames = []
        let originalColumnNames = []
        let serviceColumns: ServiceColumn[] = []

        metaColumns.forEach(column => {
          columnNames.push(`\`${column.columnName}\``)
          originalColumnNames.push(`\`${column.originalColumnName}\``)
          let type = column.type.toString();
          if(column.size) {
            type = `${type}(${column.size})`
          }
          columns.push({
            name: column.columnName,
            type: column.type,
            isNullable: true
          })
          serviceColumns.push(new ServiceColumn(column.columnName, type, service));
        });

        const tableOption: TableOptions = {
          name: service.tableName,
          columns: columns
        }

        let insertQuery = `INSERT INTO \`${tableOption.name}\`(${columnNames.join(",")}) VALUES ?`;
  
        /**
         * TODO: getRows 와 같이 범용적인 함수를 만들고, 함수 내부에서 data type을 확인 후 RDBMS, CSV 등을 읽어오도록 구현
         */
        let insertValues = await this.generateRows(meta, originalColumnNames);
        this.tablesForDelete.push(tableOption.name);
        service.columnLength = serviceColumns.length;
        service.dataCounts = insertValues.length;
        await datasetQueryRunner.dropTable(service.tableName, true);
        await datasetQueryRunner.createTable(new Table(tableOption));
        await datasetQueryRunner.query(insertQuery, [insertValues]);
        meta.isActive = true;
        service.status = ServiceStatus.LOADED;
        await this.defaultQueryRunner.manager.save(meta);
        await this.defaultQueryRunner.manager.save(service);
        await this.defaultQueryRunner.manager.save(serviceColumns);
      } catch(err) {
        service.status = ServiceStatus.FAILED;
        await this.defaultQueryRunner.manager.save(service);
        reject(err);
      }
    })
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
