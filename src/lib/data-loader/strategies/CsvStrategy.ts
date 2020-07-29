import DataLoadStrategy from "../DataLoadStrategy";
import * as Excel from 'exceljs';
import { Service } from "../../../entity/manager/Service";
import { Application } from "../../../entity/manager/Application";
import { Meta } from "../../../entity/manager/Meta";
import { QueryRunner } from "typeorm";
import fs from 'fs';

const parse = require('csv-parse/lib/sync')
const iconv = require('iconv-lite');

class CsvStrategy extends DataLoadStrategy {

  constructor(defaultQueryRunner: QueryRunner) {
    super(defaultQueryRunner);
  }
  
  async generateRows(meta:Meta, originalColumnNames:string[]): Promise<any[]> {
    return new Promise(async(resolve, reject) => {
      try {
        const fromLine = 2 + Number(meta.skip);
        const file = iconv.decode(fs.readFileSync(meta.filePath), 'euc-kr');
        const records = parse(file.toString("utf-8"), {
          from_line: fromLine
        })
        resolve(records);
      } catch (err) {
        console.error(err);
        reject(err);
      }
    })
  }
}

export default CsvStrategy;