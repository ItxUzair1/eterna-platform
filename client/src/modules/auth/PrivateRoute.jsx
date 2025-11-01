// src/features/auth/PrivateRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';

export default function PrivateRoute({ children }) {
  const token = localStorage.getItem('accessToken'); // ✅ fixed
  const location = useLocation();

  if (!token) return <Navigate to="/" replace state={{ from: location }} />;
  return children;
}
