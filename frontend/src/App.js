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
import StoriesPage from '@/pages/app/StoriesPage';
import {
  EntityListPage, EntityDetailPage, RecipeFormPage, CultureFormPage, RitualFormPage,
  recipeRowCard, cultureRowCard, ritualRowCard,
  renderRecipeDetail, renderCultureDetail, renderRitualDetail,
} from '@/pages/app/EntityPages';
import { recipesApi, culturesApi, ritualsApi } from '@/lib/api';

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

          <Route path="recipes" element={<EntityListPage apiClient={recipesApi} kind="recipes" title="Our table" blurb="Family recipes, in the words of the person who cooks them best. Add ingredients, steps, the occasions you make them, and the story behind each one." newLabel="Add a recipe" ItemCard={recipeRowCard} />} />
          <Route path="recipes/new" element={<RecipeFormPage apiClient={recipesApi} mode="create" />} />
          <Route path="recipes/:id" element={<EntityDetailPage apiClient={recipesApi} kind="recipes" backTo="/app/recipes" render={renderRecipeDetail} />} />
          <Route path="recipes/:id/edit" element={<RecipeFormPage apiClient={recipesApi} mode="edit" />} />

          <Route path="culture" element={<EntityListPage apiClient={culturesApi} kind="culture" title="Our culture" blurb="The festivities, traditions, and celebrations that make your family yours. Record how each one is done, who attends, and what food is made." newLabel="Add a tradition" ItemCard={cultureRowCard} />} />
          <Route path="culture/new" element={<CultureFormPage apiClient={culturesApi} mode="create" />} />
          <Route path="culture/:id" element={<EntityDetailPage apiClient={culturesApi} kind="culture" backTo="/app/culture" render={renderCultureDetail} />} />
          <Route path="culture/:id/edit" element={<CultureFormPage apiClient={culturesApi} mode="edit" />} />

          <Route path="rituals" element={<EntityListPage apiClient={ritualsApi} kind="rituals" title="Our rituals" blurb="Daily, weekly, yearly &mdash; the quiet habits that hold a family together. Add the guideline, who follows it, and why." newLabel="Add a ritual" ItemCard={ritualRowCard} />} />
          <Route path="rituals/new" element={<RitualFormPage apiClient={ritualsApi} mode="create" />} />
          <Route path="rituals/:id" element={<EntityDetailPage apiClient={ritualsApi} kind="rituals" backTo="/app/rituals" render={renderRitualDetail} />} />
          <Route path="rituals/:id/edit" element={<RitualFormPage apiClient={ritualsApi} mode="edit" />} />

          <Route path="stories" element={<StoriesPage />} />
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
