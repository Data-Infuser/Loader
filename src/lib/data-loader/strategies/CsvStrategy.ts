import DataLoadStrategy from "../DataLoadStrategy";
import * as Excel from 'exceljs';
import { Service } from "../../../entity/manager/Service";
import { Application } from "../../../entity/manager/Application";
import { Meta } from "../../../entity/manager/Meta";
import { QueryRunner } from "typeorm";
import fs from 'fs';

const parse = require('csv-parse/lib/sync')
const iconv = require('iconv-lite');
const jschardet = require('jschardet');

class CsvStrategy extends DataLoadStrategy {

  constructor(defaultQueryRunner: QueryRunner) {
    super(defaultQueryRunner);
  }
  
  async generateRows(meta:Meta, originalColumnNames:string[]): Promise<any[]> {
    return new Promise(async(resolve, reject) => {
      try {
        const fromLine = 2 + Number(meta.skip);
        const encodedFile = fs.readFileSync(meta.filePath);
        const encoding = jschardet.detect(encodedFile).encoding;
        const file = iconv.decode(encodedFile, encoding);
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