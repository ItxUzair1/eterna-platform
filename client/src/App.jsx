// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgetPassword";
import ResetPassword from "./pages/ResetPassword";
import Verify2FA from "./pages/Verify2FA";
import UseRecovery from "./pages/UseRecovery";
import AcceptInvite from "./pages/AcceptInvite";
import SettingsAccount from "./pages/SettingsAccount";

import DashboardLayout from "./layouts/DashboardLayout";
import Email from "./pages/Email";
import Kanban from "./pages/Kanban";
import Todo from "./pages/Todo";
import CRM from "./pages/CRM";
import PrivateRoute from "./modules/auth/PrivateRoute"

function App() {
  return (
    <Router>
      <Routes>
        {/* Auth */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-2fa" element={<Verify2FA />} />
        <Route path="/use-recovery" element={<UseRecovery />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />

        {/* Protected area */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <DashboardLayout />
            </PrivateRoute>
          }
        >
          {/* Use relative paths under /dashboard and provide an index route */}
          <Route index element={<div className="p-6">Welcome to Eterna</div>} />
          <Route path="email" element={<Email />} />
          <Route path="kanban" element={<Kanban />} />
          <Route path="todo" element={<Todo />} />
          <Route path="crm" element={<CRM />} />
          <Route path="account-settings" element={<SettingsAccount />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<div className="p-6">Not Found</div>} />
      </Routes>
    </Router>
  );
}

export default App;
