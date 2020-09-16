import { Service } from '../../entity/manager/Service';
import { Application } from '../../entity/manager/Application';
import { Meta, MetaStatus } from '../../entity/manager/Meta';
import { QueryRunner } from 'typeorm/query-runner/QueryRunner';
import { getConnection, Table } from 'typeorm';
import { TableOptions } from 'typeorm/schema-builder/options/TableOptions';
import { Stage } from '../../entity/manager/Stage';

abstract class DataLoadStrategy {
  tablesForDelete: string[];
  defaultQueryRunner: QueryRunner;

  constructor(defaultQueryRunner: QueryRunner) {
    this.tablesForDelete = [];
    this.defaultQueryRunner = defaultQueryRunner;
  }
  
  async load(stage: Stage, meta: Meta) {
    const datasetQueryRunner = await getConnection('dataset').createQueryRunner();
    return new Promise(async (resolve, reject) => {
      try {
        const metaColumns = meta.columns;
        const tableName = `${stage.application.id}-${stage.id}-${meta.id}`
        // column data 생성
        let columns = []
        let columnNames = []
        let originalColumnNames = []

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
        });

        const tableOption: TableOptions = {
          name: tableName,
          columns: columns
        }

        let insertQuery = `INSERT INTO \`${tableOption.name}\`(${columnNames.join(",")}) VALUES ?`;

        let insertValues = await this.generateRows(meta, originalColumnNames);
        this.tablesForDelete.push(tableOption.name);
        await datasetQueryRunner.dropTable(tableName, true);
        await datasetQueryRunner.createTable(new Table(tableOption));
        await datasetQueryRunner.query(insertQuery, [insertValues]);
        meta.status = MetaStatus.DATA_LOADED;
        await this.defaultQueryRunner.manager.save(meta);
        resolve();
      } catch(err) {
        meta.status = MetaStatus.FAILED;
        await this.defaultQueryRunner.manager.save(meta);
        reject(err);
      }
    })
  };

  abstract async generateRows(meta:Meta, originalColumnNames:string[]);
}

export default DataLoadStrategy;