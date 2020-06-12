import { Service } from '../../entity/manager/Service';
import DefaultLoader from './DefaultLoader';
import { ColumnDescribe, ColumnType } from './ColumnInfo';

export default class MysqlLoader extends DefaultLoader {
    constructor(service: Service) {
        super(service);
    }

    public async getTables(): Promise<Array<string>> {
        if (this.getManager() == undefined) await this.connect();
        
        let tables: Array<string> = new Array<string>();

        const manager = this.getManager();
        const rawDatum = await manager.query("SHOW TABLES");

        for (let i=0; i<rawDatum.length; i++) {
            const result = rawDatum[i];
            const table = result[Object.keys(result)[0]];

            tables.push(table);
        }

        return tables;
    }

    public async getColumns(table: string): Promise<Array<ColumnDescribe>> {
        if (this.getManager() == undefined) await this.connect();

        const manager = this.getManager();
        let columns: Array<ColumnDescribe> = new Array<ColumnDescribe>();

        const cols = await manager.query(`DESC ${table}`);

        cols.forEach((col) => {
            const desc: ColumnDescribe = {
                name: col.Field,
                type: col.Type,
                default: col.Default
            }

            columns.push(desc);
        });

        return columns;
    }
    
    protected async getRowCount(): Promise<number> {
        const manager = this.getManager();
        const result = await manager.query(`SELECT COUNT(*) as cnt FROM ${this.meta.table}`);

        return Number(result[0]['cnt']);
    }

    protected async getRowSize(): Promise<number> {
        return 0;
    }

    protected async getRows(page: number, size: number): Promise<Array<Map<string, any>>> {
        const manager = this.getManager();
        const start = page * size;
        const end = (page+1) * size;
        const rawResults = await manager.query(`SELECT ${this.columns.join(",")} FROM ${this.meta.table} limit ${start}, ${end}`);

        let results: Array<Map<string, any>> = new Array<Map<string, any>>();

        rawResults.forEach(result => {
            let row: Map<string, any> =  new Map<string, any>();

            this.columns.forEach(col => {
                row.set(col, result[col]);
            });

            results.push(row);
        });

        return results;
    }

    protected convertType(originCol: string): string {
        let [typ, size] = this.seperateColumn(originCol);
        let mapper = {
            integer     : ColumnType.INTEGER,
            int         : ColumnType.INT,
            smallint    : ColumnType.SMALLINT,
            tinyint     : ColumnType.TINYINT,
            mediumint   : ColumnType.MEDIUMINT,
            bigint      : ColumnType.BIGINT,
            demical     : ColumnType.DEMICAL,
            numeric     : ColumnType.NUMERIC,
            float       : ColumnType.FLOAT,
            double      : ColumnType.DOUBLE,
            bit         : ColumnType.BIT,
            date        : ColumnType.DATE,
            time        : ColumnType.TIME,
            datetime    : ColumnType.DATETIME,
            timestamp   : ColumnType.TIMESTAMP,
            year        : ColumnType.YEAR,
            char        : ColumnType.CHAR,
            varchar     : ColumnType.VARCHAR,
            binary      : ColumnType.BINARY,
            varbinary   : ColumnType.VARBINARY,
            tinyblob    : ColumnType.TINYBLOB,
            blob        : ColumnType.BLOB,
            mediumblob  : ColumnType.MEDIUMBLOB,
            lobgblob    : ColumnType.LOBGBLOB,
            tinytext    : ColumnType.TINYTEXT,
            mediumtext  : ColumnType.MEDIUMTEXT,
            text        : ColumnType.TEXT,
            longtext    : ColumnType.LONGTEXT
        };
        let val = mapper[typ];

        return size==-1?val:`${val}(${size})`;
    }
}