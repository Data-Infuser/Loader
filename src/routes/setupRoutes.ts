import {Application} from 'express';

import defaultRoutes from './defaultRoutes';


export default async function setupRoutes(server: Application) {
  server.use("/", defaultRoutes);
}