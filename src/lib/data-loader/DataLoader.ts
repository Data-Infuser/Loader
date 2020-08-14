import DataLoadStrategy from './DataLoadStrategy';
import { Service } from '../../entity/manager/Service';
import { Application } from '../../entity/manager/Application';
import { Stage } from '../../entity/manager/Stage';

class DataLoader {
  private dataLoadStrategy: DataLoadStrategy;

  constructor(dataLoadStrategy: DataLoadStrategy) {
    this.dataLoadStrategy = dataLoadStrategy;
  }

  public async load(stage: Stage, service: Service) {
    await this.dataLoadStrategy.load(stage, service);
  }
}

export default DataLoader;