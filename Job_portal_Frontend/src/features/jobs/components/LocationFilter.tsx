import { useEffect, useState, type FormEvent } from "react";
import { TextField } from "../../../components/common/TextField";

export function LocationFilter({ params, onPatch }: { params: URLSearchParams; onPatch: (values: Record<string, string | undefined>) => void }) {
  const [values, setValues] = useState({ city: params.get("city") ?? "", state: params.get("state") ?? "", country: params.get("country") ?? "" });
  useEffect(() => setValues({ city: params.get("city") ?? "", state: params.get("state") ?? "", country: params.get("country") ?? "" }), [params.toString()]);
  const submit = (event: FormEvent) => { event.preventDefault(); onPatch({ city: values.city.trim() || undefined, state: values.state.trim() || undefined, country: values.country.trim() || undefined }); };
  return <form className="job-filter-section" onSubmit={submit}><h3>Location</h3><div className="job-location-fields"><TextField label="City" placeholder="e.g. Bengaluru" value={values.city} onChange={(event) => setValues((v) => ({ ...v, city: event.target.value }))} /><TextField label="State" placeholder="e.g. Karnataka" value={values.state} onChange={(event) => setValues((v) => ({ ...v, state: event.target.value }))} /><TextField label="Country" placeholder="e.g. India" value={values.country} onChange={(event) => setValues((v) => ({ ...v, country: event.target.value }))} /></div><button className="job-filter-apply" type="submit">Apply location</button></form>;
}
