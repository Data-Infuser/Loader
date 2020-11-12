import Axios from 'axios';
import PortalResponse, { Data } from './interface/PortalResponse';
import { Application } from '../../entity/manager/Application';
import { Meta, MetaStatus } from '../../entity/manager/Meta';
import { Stage } from '../../entity/manager/Stage';
import { application } from 'express';

/**
 * 논의사항
 * 1. 해당 파일 데이터의 API 호출 주소는 어떻게 설정을 해야 하는지? (API 명 등...)
 * 2. 해당 API 의 소유주는?
 */
class Crawler {
  private page: number = 1;
  private perPage: number = 100;
  private totalPage: number = 0;
  private pkDict: Map<string, Data[]> = new Map();
  private failList: Data[] = [];

  private userId = 3;

  constructor(perPage?: number) {
    if (perPage) { this.perPage = perPage }
  }


  public async start(): Promise<Application[]> {
    await this.makeDict();
    const applications = this.genApplications();
    return Promise.resolve(applications);
  }

  private async makeDict() {
    while (true) {
      const jsonData = await this.getNextData();

      for(let el of jsonData.data) {
        // file_nm 이 없는 경우 pass
        if(!el.file_nm || el.download_url.trim().length === 0) {
          this.failList.push(el);
          continue;
        }
        //  파일 확장자 확인 필요
        const fileName = el.file_nm;
        const fnTokens = fileName.split(".");
        if (fnTokens.length !== 2 || fnTokens[1] !== "csv") {
          //csv기 아닌경우 failList에 추가
          this.failList.push(el);
          continue;
        } 

        let currentList = this.pkDict.get(el.public_data_pk);
        if (currentList === undefined) { currentList = [] }
        currentList.push(el);
        this.pkDict.set(el.public_data_pk, currentList);
      
      }

      if (this.page > this.totalPage) { break };
    }

    return Promise.resolve();
  }

  private genApplications() {
    const keys = this.pkDict.keys();
    const applications: Application[] = []
    for (let key of keys) {
      const datas = this.pkDict.get(key);
      // Map의 경우 존재하지 않는 경우 undefined
      if (!datas || datas.length === 0) { 
        continue;
      }
    
      //application 생성 코드가 필요함.
      const application = new Application();
      const dataForApplication = datas[0];
      dataForApplication.public_data_pk; // 목록 pk => application.portalIdentifier(신설 필요)
      application.title = dataForApplication.public_data_sj; // 목록 명 => application.title
      application.description = dataForApplication.etc_atent_matter;
      application.userId = this.userId;
      application.nameSpace = dataForApplication.public_data_pk;
      const stage = new Stage();
      stage.name = "1";
      stage.userId = this.userId;
      stage.metas = [];
      application.stages = [stage];

      for (let data of datas) {
        const newMeta = new Meta();
        newMeta.remoteFilePath = data.download_url;
        newMeta.originalFileName = data.file_nm;
        newMeta.dataType = "file-url";
        newMeta.extension = "csv";
        newMeta.title = data.data_nm;
        newMeta.status = MetaStatus.DOWNLOAD_SCHEDULED;
        application.stages[0].metas.push(newMeta);
      }
      applications.push(application);
    }

    return applications;
  }

  private async getNextData(): Promise<PortalResponse> {
    // 첫번쨰 페이지를 받아올 때 처리에 필요한 변수 저장
    if (this.page === 1) {
      // this.totalPage = sampleData.page.totalPage;
      this.totalPage = 1;
    }
    if (this.page % 1 === 0) { console.log(`current page ${this.page}`) }
    this.page++;
    const response = await Axios.get(`https://www.data.go.kr/api/dataset/csvFileData.do?key=ptech-VfP6vI90Xr&page=${this.page}&per_page=${this.perPage}`)
    const jsonData = response.data;
    return Promise.resolve(jsonData);
  }
}

export default Crawler;