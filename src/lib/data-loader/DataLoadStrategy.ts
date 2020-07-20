import { Service, ServiceStatus } from '../../entity/manager/Service';
import { Application } from '../../entity/manager/Application';
import { Meta } from '../../entity/manager/Meta';
import { QueryRunner } from 'typeorm/query-runner/QueryRunner';
import { getConnection, Table } from 'typeorm';
import { ServiceColumn } from '../../entity/manager/ServiceColumn';
import { TableOptions } from 'typeorm/schema-builder/options/TableOptions';

abstract class DataLoadStrategy {
  tablesForDelete: string[];
  defaultQueryRunner: QueryRunner;

  constructor(defaultQueryRunner: QueryRunner) {
    this.tablesForDelete = [];
    this.defaultQueryRunner = defaultQueryRunner;
  }
  
  async load(application: Application,service:Service) {
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
  };

  abstract async generateRows(meta:Meta, originalColumnNames:string[]);
}

export default DataLoadStrategy;