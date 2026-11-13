import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { PageLoader } from "../components/common/Loader";
import { ProtectedRoute } from "../routes/ProtectedRoute";
import { PublicRoute } from "../routes/PublicRoute";
import { ErrorBoundary } from "./ErrorBoundary";

const LandingPage = lazy(() => import("../features/landing/pages/LandingPage"));
const LoginPage = lazy(() => import("../pages/LoginPage"));
const RegisterPage = lazy(() => import("../pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("../pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("../pages/ResetPasswordPage"));
const DashboardPage = lazy(() => import("../features/dashboard/pages/DashboardPage"));
const FindJobsPage = lazy(() => import("../features/jobs/pages/FindJobsPage"));
const JobDetailsPage = lazy(() => import("../features/jobs/pages/JobDetailsPage"));
const ApplicationsPage = lazy(() => import("../features/applications/pages/ApplicationsPage"));
const ApplyJobPage = lazy(() => import("../features/applications/pages/ApplyJobPage"));
const ApplicationDetailsPage = lazy(() => import("../features/applications/pages/ApplicationDetailsPage"));
const SavedJobsPage = lazy(() => import("../features/jobs/pages/SavedJobsPage"));
const InterviewSchedulePage = lazy(() => import("../features/applications/pages/InterviewSchedulePage"));
const ProfilePage = lazy(() => import("../features/profile/pages/ProfilePage"));
const OnboardingPage = lazy(() => import("../features/profile/pages/OnboardingPage"));
const SettingsPage = lazy(() => import("../pages/SettingsPage"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage"));
const LegalPage = lazy(() => import("../pages/LegalPage"));
const ResumeAnalyzerPage = lazy(() => import("../features/resumes/ResumeAnalyzerPage"));
const JobMatchAnalysisPage = lazy(() => import("../features/matching/JobMatchAnalysisPage"));
const RecommendedJobsPage = lazy(() => import("../features/recommendations/RecommendedJobsPage"));
const JobAlertsPage = lazy(() => import("../features/alerts/JobAlertsPage"));
const NotificationsPage = lazy(() => import("../features/notifications/NotificationsPage"));
const ApplicationInsightsPage = lazy(() => import("../features/analytics/ApplicationInsightsPage"));
const CompareJobsPage = lazy(() => import("../features/jobs/pages/CompareJobsPage"));
const PublicJobSharePage = lazy(() => import("../features/jobs/pages/PublicJobSharePage"));
const HelpSupportPage = lazy(() => import("../features/support/HelpSupportPage"));

export function AppRouter() {
  return <ErrorBoundary><Suspense fallback={<PageLoader />}><Routes>
    <Route path="/" element={<LandingPage />} />
    <Route element={<PublicRoute />}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
    </Route>
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route path="/privacy" element={<LegalPage />} />
    <Route path="/terms" element={<LegalPage />} />
    <Route path="/public/jobs/:jobId" element={<PublicJobSharePage />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/recommended-jobs" element={<RecommendedJobsPage />} />
        <Route path="/job-alerts" element={<JobAlertsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/application-insights" element={<ApplicationInsightsPage />} />
        <Route path="/compare-jobs" element={<CompareJobsPage />} />
        <Route path="/jobs" element={<FindJobsPage />} />
        <Route path="/jobs/:jobId/apply" element={<ApplyJobPage />} />
        <Route path="/jobs/:jobId/match" element={<JobMatchAnalysisPage />} />
        <Route path="/jobs/:jobId" element={<JobDetailsPage />} />
        <Route path="/applications" element={<ApplicationsPage />} />
        <Route path="/applications/:applicationId" element={<ApplicationDetailsPage />} />
        <Route path="/saved-jobs" element={<SavedJobsPage />} />
        <Route path="/interviews" element={<InterviewSchedulePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/resume-analyzer" element={<ResumeAnalyzerPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/help-support" element={<HelpSupportPage />} />
      </Route>
    </Route>
    <Route path="*" element={<NotFoundPage />} />
  </Routes></Suspense></ErrorBoundary>;
}
