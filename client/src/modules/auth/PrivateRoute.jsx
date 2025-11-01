import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

export default function PrivateRoute({ children }) {
  const { user, loading } = useContext(AuthContext) || {};
  const location = useLocation();

  if (loading) return null; // or a spinner
  if (!user) return <Navigate to="/" replace state={{ from: location }} />;

  return children || <Outlet />;
}
