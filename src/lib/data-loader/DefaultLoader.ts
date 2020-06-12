import { Service } from './../../entity/manager/Service';
import { EntityManager, createConnections, getManager, ConnectionOptions, getConnection, Table } from 'typeorm';
import { Meta } from '../../entity/manager/Meta';
import { ColumnDescribe } from './ColumnInfo';
import { TableOptions } from 'typeorm/schema-builder/options/TableOptions';
import { TableColumnOptions } from 'typeorm/schema-builder/options/TableColumnOptions';

export default abstract class DefaultLoader {
    manager: EntityManager;
    service: Service;
    meta: Meta;
    columnTypeMap: Map<string, string>;
    columns: Array<string>;

    constructor(service: Service) {
        if (service != undefined) {
            this.service = service;
            this.meta = this.service.meta;
            this.columns = new Array<string>();
    
            this.meta.columns.forEach(col => {
                this.columns.push(col.columnName);
            });
        }
    }

    public async import(): Promise<void> {
        const queryRunner = getConnection("dataset").createQueryRunner();
        if (this.manager == undefined) await this.connect();

        let cols = await this.getColumns(this.meta.table);
        let colNames: Array<string> = new Array<string>();
        
        const convertedColumns: TableColumnOptions[] = this.convertColumns(cols);
        const tableOptions: TableOptions = {
            name: `${this.service.application.nameSpace}-${this.service.entityName}`,
            columns: convertedColumns
        }

        convertedColumns.forEach(col => {
            colNames.push(col.name);
        });

        const isExist = await this.isTableExist(tableOptions);

        if (isExist) {
            await queryRunner.query(`TRUNCATE \`${tableOptions.name}\``);
        } else {
            await queryRunner.createTable(new Table(tableOptions));
        }

        const insertQuery = `INSERT INTO \`${this.service.application.nameSpace}-${this.service.entityName}\` (${colNames.join(",")}) VALUES ?`;

        await queryRunner.startTransaction();

        try {
            const rowCount = await this.getRowCount();
            const pageSize = 100;

            for (let i=0; i*pageSize<rowCount; i++) {
                const results: Array<Map<string, any>> = await this.getRows(i, pageSize);
                let insertValues: Array<any> = new Array<any>();

                results.forEach((result) => {
                    let values: Array<string> = new Array<string>();

                    this.columns.forEach((col) => {
                        values.push(result.get(col));
                    });

                    insertValues.push(values);
                });
                
                await queryRunner.query(insertQuery, [insertValues]);
            }

            await queryRunner.commitTransaction();
        } catch(err) {
            console.log(err);
            await queryRunner.rollbackTransaction();
        } finally {
            await queryRunner.release();
        }
        

        await this.close();
    }

    public async connectExceptSevice(options: ConnectionOptions): Promise<boolean> {
        try {
            await createConnections([options]);
            const manager: EntityManager = getManager(options.name);
    
            this.manager = manager;
        } catch(err) {
            return false;
        }
        return true;
    }

    protected async connect(): Promise<boolean> {
        try {
            const options: ConnectionOptions = {
                name: `${this.meta.dbType}/${this.meta.dbUser}:${this.meta.pwd}@${this.meta.host}:${this.meta.port}/`,
                type: this.meta.dbType,
                host: this.meta.host,
                port: Number(this.meta.port),
                username: this.meta.dbUser,
                password: this.meta.pwd,
                database: this.meta.db
            };
            
            await createConnections([options]);
            const manager: EntityManager = getManager(options.name);
    
            this.manager = manager;
        } catch(err) {
            return false;
        }
        return true;
    }

    private async close() {
        await this.manager.connection.close();
    }

    private convertColumns(columns: ColumnDescribe[]): TableColumnOptions[] {
        let results: TableColumnOptions[] = [];

        columns.forEach(column => {
            const [colType, colSize] = this.seperateColumn(column.type);
            const buildedType = colSize==-1?`${colType}`:`${colType}(${colSize})`;

            const desc: TableColumnOptions = {
                name: column.name,
                type: buildedType,
                isNullable: true,
                default: column.default
            };

            results.push(desc);
        });

        return results;
    }

    private async isTableExist(tableOptions: TableOptions): Promise<boolean> {
        const tableNm = tableOptions.name;
        const queryRunner = getConnection("dataset").createQueryRunner();
        const results = await queryRunner.query("SHOW TABLES");

        for (let i=0; i<results.length; i++) {
            const result = results[i];
            const table = result[Object.keys(result)[0]];

            if (table == tableNm) {
                return true;
            }
        }

        return false;
    }

    private convertInsertData(data: Map<string, any>): string {
        let results = [];

        this.columns.forEach(col => {
            let raw = data.get(col);

        });

    }

    protected seperateColumn(colType: string): any[2] {
        const splitted = colType.split("(");
        const typeNm = splitted[0];
        const typeSize = splitted.length == 1 ? -1 : Number(splitted[1].replace(")", ""));

        return [typeNm, typeSize];
    }
    protected getManager(): EntityManager {
        return this.manager;
    }
    
    public abstract async getTables(): Promise<Array<string>>;
    public abstract async getColumns(table: string): Promise<Array<ColumnDescribe>>;
    protected abstract async getRowCount(): Promise<number>;
    protected abstract async getRowSize(): Promise<number>;
    protected abstract async getRows(page: number, size: number): Promise<Array<Map<string, any>>>;
    protected abstract convertType(originCol: string): string;
}