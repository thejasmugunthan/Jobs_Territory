import { JobPagination } from "../../jobs/components/JobPagination";
import type { Pagination } from "../../jobs/types/job.types";
export function ApplicationPagination({pagination,onPage}:{pagination:Pagination;onPage:(page:number)=>void}){return <JobPagination pagination={pagination} onPage={onPage}/>;}
