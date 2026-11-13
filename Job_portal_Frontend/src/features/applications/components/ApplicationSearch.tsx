import type { FormEvent } from "react";
import { Search } from "lucide-react";
export function ApplicationSearch({value,onChange,onSearch}:{value:string;onChange:(value:string)=>void;onSearch:()=>void}){return <form className="application-search" role="search" onSubmit={(event:FormEvent)=>{event.preventDefault();onSearch();}}><Search size={15}/><input aria-label="Search applications" placeholder="Search by job title or company" value={value} onChange={event=>onChange(event.target.value)}/><button type="submit">Search</button></form>;}
