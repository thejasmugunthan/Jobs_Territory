import { useEffect, useState, type FormEvent } from "react";
import { MapPin, Search, X } from "lucide-react";

export function JobSearchBar({ query, location, onSearch, loading }: { query: string; location: string; onSearch: (query: string, location: string) => void; loading: boolean }) {
  const [keyword, setKeyword] = useState(query);
  const [place, setPlace] = useState(location);
  useEffect(() => setKeyword(query), [query]);
  useEffect(() => setPlace(location), [location]);
  const submit = (event: FormEvent) => { event.preventDefault(); onSearch(keyword.trim(), place.trim()); };
  return <form className="job-search-form" onSubmit={submit} role="search">
    <label className="job-search-field"><Search size={18} /><input aria-label="Search roles, companies, skills" placeholder="Job title, company, or skill" value={keyword} onChange={(event) => setKeyword(event.target.value)} />{keyword && <button type="button" aria-label="Clear search" onClick={() => { setKeyword(""); onSearch("", place.trim()); }}><X size={15} /></button>}</label>
    <span className="job-search-divider" />
    <label className="job-search-field job-location-search"><MapPin size={17} /><input aria-label="Search location" placeholder="City, state, or country" value={place} onChange={(event) => setPlace(event.target.value)} />{place && <button type="button" aria-label="Clear location" onClick={() => { setPlace(""); onSearch(keyword.trim(), ""); }}><X size={15} /></button>}</label>
    <button className="button button-primary job-search-submit" type="submit" disabled={loading}><Search size={16} /> Search jobs</button>
  </form>;
}
