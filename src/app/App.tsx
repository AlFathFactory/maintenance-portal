import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../features/auth/AuthProvider';
import { ToastProvider } from '../shared/ui/ToastProvider';
import { AppShell } from './AppShell';
import { RequireAdmin } from '../features/auth/RequireAdmin';
import { AccessDeniedPage } from '../features/auth/AccessDeniedPage';
import { RequireHSE } from '../features/auth/RequireHSE';
import { hsePages } from '../features/hse/navigation';

const HSEShell = lazy(() => import('./HSEShell').then((module) => ({ default: module.HSEShell })));
const HSEPlaceholderPage = lazy(() =>
  import('../features/hse/HSEPlaceholderPage').then((module) => ({
    default: module.HSEPlaceholderPage,
  })),
);

const DashboardPage = lazy(() =>
  import('../features/equipment/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
);
const EquipmentPage = lazy(() =>
  import('../features/equipment/EquipmentPage').then((module) => ({
    default: module.EquipmentPage,
  })),
);
const TeamsPage = lazy(() =>
  import('../features/teams/TeamsPage').then((module) => ({ default: module.TeamsPage })),
);
const PublicQrPage = lazy(() =>
  import('../features/equipment/PublicQrPage').then((module) => ({ default: module.PublicQrPage })),
);
const QrSettingsPage = lazy(() =>
  import('../features/equipment/QrSettingsPage').then((module) => ({
    default: module.QrSettingsPage,
  })),
);
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
});

export function App() {
  const { t } = useTranslation();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <HashRouter>
            <Suspense fallback={<div className="loading">{t('app.loading')}</div>}>
              <Routes>
                <Route path="qr/:token" element={<PublicQrPage />} />
                <Route path="access-denied" element={<AccessDeniedPage />} />
                <Route element={<RequireHSE />}>
                  <Route path="hse" element={<HSEShell />}>
                    <Route index element={<HSEPlaceholderPage page={hsePages[0]} />} />
                    {hsePages.slice(1).map((page) =>
                      page.engineerOnly ? (
                        <Route
                          key={page.id}
                          element={<RequireHSE allowedRoles={['hse_engineer']} />}
                        >
                          <Route path={page.path} element={<HSEPlaceholderPage page={page} />} />
                        </Route>
                      ) : (
                        <Route
                          key={page.id}
                          path={page.path}
                          element={<HSEPlaceholderPage page={page} />}
                        />
                      ),
                    )}
                    <Route
                      path="*"
                      element={
                        <div className="not-found">
                          <h1>{t('app.notFound')}</h1>
                        </div>
                      }
                    />
                  </Route>
                </Route>
                <Route element={<AppShell />}>
                  <Route path="teams" element={<TeamsPage />} />
                </Route>
                <Route element={<RequireAdmin />}>
                  <Route element={<AppShell />}>
                    <Route index element={<DashboardPage />} />
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="equipment" element={<DashboardPage />} />
                    <Route path="equipment/:slug" element={<EquipmentPage />} />
                    <Route path="settings" element={<QrSettingsPage />} />
                  </Route>
                </Route>
                <Route
                  path="*"
                  element={
                    <div className="not-found">
                      <h1>{t('app.notFound')}</h1>
                    </div>
                  }
                />
              </Routes>
            </Suspense>
          </HashRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
