import MetaLoadStrategy from "../MetaLoadStrategy";
import { Meta } from "../../../entity/manager/Meta";
import { MetaColumn, AcceptableType } from "../../../entity/manager/MetaColumn";
import MetaLoaderFileParam from "../interfaces/MetaLoaderFileParam";
import fs from 'fs';
import moment from 'moment';
import FileManager from '../../file-manager/FileManager';
import { Length } from 'class-validator';

const parse = require('csv-parse/lib/sync')
const iconv = require('iconv-lite');
const jschardet = require('jschardet');

/**
 * CSV 파일의 메타 데이터를 분석하고 적재하기 위한 Strategy 클래스
 */
class CsvMetaLoadStrategy implements MetaLoadStrategy {
  /**
   * CSV load meta 구현체
   * 
   * @param info 파일 정보
   */
  async loadMeta(info: MetaLoaderFileParam) {
    return new Promise(async (resolve, reject) => {
      try {
        let { title, skip, sheet, filePath, originalFileName } = info;

        if (filePath == undefined) {
          reject(new Error('파일이 없습니다.'));
          return;
        }

        if (title == undefined || title.length == 0) {
          reject(new Error('Meta명이 없습니다.'));
          return;
        }

        const originalFileNameTokens = originalFileName.split(".");
        const ext = originalFileNameTokens[originalFileNameTokens.length - 1]
        const fileStream = FileManager.Instance.createReadStream(filePath);
        let chunks = [];
        let rowCounts = 0;
        fileStream.on('error', (err) => {
          console.error(err);
          reject(err);
        })
          .on('data', (chunk) => {
            try {
              const count = chunk.toString().split('\n').length - 1;
              rowCounts = rowCounts + count;
              chunks.push(chunk);
            } catch (err) {
              console.error(err);
              reject(err);
            }

          })
          .on('end', () => {
            try {
              const concatedBuffer = Buffer.concat(chunks);
              let encoding = jschardet.detect(concatedBuffer).encoding;
              if (!encoding) {
                encoding = 'cp949'
              }
              const file = iconv.decode(concatedBuffer, encoding);

              const records = parse(file.toString("utf-8"), {
              })

              if (records.length < 1) {
                reject(new Error('파일 정보가 잘못되었습니다.'));
              }
              const header = records[0];

              const meta = new Meta();
              meta.title = title;
              meta.originalFileName = originalFileName;
              meta.filePath = filePath;
              meta.extension = ext;
              meta.skip = skip;
              meta.sheet = sheet;
              meta.encoding = encoding;
              meta.samples = this.getSampleData(records);

              const { types, lengths } = this.checkTypes(records, meta.skip);

              let columns = []
              for (let i = 0; i < header.length; i++) {
                const col:string = header[i].trim();
                // header에서 col length가 0인 경우 대부분 row 마지막에 ,가 있는 경우임. 예외 처리 필요
                // 중간에 column명이 없는 경우 Data 오류로 Fail
                if(col.length === 0 && i === header.length - 1) {
                  continue;
                }
                const metaCol = new MetaColumn();
                metaCol.originalColumnName = col;
                metaCol.columnName = col;
                metaCol.meta = meta;
                metaCol.order = i;
                metaCol.originalType = types[i];
                metaCol.type = types[i];
                columns.push(metaCol);
              }

              resolve({
                meta: meta,
                columns: columns
              });
            } catch (err) {
              reject(err);
            }
          })
      } catch (err) {
        console.error(err);
        reject(err);
        return;
      }
    });
  }

  /**
   * DB에 적재하기 위해 적합한 data type을 확인
   * 
   * @param records n x m의 csv records
   * @returns AcceptableType[]
   */
  checkTypes(records: string[][], skip: number): {types: AcceptableType[], lengths: number[]} {
    skip = skip + 1;
    const types = [];
    const lengths = [];
    for (let i = skip; i < records.length; i++) {
      if (i === skip) {
        for (let record of records[i]) {
          types.push(this.availableType(record))
          lengths.push(record.length)
        }
        continue;
      }

      for (let j = 0; j < records[i].length; j++) {
         //typecheck 도중 type이 변경 될 수 있기 때문에 type에 관계없이 maxlength는 항상 update 필요
        const currentLength = records[i][j].length;
        if(lengths[j] < currentLength) {
          lengths[j] = currentLength
        }
        //type이 varchar인 경우 Type을 확인하지 않고 다음 loop로 진행
        if (types[j] === AcceptableType.VARCHAR) continue;

        //기존 Type과 새로 판별한 Type이 다른 경우 Varchar로 변경
        //단 INTEGER의 경우 DOUBLE로 처리하는 것은 가능해야함
        const availableType = this.availableType(records[i][j]);
        
        if (availableType !== types[j]) {
          if ((availableType === AcceptableType.DOUBLE && types[j] === AcceptableType.INTEGER) || (availableType === AcceptableType.INTEGER && types[j] === AcceptableType.DOUBLE)) {
            types[j] = AcceptableType.DOUBLE
          } else {
            types[j] = AcceptableType.VARCHAR;
          }
        }        
      }

      //전체 타입이 varchar로 유츄되는 경우 더이상 Type을 확인하지 않고 break;
      if (types.every(type => type === AcceptableType.VARCHAR)) break;
    }
    
    // 전체 length를 확인하며 length가 너무 큰 경우 TEXT 타입으로 변경
    for(let i = 0; i < lengths.length; i++ ) {
      if(lengths[i] > 255) {
        types[i] = AcceptableType.TEXT
      }
    }
    return { types, lengths };
  }

  /**
   * string 값을 받아 Integer, Double, Date, Varchar 타입을 유추하는 함수
   * 
   * @param string Csv 셀 내부의 value
   * @returns AcceptableType
   */
  availableType(string) {
    try {
      const tempNumn = Number(string);
      if (!isNaN(tempNumn) && string.trim().length !== 0) {
        /**
         * 숫자 타입인 경우 INTEGER와 DOUBLE 중 선택
         */
        return this.isInt(tempNumn) ? AcceptableType.INTEGER : AcceptableType.DOUBLE
      }

      // if (moment(string, null, true).isValid()) {
      //   return AcceptableType.DATE;
      // }

      return AcceptableType.VARCHAR;
    } catch (err) {
      return AcceptableType.VARCHAR;
    }
  }

  /**
   * 파라메터로 넘어온 Number 값이 정수인지 판별
   * 
   * @param n 
   * @returns boolean
   */
  isInt(n) {
    return n % 1 === 0;
  }

  /**
   * 미리보기로 보여주기 위한 sample 데이터를 생성, 반환
   * 
   * @param records 전체 record
   * 
   * @returns JSON string
   */
  getSampleData(records) {
    let sampleDatas = []
    let end = records.length > 6 ? 6 : records.length;
    for (let i = 1; i < end; i++) {
      sampleDatas.push(records[i])
    }
    return JSON.stringify({ items: sampleDatas });
  }
  
}

export default CsvMetaLoadStrategy;