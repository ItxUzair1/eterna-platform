import React, { useState } from "react";
import InputField from "../components/InputField";
import Button from "../components/Button";
import { signin } from "../api/authService";

const Login = () => {
  const [form, setForm] = useState({ identifier: "", password: "" }); // identifier = email or username

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await signin(form);
      alert("Login successful!");
      console.log(res);
      localStorage.setItem("token", res.token);
    } catch (err) {
      alert(err.response?.data?.error || "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white shadow-2xl rounded-2xl p-8">
        <h2 className="text-3xl font-bold text-center mb-4 text-blue-600">Welcome Back</h2>
        <p className="text-center text-gray-500 mb-6">Sign in with your email or username</p>

        <form onSubmit={handleSubmit}>
          <InputField
            label="Email or Username"
            name="identifier"
            value={form.identifier}
            onChange={handleChange}
            placeholder="Enter your email or username"
          />
          <InputField
            type="password"
            label="Password"
            name="password"
            value={form.password}
            onChange={handleChange}
          />

          <div className="flex justify-between items-center mb-4">
            <a href="/forgot-password" className="text-sm text-blue-600 hover:underline">
              Forgot password?
            </a>
          </div>

          <Button type="submit">Sign In</Button>
        </form>

        <p className="text-center mt-4 text-sm text-gray-600">
          Don’t have an account?{" "}
          <a href="/register" className="text-blue-600 font-semibold hover:underline">
            Create one
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;
