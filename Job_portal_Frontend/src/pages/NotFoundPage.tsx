import { Link } from "react-router-dom";
import { Brand } from "../components/layout/Brand";

export default function NotFoundPage() {
  return <main className="not-found"><Brand /><span className="not-found-code">404</span><h1>This page wandered off.</h1><p>The page may have moved or the address may be mistyped.</p><Link className="button button-primary" to="/">Back to home</Link></main>;
}
