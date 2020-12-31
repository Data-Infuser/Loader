/**
 * 공공 데이터 포털 API의 응답을 처리하기 위한 인터페이스
 */
export default interface PortalResponse {
    /**
     * 한 페이지 당 데이터 개수
     */
    per_page: number,

    /**
     * 전체 데이터 개수
     */
    total_count: number,

    /**
     * 페이지네이션 관련 정보
     */
    page: Page,

    /**
     * 요청한 데이터 리스트
     */
    data: Data[]
}

/**
 * 페이지네이션 관련 정보
 */
interface Page {
    /**
     * 현재 페이지 번호
     */
    currentPage: number,
    
    /**
     * 한 페이지 당 데이터 개수
     */
    perPage: number,

    /**
     * 페이지네이션에서 사용된 offset 정보
     */
    offset: number,

    /**
     * 페이지네이션에서 사용된 end 정보
     */
    end: number,

    /**
     * 전체 데이터 개수
     */
    totalCount: number,

    /**
     * 위 perPage를 사용했을 때 전체 페이지 개수
     */
    totalPage: number,

    /**
     * 데이터의 클래스 명
     */
    className: null|number|string,

    /**
     * 경로
     */
    path: null|number|string,

    /**
     * 이전 페이지 번호
     */
    prevPage: number,

    /**
     * 시작 페이지 번호
     */
    beginPage: number,

    /**
     * 끝 페이지 번호
     */
    endPage: number,

    /**
     * 첫 아이템의 ID
     */
    firstItemNo: number
}

/**
 * 공공 데이터 포털에서 제공하는 파일 데이터 정보 인터페이스
 */
export interface Data {
    /**
     * 공공 데이터 포털 목록 식별자
     */
    public_data_pk:string,

    /**
     * 공공 데이터 포털 목록 상세 식별자
     */
    public_data_detail_pk:string,

    /**
     * 공공 데이터 포털 목록명
     */
    public_data_sj:string,

    /**
     * 파일 데이터 명
     */
    data_nm:string,

    /**
     * 파일 데이터 등록일
     */
    regist_dt:string,

    /**
     * 파일 데이터 수정일
     */
    updt_dt:string,

    /**
     * 
     */
    mgaha_data_yn:string,

    /**
     * 국가 중점 데이터 여부
     */
    core_data_at:string,

    /**
     * 상위 기관 코드
     */
    upper_instt_code:string,

    /**
     * 상위 기관명
     */
    upper_instt_nm:string,

    /**
     * 기관 코드
     */
    instt_code:string,

    /**
     * 기관명
     */
    instt_nm:string,

    /**
     * 기관유형
     */
    instt_ty:string,

    /**
     * BRM 분류명
     */
    brm_code_nm:string,

    /**
     * 키워드
     */
    kwrd:string,

    /**
     * 데이터 제공 형태
     */
    data_regist_ty_nm:string,

    /**
     * 제 3자 권리 포함 유무
     */
    data_cpyrhtensure_at:string,

    /**
     * 비용부과유무
     */
    pchrg_at_nm:string,

    /**
     * 사용범위
     */
    use_scope_code_nm:string,

    /**
     * 업데이트 주기
     */
    regist_cycle_nm:string,

    /**
     * 차기 등록 예정일
     */
    next_regist_prarnde:string,

    /**
     * 다운로드 수
     */
    down_cnt:string,

    /**
     * 대표 확장자
     */
    atch_file_extsn:string,

    /**
     * 미디어 유형
     */
    media_ty_nm:string,

    /**
     * 기타 이용 사항
     */
    etc_atent_matter:string,

    /**
     * 포털 접속 URL
     */
    file_data_url:string,

    /**
     * 파일 다운로드 URL
     */
    download_url:string,

    /**
     * 파일명
     */
    file_nm: string,

    /**
     * 파일 사이즈(kb)
     */
    file_size: number
}