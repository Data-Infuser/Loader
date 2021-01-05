import { Meta } from '../src/entity/manager/Meta';
import FileManager from '../src/lib/file-manager/FileManager';
import MetaLoader from '../src/lib/meta-loader/MetaLoader';
import CsvMetaLoadStrategy from '../src/lib/meta-loader/strategies/CsvMetaLoadStrategy';
import {createWriteStream, createReadStream, WriteStream} from "fs";
import { MetaColumn } from '../src/entity/manager/MetaColumn';

const parse = require('csv-parse/lib/sync')
const iconv = require('iconv-lite');
const jschardet = require('jschardet');

const csvStrategy = new CsvMetaLoadStrategy();

const metaLoader = new MetaLoader(csvStrategy);


const fileStream = createReadStream("./filesForTest/의료통역능력검정시스템 개방데이터(1차)-시험 차수 및 세부 시험 정보.csv");
let chunks = [];
let rowCounts = 0;
fileStream.on('error', (err) => {
    console.error(err);
})
    .on('data', (chunk) => {
        try {
            const count = chunk.toString().split('\n').length - 1;
            rowCounts = rowCounts + count;
            chunks.push(chunk);
        } catch (err) {
            console.error(err);
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
                console.error(new Error('파일 정보가 잘못되었습니다.'));
            }
            const header = records[0];
            const meta = new Meta();
            
            meta.encoding = encoding;

            const { types, lengths } = csvStrategy.checkTypes(records, 1);

            console.log(types)
            console.log(lengths)

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

            console.log(columns);

            

        } catch (err) {
            console.error(err)
        }
    })