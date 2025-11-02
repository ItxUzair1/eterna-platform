import { useMemo } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer } from "recharts";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function MoneyCharts({ stats }) {
  if (!stats) return null;

  const chartData = useMemo(() => {
    return {
      categoryData: stats.categoryDistribution || [],
      paymentData: stats.paymentMethodDistribution || [],
      top5Expenses: stats.top5Expenses || [],
      top5Income: stats.top5Income || [],
      incomeVsOutcome: stats.incomeVsOutcome || [],
    };
  }, [stats]);

  // Combine top expenses and income for comparison chart
  const expenseIncomeComparison = useMemo(() => {
    const expenseMap = new Map(chartData.top5Expenses.map(e => [e.category, e.amount]));
    const incomeMap = new Map(chartData.top5Income.map(i => [i.category, i.amount]));
    const allCategories = new Set([...expenseMap.keys(), ...incomeMap.keys()]);
    
    return Array.from(allCategories).map(cat => ({
      category: cat,
      expense: expenseMap.get(cat) || 0,
      income: incomeMap.get(cat) || 0,
    }));
  }, [chartData]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Category Distribution */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Category Distribution</h3>
        {chartData.categoryData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData.categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="amount"
              >
                {chartData.categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-slate-500">
            No data available
          </div>
        )}
      </div>

      {/* Payment Method Distribution */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Payment Method Distribution</h3>
        {chartData.paymentData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData.paymentData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ method, percent }) => `${method} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="amount"
              >
                {chartData.paymentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-slate-500">
            No data available
          </div>
        )}
      </div>

      {/* Top 5 Expenses vs Income */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Top 5 Expenses vs Income</h3>
        {expenseIncomeComparison.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={expenseIncomeComparison}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip formatter={(value) => value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} />
              <Legend />
              <Bar dataKey="expense" fill="#ef4444" name="Expenses" />
              <Bar dataKey="income" fill="#10b981" name="Income" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-slate-500">
            No data available
          </div>
        )}
      </div>

      {/* Income vs Outcome Over Time */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Income vs Outcome Over Time</h3>
        {chartData.incomeVsOutcome.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData.incomeVsOutcome}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip formatter={(value) => value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} />
              <Legend />
              <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} name="Income" />
              <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} name="Expenses" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-slate-500">
            No data available
          </div>
        )}
      </div>
    </div>
  );
}

