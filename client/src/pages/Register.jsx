import React, { useState } from "react";
import InputField from "../components/InputField";
import Button from "../components/Button";
import { signup } from "../api/authService";

const Register = () => {
  const [accountType, setAccountType] = useState("Entrepreneur");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    enterpriseName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword)
      return alert("Passwords do not match!");

    try {
      const res = await signup({ ...form, role: accountType });
      alert("Registration successful!");
      console.log(res);
    } catch (err) {
      alert(err.response?.data?.error || "Signup failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="w-full max-w-md bg-white shadow-2xl rounded-2xl p-8 transition-all duration-300 hover:shadow-blue-200">
        <h2 className="text-4xl font-extrabold text-center text-blue-700 mb-2">
          Create Account
        </h2>
        <p className="text-center text-gray-500 mb-8">
          Join Eterna as an Entrepreneur or Enterprise
        </p>

        {/* Account Type Toggle */}
        <div className="flex justify-center mb-6">
          {["Entrepreneur", "Enterprise"].map((type) => (
            <button
              key={type}
              onClick={() => setAccountType(type)}
              className={`px-5 py-2.5 mx-1 rounded-full text-sm font-semibold border transition-all duration-200 ${
                accountType === type
                  ? "bg-blue-600 text-white border-blue-600 shadow-md"
                  : "bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="First Name"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              placeholder="John"
            />
            <InputField
              label="Last Name"
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              placeholder="Doe"
            />
          </div>

          {accountType === "Enterprise" && (
            <InputField
              label="Enterprise Name"
              name="enterpriseName"
              value={form.enterpriseName}
              onChange={handleChange}
              placeholder="ABC Pvt. Ltd."
            />
          )}

          <InputField
            label="Username"
            name="username"
            value={form.username}
            onChange={handleChange}
            placeholder="johndoe"
          />

          <InputField
            type="email"
            label="Email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
          />

          <InputField
            type="password"
            label="Password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="********"
          />

          <InputField
            type="password"
            label="Confirm Password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder="********"
          />

          <div className="pt-2">
            <Button type="submit">Sign Up</Button>
          </div>
        </form>

        <p className="text-center mt-6 text-sm text-gray-600">
          Already have an account?{" "}
          <a
            href="/login"
            className="text-blue-600 font-semibold hover:underline"
          >
            Sign In
          </a>
        </p>
      </div>
    </div>
  );
};

export default Register;
