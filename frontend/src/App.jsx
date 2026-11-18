import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Benefits = lazy(() => import('./pages/Benefits'));
const Leads = lazy(() => import('./pages/Leads'));
const Clients = lazy(() => import('./pages/Clients'));
const ClientDetail = lazy(() => import('./pages/ClientDetail'));
const ClientReports = lazy(() => import('./pages/ClientReports'));
const ClientPortal = lazy(() => import('./pages/ClientPortal'));
const Invoices = lazy(() => import('./pages/Invoices'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const AdSpend = lazy(() => import('./pages/AdSpend'));
const Testili = lazy(() => import('./pages/Testili'));
const Tasks = lazy(() => import('./pages/Tasks'));
const ProjectTemplates = lazy(() => import('./pages/ProjectTemplates'));
const Services = lazy(() => import('./pages/Services'));
const Settings = lazy(() => import('./pages/Settings'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60 * 1000, retry: 1, refetchOnWindowFocus: false }
  }
});

function RoleGuard({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-dvh flex items-center justify-center text-sm">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    const fallback = user.role === 'TEAM' ? '/tasks' : user.role === 'MEDIA_BUYER' ? '/leads' : '/dashboard';
    return <Navigate to={fallback} replace />;
  }
  return children;
}

function DefaultRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'TEAM') return <Navigate to="/tasks" replace />;
  if (user.role === 'MEDIA_BUYER') return <Navigate to="/leads" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <BrowserRouter>
              <Toaster position="top-center" />
              <Suspense fallback={<div className="min-h-dvh flex items-center justify-center text-sm">...</div>}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/portal/:token" element={<ClientPortal />} />

                  <Route
                    element={
                      <RoleGuard>
                        <Layout />
                      </RoleGuard>
                    }
                  >
                    <Route index element={<DefaultRedirect />} />
                    <Route path="/dashboard" element={<RoleGuard roles={['ADMIN', 'ACCOUNTANT']}><Dashboard /></RoleGuard>} />
                    <Route path="/benefits" element={<RoleGuard roles={['ADMIN']}><Benefits /></RoleGuard>} />
                    <Route path="/leads" element={<RoleGuard roles={['ADMIN', 'ACCOUNTANT', 'MEDIA_BUYER']}><Leads /></RoleGuard>} />
                    <Route path="/clients" element={<RoleGuard roles={['ADMIN', 'ACCOUNTANT', 'MEDIA_BUYER']}><Clients /></RoleGuard>} />
                    <Route path="/clients/:id" element={<RoleGuard roles={['ADMIN', 'ACCOUNTANT', 'MEDIA_BUYER']}><ClientDetail /></RoleGuard>} />
                    <Route path="/client-reports" element={<RoleGuard roles={['ADMIN', 'ACCOUNTANT', 'MEDIA_BUYER']}><ClientReports /></RoleGuard>} />
                    <Route path="/invoices" element={<RoleGuard roles={['ADMIN', 'ACCOUNTANT']}><Invoices /></RoleGuard>} />
                    <Route path="/expenses" element={<RoleGuard roles={['ADMIN', 'ACCOUNTANT']}><Expenses /></RoleGuard>} />
                    <Route path="/suppliers" element={<RoleGuard roles={['ADMIN', 'ACCOUNTANT']}><Suppliers /></RoleGuard>} />
                    <Route path="/adspend" element={<RoleGuard roles={['ADMIN', 'ACCOUNTANT', 'MEDIA_BUYER']}><AdSpend /></RoleGuard>} />
                    <Route path="/testili" element={<RoleGuard roles={['ADMIN', 'MEDIA_BUYER']}><Testili /></RoleGuard>} />
                    <Route path="/tasks" element={<RoleGuard roles={['ADMIN', 'ACCOUNTANT', 'MEDIA_BUYER', 'TEAM']}><Tasks /></RoleGuard>} />
                    <Route path="/project-templates" element={<RoleGuard roles={['ADMIN', 'MEDIA_BUYER']}><ProjectTemplates /></RoleGuard>} />
                    <Route path="/services" element={<RoleGuard roles={['ADMIN', 'ACCOUNTANT']}><Services /></RoleGuard>} />
                    <Route path="/settings" element={<RoleGuard roles={['ADMIN']}><Settings /></RoleGuard>} />
                  </Route>

                  <Route path="*" element={<DefaultRedirect />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
