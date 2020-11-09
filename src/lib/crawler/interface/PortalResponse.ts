export default interface PortalResponse {
    per_page: number,
    total_count: number,
    page: Page,
    data: Data[]
}

interface Page {
    currentPage: number,
    perPage: number,
    offset: number,
    end: number,
    totalCount: number,
    totalPage: number,
    className: null|number|string,
    path: null|number|string,
    prevPage: number,
    beginPage: number,
    endPage: number,
    firstItemNo: number
}

export interface Data {
    public_data_pk:string,
    public_data_detail_pk:string,
    public_data_sj:string,
    data_nm:string,
    regist_dt:string,
    updt_dt:string,
    mgaha_data_yn:string,
    core_data_at:string,
    upper_instt_code:string,
    upper_instt_nm:string,
    instt_code:string,
    instt_nm:string,
    instt_ty:string,
    brm_code_nm:string,
    kwrd:string,
    data_regist_ty_nm:string,
    data_cpyrhtensure_at:string,
    pchrg_at_nm:string,
    use_scope_code_nm:string,
    regist_cycle_nm:string,
    next_regist_prarnde:string,
    down_cnt:string,
    atch_file_extsn:string,
    media_ty_nm:string,
    etc_atent_matter:string,
    file_data_url:string,
    download_url:string,
    file_nm: string
}