import DataLoadStrategy from "../DataLoadStrategy";
import { Service } from "../../../entity/manager/Service";
import { Application } from "../../../entity/manager/Application";
import { Meta } from "../../../entity/manager/Meta";
import { QueryRunner } from "typeorm";
import FileManager from "../../file-manager/FileManager";

const Excel = require("exceljs");

/**
 * Xlsx 파일을 적재하기 위한 Strategy
 */
class XlsxStrategy extends DataLoadStrategy {

  constructor(defaultQueryRunner: QueryRunner) {
    super(defaultQueryRunner);
  }
  
  /**
   * xlsx 파일을 읽어 DB에 입력할 데이터를 생성하는 메소드
   * 
   * @param meta Meta 객체
   * @param originalColumnNames 원본 컬럼 명(DBMS가 아닌경우 사용되지 않음)
   */
  async generateRows(meta:Meta, originalColumnNames:string[]): Promise<any[]> {
    return new Promise(async(resolve, reject) => {
      try {
        let insertValues = []
        const loadedWorkbook = await new Excel.Workbook().xlsx.read(FileManager.Instance.createReadStream(meta.filePath));
        //const loadedWorkbook = await new Excel.Workbook().xlsx.readFile(meta.filePath);
        const worksheet = loadedWorkbook.worksheets[meta.sheet]
        const totalRowCount = worksheet.rowCount
        for(let i = meta.skip + 2; i <= totalRowCount; i++) {
          let row = <string[]>worksheet.getRow(i).values
          if(row.length == 0) continue;
          insertValues.push(row.slice(1));
        }
        resolve(insertValues);
      } catch (err) {
        console.error(err);
        reject(err);
      }
    })
  }
}

export default XlsxStrategy;