// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import DashboardLayout from "./layouts/DashboardLayout";
import Email from './pages/Email';
import Kanban from './pages/Kanban';


function App() {
  return (
    <Router>
      <Routes>
        {/* Auth Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Dashboard Layout */}
        <Route path="/dashboard" element={<DashboardLayout />}>
        <Route path="/dashboard/email" element={<Email />} />
        <Route path="/dashboard/kanban" element={<Kanban />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
