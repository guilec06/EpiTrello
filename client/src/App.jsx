import { Navigate, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import ProfilePage from './pages/ProfilePage'
import BoardsPage from './pages/BoardsPage'
import BoardPage from './pages/BoardPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/"          element={<Navigate to="/boards" replace />} />
        <Route path="/login"     element={<ProfilePage />} />
        <Route path="/register"  element={<ProfilePage />} />
        <Route path="/profile"   element={<ProfilePage />} />
        <Route path="/boards" element={
          <ProtectedRoute><BoardsPage /></ProtectedRoute>
        } />
        <Route path="/boards/:id" element={
          <ProtectedRoute><BoardPage /></ProtectedRoute>
        } />
      </Routes>
      <Footer />
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
