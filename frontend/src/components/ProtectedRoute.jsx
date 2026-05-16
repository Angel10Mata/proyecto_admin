import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, getToken } = useAuth()

  if (!user || !getToken()) {
    return <Navigate to="/login" replace />
  }

  return children
}
