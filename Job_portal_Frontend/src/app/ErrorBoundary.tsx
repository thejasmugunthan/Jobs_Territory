import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";

interface Props { children: ReactNode }
interface State { failed: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };
  static getDerivedStateFromError(): State { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("Frontend rendering error", error, info.componentStack); }
  render() {
    if (this.state.failed) return <main className="fatal-error"><div className="empty-state-icon">!</div><h1>We hit a snag</h1><p>Your account and saved information are safe. Try reloading this page.</p><button className="button button-primary" onClick={() => window.location.reload()}>Reload page</button><Link to="/">Go home</Link></main>;
    return this.props.children;
  }
}
