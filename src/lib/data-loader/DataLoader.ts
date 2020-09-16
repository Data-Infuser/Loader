import DataLoadStrategy from './DataLoadStrategy';
import { Stage } from '../../entity/manager/Stage';
import { Meta } from '../../entity/manager/Meta';

class DataLoader {
  private dataLoadStrategy: DataLoadStrategy;

  constructor(dataLoadStrategy: DataLoadStrategy) {
    this.dataLoadStrategy = dataLoadStrategy;
  }

  public async load(stage: Stage, meta: Meta) {
    await this.dataLoadStrategy.load(stage, meta);
  }
}

export default DataLoader;