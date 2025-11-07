// src/App.jsx
import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgetPassword";
import ResetPassword from "./pages/ResetPassword";
import AcceptInvite from "./pages/AcceptInvite";
import SettingsAccount from "./pages/SettingsAccount";
import EmailSettings from "./pages/EmailSettings";
import Integrations from "./pages/Integrations";
import DashboardLayout from "./layouts/DashboardLayout";
import DashboardHome from "./pages/DashboardHome";
import Email from "./pages/Email";
import Kanban from "./pages/Kanban";
import Todo from "./pages/Todo";
import CRM from "./pages/CRM";
import MoneyManagement from "./pages/MoneyManagement";
import ImageConverter from './pages/ImageConverter';
import PrivateRoute from "./modules/auth/PrivateRoute"
import PermissionsMatrix from "./pages/PermissionMatrix";
import AdminDashboard from "./pages/AdminDashboard";
import Roles from "./pages/Roles";
import Members from "./pages/Members";
import Teams from "./pages/Teams";
import Audit from "./pages/Audit";
import Billing from "./pages/Billing";
import BillingSuccess from "./pages/BillingSuccess";
import BillingCancel from "./pages/BillingCancel";

export default function App() {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />

      {/* Protected dashboard tree */}
      <Route element={<PrivateRoute />}>
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="email" element={<Email />} />
          <Route path="kanban" element={<Kanban />} />
          <Route path="todo" element={<Todo />} />
          <Route path="crm" element={<CRM />} />
          <Route path="money" element={<MoneyManagement />} />
          <Route path="image-converter" element={<ImageConverter />} />
          <Route path="account-settings" element={<SettingsAccount />} />
          <Route path="email-settings" element={<EmailSettings />} />
          <Route path="integrations" element={<Integrations />} />
        </Route>

        {/* Admin pages (UI gating handled by Sidebar + withPermission) */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/permissions" element={<PermissionsMatrix />} />
        <Route path="/admin/roles" element={<Roles />} />
        <Route path="/admin/teams" element={<Teams />} />
        <Route path="/admin/members" element={<Members />} />
        <Route path="/admin/audit" element={<Audit />} />
        {/* Billing pages */}
        <Route path="/billing" element={<Billing />} />
        <Route path="/billing/success" element={<BillingSuccess />} />
        <Route path="/billing/cancel" element={<BillingCancel />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<div className="p-6">Not Found</div>} />
    </Routes>
  );
}
