import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SearchPage from './pages/SearchPage';
import RecipeDetailPage from './pages/RecipeDetailPage';
import StoryDetailPage from './pages/StoryDetailPage';
import RecipeCreatePage from './pages/RecipeCreatePage';
import RecipeEditPage from './pages/RecipeEditPage';
import StoryCreatePage from './pages/StoryCreatePage';

export default function App() {
  return (
    <>
      <Navbar />
      <div className="page-wrapper">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/search" element={<SearchPage />} />

          {/* Protected routes — must be before dynamic :id routes */}
          <Route
            path="/recipes/new"
            element={
              <ProtectedRoute>
                <RecipeCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recipes/:id/edit"
            element={
              <ProtectedRoute>
                <RecipeEditPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stories/new"
            element={
              <ProtectedRoute>
                <StoryCreatePage />
              </ProtectedRoute>
            }
          />

          {/* Dynamic public routes */}
          <Route path="/recipes/:id" element={<RecipeDetailPage />} />
          <Route path="/stories/:id" element={<StoryDetailPage />} />
        </Routes>
      </div>
    </>
  );
}
