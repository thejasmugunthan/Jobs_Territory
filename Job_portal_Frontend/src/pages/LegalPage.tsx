import { Link, useLocation } from "react-router-dom";
import { Brand } from "../components/layout/Brand";

export default function LegalPage() {
  const location = useLocation();
  const privacy = location.pathname === "/privacy";
  return <main className="legal-page"><Brand /><span className="eyebrow">JOBS TERRITORY</span><h1>{privacy ? "Privacy" : "Terms of service"}</h1><p className="legal-updated">Information page</p><div className="legal-content"><p>This page is a placeholder for the Jobs Territory {privacy ? "privacy notice" : "terms of service"}. The product owner should add the approved policy before inviting public users.</p><p>This frontend sends account information to the configured Jobs Territory API. Authentication tokens are held in memory for this browser tab; they are not saved to local storage.</p></div><Link className="button button-primary" to="/">Return to Jobs Territory</Link></main>;
}
