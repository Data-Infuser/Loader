
export default interface FileManageStrategy {
    saveStream(path:string);
    loadFile(path:string);
    saveFile(path:string, file: Buffer);
}