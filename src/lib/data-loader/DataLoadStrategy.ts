import { Service } from '../../entity/manager/Service';
import { Application } from '../../entity/manager/Application';
import { Meta, MetaStatus } from '../../entity/manager/Meta';
import { QueryRunner } from 'typeorm/query-runner/QueryRunner';
import { getConnection, Table } from 'typeorm';
import { TableOptions } from 'typeorm/schema-builder/options/TableOptions';
import { Stage } from '../../entity/manager/Stage';
import { Column } from 'typeorm';
import { debug } from 'console';

/**
 * 데이터 유형별 데이터 적재를 위한 Strategy 클래스
 */
abstract class DataLoadStrategy {
  /**
   * Transaction이 실패하는 경우 테이블을 Drop하기 위해 저장하는 리스트
   */
  tablesForDelete: string[];

  /**
   * Transaction처리를 위해 사용하는 QueryRunner 객체
   */
  defaultQueryRunner: QueryRunner;

  /**
   * 생성자
   * 
   * @param defaultQueryRunner Transaction 처리를 위해 사용하는 Query Runner
   */
  constructor(defaultQueryRunner: QueryRunner) {
    this.tablesForDelete = [];
    this.defaultQueryRunner = defaultQueryRunner;
  }
  
  /**
   * 실제 데이터를 적재하는 함수<br>
   * Strategy 객체의 load 함수를 실행 함
   * 
   * @param stage 적재할 데이터의 Stage 객체
   * @param meta 적재할 데이터의 Meta 객체
   */
  async load(stage: Stage, meta: Meta) {
    const datasetQueryRunner = await getConnection('dataset').createQueryRunner();
    return new Promise(async (resolve, reject) => {
      try {
        const metaColumns = meta.columns;
        const tableName = `${stage.id}-${meta.service.id}`
        // column data 생성
        let columns = []
        let columnNames = []
        let originalColumnNames = []

        metaColumns.sort(function(c1, c2) {
          return c1.order - c2.order;
        })

        metaColumns.forEach(column => {
          columnNames.push(`\`${column.columnName}\``)
          originalColumnNames.push(`\`${column.originalColumnName}\``)
          let type = column.type.toString();
          if(column.size) {
            type = `${type}(${column.size})`
          }
          columns.push({
            name: column.columnName,
            type: type,
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
        await datasetQueryRunner.release()
        resolve({});
      } catch(err) {
        debug(err);
        meta.status = MetaStatus.FAILED;
        await this.defaultQueryRunner.manager.save(meta);
        await datasetQueryRunner.release()
        reject(err);
      }
    })
  };

  /**
   * Strategy별 구현해야하는 추상 메소드<br>
   * DB에 Insert할 row의 리스트를 생성해야 함
   * 
   * @param meta meta 객체
   * @param originalColumnNames DBMS인 경우 사용하는 원본 컬럼 명
   */
  abstract generateRows(meta:Meta, originalColumnNames:string[]);
}

export default DataLoadStrategy;