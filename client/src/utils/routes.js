import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Billing from '../pages/Billing';

export function BillingLink() {
  return <Link to="/billing">Billing</Link>;
}

export function AppRoutes({ children }) {
  return (
    <BrowserRouter>
      {children}
      <Routes>
        <Route path="/billing" element={<Billing />} />
      </Routes>
    </BrowserRouter>
  );
}


