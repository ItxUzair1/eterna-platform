// src/components/InputField.jsx
import React from "react";

const InputField = ({ label, type = "text", name, value, onChange, placeholder }) => (
  <div className="mb-4">
    <label className="block text-gray-700 text-sm font-medium mb-1">{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
    />
  </div>
);

export default InputField;
