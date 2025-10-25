// src/components/DashboardCard.jsx
import React from "react";

const DashboardCard = ({ title, value, change, icon }) => {
  return (
    <div className="bg-white rounded-xl p-5 shadow hover:shadow-md transition flex items-center justify-between">
      <div>
        <h3 className="text-gray-600 text-sm">{title}</h3>
        <h2 className="text-2xl font-bold text-gray-800 mt-1">{value}</h2>
        <p className="text-sm text-green-500 mt-1">{change}</p>
      </div>
      <div className="text-indigo-600 text-3xl">{icon}</div>
    </div>
  );
};

export default DashboardCard;
