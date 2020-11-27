import Axios from 'axios';
import PortalResponse, { Data } from './interface/PortalResponse';
import { Application } from '../../entity/manager/Application';
import { Meta, MetaStatus } from '../../entity/manager/Meta';
import { Stage } from '../../entity/manager/Stage';
import { application } from 'express';

/**
 * 공공 데이터 포털에서 제공하는 파일데이터를 수집하기 위한 클래스
 */
class Crawler {
  /**
   * 수집 할 page 번호
   */
  private page: number = 1;
  /**
   * 한 페이지당 데이터의 개수<br>
   * 2020.11.27 현재 최대 10000건까지 요청 가능한 것으로 확인됨
   */
  private perPage: number = 50;
  /**
   * 전체 페이지 개수<br>
   * Crawler가 동작하며 할당 됨
   */
  private totalPage: number = 0;
  /**
   * public-data-pk 별 data 를 정리하기 위한 dict
   */
  private pkDict: Map<string, Data[]> = new Map();
  /**
   * 다운로드가 실패한 Data 리스트
   */
  private failList: Data[] = [];

  /**
   * 해당 API 소유자의 Data Infuser User ID
   */
  private userId = 3;

  /**
   * 크롤러 생성자<br>
   * perPage외 다른 프로퍼티는 공공 데이터 포털 API 를 사용하여 생성 됨
   * 
   * @param perPage 한 페이지에서 몇개의 데이터 개수
   */
  constructor(perPage?: number) {
    if (perPage) { this.perPage = perPage }
  }


  /**
   * 데이터 수집을 시작하는 메소드
   */
  public async start(): Promise<Application[]> {
    await this.makeDict();
    const applications = this.genApplications();
    return Promise.resolve(applications);
  }

  /**
   * public data pk를 이용하여 Dictionary 자료구조를 생성하는 메소드
   */
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

  /**
   * 수집된 데이터를 사용하여 Data Infuser의 Entity 객체를 생성하는 메소드
   */
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

  /**
   * 다음 페이지의 데이터를 요청하는 메소드
   */
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