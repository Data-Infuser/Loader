
import { WriteStream } from 'fs';
import { Readable } from 'typeorm/platform/PlatformTools';

/**
 * FileManager에서 데이터 저장소에 따른 파일 읽기/쓰기를 위한 Strategy 인터페이스
 */
export default interface FileManageStrategy {
    /**
     * 파일을 쓰기 위한 Write stream을 생성, 반환
     * 
     * @param path 파일 경로 또는 s3 내부 파일 경로
     */
    createWriteStream(path:string): {stream: Readable|WriteStream, path: string};
    /**
     * 파일을 읽기 위한 Read Stream을 생성, 반환
     * 
     * @param path 파일 경로 또는 s3 내부 파일 경로
     */
    createReadStream(path:string)
    /**
     * 비동기로 파일을 저장
     * @param path 파일을 저장 할 경로
     * @param file 파일 버퍼 데이터
     */
    saveFile(path:string, file: Buffer);
}