import { Service } from '../../entity/manager/Service';
import { Application } from '../../entity/manager/Application';

interface DataLoadStrategy {
  load(application: Application,service:Service);
}

export default DataLoadStrategy;