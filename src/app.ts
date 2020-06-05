import express from "express";
import bodyParser from "body-parser";
import methodOverride from "method-override";
import morgan from "morgan";
import {createConnection} from "typeorm";

import setupRoutes from "./routes/setupRoutes";
import ApplicationError from "./ApplicationError";

export class Application {
  app: express.Application;

  constructor() {
    this.app = express();
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({extended: false}));
    this.app.use(methodOverride('_method'));
    
    this.app.use(morgan(":remote-addr - :remote-user [:date[clf]] \":method :url HTTP/:http-version\" :status :res[content-length]"));
    
  }

  setupDbAndServer = async () => {
      const conn = await createConnection().catch(error => console.log(error));
      const datasetConn = await createConnection('dataset').catch(error => console.log(error));

      await setupRoutes(this.app);

      this.app.use(function(req, res, next) {
        let err = new ApplicationError(404, 'Not Found');
        next(err);
      });

      this.startServer();

      // (async () => {
      //   var i = 0;
      //   while(true) {
      //     await (() => {
      //       return new Promise(resolve => setTimeout(resolve, 1000))
      //     }) ()
      //     i++;
      //     console.log(i);
      //   }
      // }) ();
  }

  startServer(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.app.listen(4000, () => {
        console.log("Server started on port: " + 4000);
        resolve(true);
      });
    });
  }
}