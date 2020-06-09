import { Application } from './app';
import controller from "./controllers";


new Application(controller).setupDbAndServer();