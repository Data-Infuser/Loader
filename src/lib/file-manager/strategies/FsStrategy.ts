import {createWriteStream, createReadStream, WriteStream} from "fs";
import propertyConfigs from "../../../config/propertyConfig";
import FileManageStrategy from "../FileManageStrategy";
import { Readable } from 'typeorm/platform/PlatformTools';

/**
 * Server local 경로에 파일을 관리하기 위한 Strategy
 */
export class FsStrategy implements FileManageStrategy {

    createWriteStream(path: string): { stream: WriteStream, path: string } {
        return {
            stream: createWriteStream(propertyConfigs.uploadDist.localPath + "/" + path),
            path: propertyConfigs.uploadDist.localPath + "/" + path
        }
    }

    createReadStream(path: string) {
        return createReadStream(path);
    }

    saveFile(path:string, file: Buffer) {
        return;
    }
}