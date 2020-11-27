import DataLoadStrategy from './DataLoadStrategy';
import { Stage } from '../../entity/manager/Stage';
import { Meta } from '../../entity/manager/Meta';

/**
 * 원천 데이터를 읽어 Data Infuser로 데이터 적재를 하는 클래스<br>
 * Strategy pattern을 사용하여 데이터 유형이 달라도 동일하게 동작되도록 설계됨
 */
class DataLoader {
  /**
   * 데이터 유형별 적재 기능을 담당하는 Strategy
   */
  private dataLoadStrategy: DataLoadStrategy;

  /**
   * 생성자.<br>
   * 객체 생성시 데이터 유형에 맞는 Stratrgy를 함께 전달해야 함
   * 
   * @param dataLoadStrategy DataLoadStrategy 객체
   */
  constructor(dataLoadStrategy: DataLoadStrategy) {
    this.dataLoadStrategy = dataLoadStrategy;
  }

  /**
   * 실제 데이터를 적재하는 함수<br>
   * Strategy 객체의 load 함수를 실행 함
   * 
   * @param stage 적재할 데이터의 Stage 객체
   * @param meta 적재할 데이터의 Meta 객체
   */
  public async load(stage: Stage, meta: Meta) {
    await this.dataLoadStrategy.load(stage, meta);
  }
}

export default DataLoader;