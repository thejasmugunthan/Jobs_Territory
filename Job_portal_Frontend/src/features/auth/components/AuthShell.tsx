import type { ReactNode } from "react";
import { ArrowUpRight, Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Brand } from "../../../components/layout/Brand";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return <div className="auth-page">
    <div className="auth-brand"><Brand /></div>
    <div className="auth-shell">
      <section className="auth-visual" aria-label="Jobs Territory introduction">
        <div className="auth-visual-glow" />
        <div className="auth-visual-top"><span className="auth-pill"><Sparkles size={14} /> Your career, in motion</span><Link to="/" aria-label="Visit home"><ArrowUpRight size={20} /></Link></div>
        <div className="auth-visual-copy"><span className="eyebrow-light">MAKE YOUR NEXT MOVE</span><h2>Small steps.<br /><em>Big possibilities.</em></h2><p>Bring your experience together and move toward work that feels right for you.</p></div>
        <div className="auth-mini-card"><div className="auth-mini-icon"><Check size={17} /></div><div><strong>Your journey starts here</strong><span>One profile, a clearer next step.</span></div><span className="mini-card-arrow">↗</span></div>
        <div className="auth-visual-lines" />
      </section>
      <section className="auth-form-side"><div className="auth-form-content"><div className="auth-mobile-brand"><Brand /></div><div className="auth-heading"><span className="eyebrow">JOBS TERRITORY</span><h1>{title}</h1><p>{subtitle}</p></div>{children}{footer}</div><p className="auth-legal">By continuing, you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.</p></section>
    </div>
    <p className="auth-bottom-note">© {new Date().getFullYear()} Jobs Territory <span>•</span> A thoughtful place to find your next chapter</p>
  </div>;
}
