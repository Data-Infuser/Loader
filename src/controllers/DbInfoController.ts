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
        try {
            const loader = await this.getManager(req);
            const tables: Array<string> = await loader.getTables();
            await loader.close();
            res.json(tables);
        } catch(err) {
            console.error(err);
            res.status(500).json(err.message);
        }
    }

    getColumns = async(req: Request, res: Response)=> {
        const {tableNm} = req.params;

        try {
            const loader = await this.getManager(req);
            const columns: Array<ColumnDescribe> = await loader.getColumns(tableNm);
            await loader.close();
            res.json(columns);
        } catch(err) {
            console.error(err);
            res.status(500).json(err.message);
        }
    }

    getManager = async(req: Request) => {
        const {dbms, username, password, hostname, port, database} = req.query;
        console.log(req.query);
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