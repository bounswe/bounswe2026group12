import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SearchPage from './pages/SearchPage';
import RecipeListPage from './pages/RecipeListPage';
import RecipeDetailPage from './pages/RecipeDetailPage';
import RecipeCreatePage from './pages/RecipeCreatePage';
import RecipeEditPage from './pages/RecipeEditPage';
import StoryListPage from './pages/StoryListPage';
import StoryDetailPage from './pages/StoryDetailPage';
import StoryCreatePage from './pages/StoryCreatePage';
import StoryEditPage from './pages/StoryEditPage';
import InboxPage from './pages/InboxPage';
import ThreadPage from './pages/ThreadPage';
import OnboardingPage from './pages/OnboardingPage';
import MapPage from './pages/MapPage';
import ExplorePage from './pages/ExplorePage';
import EventDetailPage from './pages/EventDetailPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <>
      <Navbar />
      <div className="page-wrapper">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/recipes" element={<RecipeListPage />} />
          <Route path="/stories" element={<StoryListPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/explore/:eventId" element={<EventDetailPage />} />

          <Route
            path="/recipes/new"
            element={<ProtectedRoute><RecipeCreatePage /></ProtectedRoute>}
          />
          <Route
            path="/recipes/:id/edit"
            element={<ProtectedRoute><RecipeEditPage /></ProtectedRoute>}
          />
          <Route
            path="/stories/new"
            element={<ProtectedRoute><StoryCreatePage /></ProtectedRoute>}
          />
          <Route
            path="/stories/:id/edit"
            element={<ProtectedRoute><StoryEditPage /></ProtectedRoute>}
          />

          <Route path="/recipes/:id" element={<RecipeDetailPage />} />
          <Route path="/stories/:id" element={<StoryDetailPage />} />

          <Route
            path="/inbox"
            element={<ProtectedRoute><InboxPage /></ProtectedRoute>}
          />
          <Route
            path="/inbox/:threadId"
            element={<ProtectedRoute><ThreadPage /></ProtectedRoute>}
          />
          <Route
            path="/onboarding"
            element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>}
          />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </>
  );
}
