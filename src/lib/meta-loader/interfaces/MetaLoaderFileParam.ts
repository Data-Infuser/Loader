/**
 * 파일 데이터 메타정보 인터페이스
 */
export default interface  MetaLoaderFileParam {
  title: string,
  skip: number,
  sheet: number,
  filePath: string,
  originalFileName: string,
  ext: string
}