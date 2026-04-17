import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import GridMotion from './components/GridMotion';
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
import NotFoundPage from './pages/NotFoundPage';

const IMAGES = [
  'https://images.unsplash.com/photo-1574484284002-952d92456975?w=600&q=80', // Turkish
  'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&q=80', // Japanese — sushi
  'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=600&q=80', // Indian — curry
  'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80', // Mexican — tacos
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80', // Italian — pizza
  'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=600&q=80', // Italian — pasta
  'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&q=80', // Chinese — dim sum
  'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&q=80', // Korean — BBQ
  'https://images.unsplash.com/photo-1559847844-5315695dadae?w=600&q=80', // Thai — noodles
  'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&q=80', // Thai — curry
  'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&q=80', // South Asian — rice
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80', // French — fine dining
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80', // American — burger
  'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&q=80', // American — steak
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80', // Mediterranean — fish
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80', // Mediterranean — salad
  'https://images.unsplash.com/photo-1536304447766-da0ed4ce1b73?w=600&q=80', // Mediterranean — mezze
  'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=600&q=80', // European — bread
  'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80', // Asian — soup
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80', // Breakfast culture
  'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=600&q=80', // Food platter
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80', // Bowl culture
  'https://images.unsplash.com/photo-1555126634-323283e090fa?w=600&q=80', // Coffee culture
];

export default function App() {
  const location = useLocation();
  const isAuthPage = ['/login', '/register'].includes(location.pathname);

  return (
    <>
      {isAuthPage && (
        <>
          <div className="login-bg">
            <GridMotion items={IMAGES} gradientColor="rgba(44,16,8,0.55)" />
          </div>
          <div className="login-filter"></div>
        </>
      )}
      {!isAuthPage && <Navbar /></}
      <div className="page-wrapper">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/recipes" element={<RecipeListPage />} />
          <Route path="/stories" element={<StoryListPage />} />

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
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </>
  );
}
