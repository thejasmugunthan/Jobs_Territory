import { Navigate, Outlet } from "react-router-dom";
import { PageLoader } from "../components/common/Loader";
import { useAuth } from "../features/auth/hooks/useAuth";

export function PublicRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
