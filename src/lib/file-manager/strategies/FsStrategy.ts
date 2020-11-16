import {createWriteStream, createReadStream} from "fs";
import propertyConfigs from "../../../config/propertyConfig";
import FileManageStrategy from "../FileManageStrategy";
import { Readable } from 'typeorm/platform/PlatformTools';

export class FsStrategy implements FileManageStrategy {

    saveStream = (path: string): { stream: Readable, path: string } => {
        return {
            stream: createWriteStream(propertyConfigs.uploadDist.localPath + "/" + path),
            path: propertyConfigs.uploadDist.localPath + "/" + path
        }
    }

    loadFile = (path: string) => {
        return createReadStream(path);
    }

    saveFile = (path:string, file: Buffer) => {
        return;
    }
}