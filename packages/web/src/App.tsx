import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { ProjectPage } from '@/pages/ProjectPage';
import { SettingsPage } from '@/pages/SettingsPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:projectId" element={<ProjectPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
