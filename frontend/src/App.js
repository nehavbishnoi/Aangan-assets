import '@/App.css';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';

import { AuthProvider } from '@/lib/auth';

import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';

import Landing from '@/pages/Landing';
import MyAangan from '@/pages/MyAangan';
import TraditionCardPage from '@/pages/TraditionCardPage';
import VoiceStoryPage from '@/pages/VoiceStoryPage';
import FamilyCalendarPage from '@/pages/FamilyCalendarPage';
import RecipeCardPage from '@/pages/RecipeCardPage';
import AskAanganPage from '@/pages/AskAanganPage';
import PrivacyPage from '@/pages/PrivacyPage';
import EarlyAccessPage from '@/pages/EarlyAccessPage';
import HowItWorksPage from '@/pages/HowItWorksPage';
import ForFamiliesPage from '@/pages/ForFamiliesPage';

import { LoginPage, SignupPage, AcceptInvitePage } from '@/pages/auth/AuthPages';
import AppLayout from '@/pages/app/AppLayout';
import Dashboard from '@/pages/app/Dashboard';
import FamilyTreePage from '@/pages/app/FamilyTreePage';
import MemberFormPage from '@/pages/app/MemberFormPage';
import MemberDetailPage from '@/pages/app/MemberDetailPage';
import InvitePage from '@/pages/app/InvitePage';
import SettingsPage from '@/pages/app/SettingsPage';
import AskAanganApp from '@/pages/app/AskAanganApp';

/** Show marketing chrome only on marketing routes */
function ChromeAndRoutes() {
  const loc = useLocation();
  const isAppRoute = loc.pathname.startsWith('/app');
  return (
    <>
      {!isAppRoute && <SiteNav />}
      <Routes>
        {/* Marketing */}
        <Route path="/" element={<Landing />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/for-families" element={<ForFamiliesPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/early-access" element={<EarlyAccessPage />} />
        <Route path="/archive" element={<MyAangan />} />
        <Route path="/archive/tradition/:slug" element={<TraditionCardPage />} />
        <Route path="/archive/voice-story" element={<VoiceStoryPage />} />
        <Route path="/archive/calendar" element={<FamilyCalendarPage />} />
        <Route path="/archive/recipe/:slug" element={<RecipeCardPage />} />
        <Route path="/archive/ask-aangan" element={<AskAanganPage />} />

        {/* Auth (no chrome) */}
        <Route path="/app/login" element={<LoginPage />} />
        <Route path="/app/signup" element={<SignupPage />} />
        <Route path="/app/accept-invite/:token" element={<AcceptInvitePage />} />

        {/* Real product */}
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="family" element={<FamilyTreePage />} />
          <Route path="family/new" element={<MemberFormPage mode="create" />} />
          <Route path="family/:memberId" element={<MemberDetailPage />} />
          <Route path="family/:memberId/edit" element={<MemberFormPage mode="edit" />} />
          <Route path="invite" element={<InvitePage />} />
          <Route path="ask" element={<AskAanganApp />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
      {!isAppRoute && <SiteFooter />}
    </>
  );
}

function App() {
  return (
    <div className="App grain min-h-screen bg-[hsl(var(--aangan-ivory))]">
      <BrowserRouter>
        <AuthProvider>
          <ChromeAndRoutes />
          <Toaster
            position="bottom-center"
            toastOptions={{
              style: {
                background: 'hsl(145 21% 14%)',
                color: 'hsl(39 50% 97%)',
                border: 'none',
                borderRadius: '2px',
                fontFamily: 'Outfit, sans-serif',
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
