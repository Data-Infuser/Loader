
import { WriteStream } from 'fs';
import { Readable } from 'typeorm/platform/PlatformTools';
export default interface FileManageStrategy {
    saveStream(path:string): {stream: Readable|WriteStream, path: string};
    loadFile(path:string);
    saveFile(path:string, file: Buffer);
}