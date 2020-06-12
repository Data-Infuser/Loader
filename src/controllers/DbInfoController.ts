import { ColumnDescribe } from './../lib/data-loader/ColumnInfo';
import { Request, Response, Router } from "express";
import DefaultLoader from "../lib/data-loader/DefaultLoader";
import {createLoaderExceptService} from "../lib/data-loader";
import { ConnectionOptions } from "typeorm";


export default class DbInfoController {
    public path = '/db-info';
    public router = Router();

    constructor() {
        this.initialRoutes();
    }

    public initialRoutes() {
        this.router.get("/tables", this.getTables);
        this.router.get("/tables/:tableNm/columns", this.getColumns);
    }

    getTables = async(req: Request, res: Response)=> {
        const loader = await this.getManager(req);
        const tables: Array<string> = await loader.getTables();

        res.json(tables);
    }

    getColumns = async(req: Request, res: Response)=> {
        const {tableNm} = req.params;

        const loader = await this.getManager(req);
        const columns: Array<ColumnDescribe> = await loader.getColumns(tableNm);

        res.json(columns);
    }

    getManager = async(req: Request) => {
        const {dbms, username, password, hostname, port, database} = req.query;
        const options: ConnectionOptions = {
            name: `${dbms}/${username}:${password}@${hostname}:${port}/`,
            type: `${dbms}`,
            host: `${hostname}`,
            port: Number(port),
            username: `${username}`,
            password: `${password}`,
            database: `${database}`
        };

        const loader: DefaultLoader = await createLoaderExceptService(dbms, undefined);
        await loader.connectExceptSevice(options);

        return loader;
    }
}