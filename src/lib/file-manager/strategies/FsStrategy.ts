import {createWriteStream, createReadStream} from "fs";
import propertyConfigs from "../../../config/propertyConfig";
import FileManageStrategy from "../FileManageStrategy";

export class FsStrategy implements FileManageStrategy {

    saveStream = (path: string) => {
        return createWriteStream(propertyConfigs.uploadDist.localPath + "/" + path);
    }

    loadFile = (path: string) => {
        return createReadStream(path);
    }

    saveFile = (path:string, file: Buffer) => {
        return;
    }
}