import DataLoadStrategy from './DataLoadStrategy';
import { Service } from '../../entity/manager/Service';
import { Application } from '../../entity/manager/Application';

class DataLoader {
  private dataLoadStrategy: DataLoadStrategy;

  constructor(dataLoadStrategy: DataLoadStrategy) {
    this.dataLoadStrategy = dataLoadStrategy;
  }

  public async load(application: Application, service: Service) {
    await this.dataLoadStrategy.load(application, service);
  }
}

export default DataLoader;