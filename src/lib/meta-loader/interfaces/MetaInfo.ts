import { Meta } from "../../../entity/manager/Meta";
import { MetaColumn } from "../../../entity/manager/MetaColumn";

/**
 * Meta load 결과 데이터 인터페이스
 */
export interface MetaInfo {
    meta: Meta;
    columns: MetaColumn[];
}
