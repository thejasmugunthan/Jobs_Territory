import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Pagination } from "../types/job.types";
export function JobPagination({ pagination, onPage }: { pagination: Pagination; onPage: (page: number) => void }) {
  return <nav className="job-pagination" aria-label="Job result pages"><span>Page {pagination.page} of {Math.max(pagination.total_pages, 1)} <i>·</i> {pagination.total_items} jobs</span><div><button aria-label="Previous page" disabled={!pagination.has_previous} onClick={() => onPage(pagination.page - 1)}><ChevronLeft size={16} /></button><button aria-label="Next page" disabled={!pagination.has_next} onClick={() => onPage(pagination.page + 1)}><ChevronRight size={16} /></button></div></nav>;
}
