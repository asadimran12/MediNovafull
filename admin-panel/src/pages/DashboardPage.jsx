import { useState, useEffect, useMemo } from 'react';
import { fetchUsers } from '../api';
import StatCard from '../components/StatCard';
import UserModal from '../components/UserModal';
import { showToast } from '../components/Toast';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from 'recharts';

const COLORS = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  async function load() {
    try {
      setLoading(true);
      const res = await fetchUsers();
      setData(res);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const users = Array.isArray(data) ? data : data?.users || [];

  const totalPlans = users.reduce(
    (a, u) => a + Object.keys(u.plans || {}).length,
    0
  );

  const totalChats = users.reduce(
    (a, u) => a + Object.keys(u.chats || {}).length,
    0
  );

  const withCond = users.filter(
    (u) => (u.profile?.conditions || '').trim()
  ).length;

  // =========================
  // Disease Chart Data
  // =========================
  const diseaseData = useMemo(() => {
    const map = {};

    users.forEach((u) => {
      const conditions = u.profile?.conditions || '';

      conditions
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
        .forEach((condition) => {
          map[condition] = (map[condition] || 0) + 1;
        });
    });

    return Object.entries(map).map(([name, value]) => ({
      name,
      value,
    }));
  }, [users]);

  // =========================
  // AI Models Chart Data
  // =========================
  const modelData = useMemo(() => {
    const map = {};

    users.forEach((u) => {
      const model = u.activeModelName || 'Unknown';

      map[model] = (map[model] || 0) + 1;
    });

    return Object.entries(map).map(([name, value]) => ({
      name,
      value,
    }));
  }, [users]);

  return (
    <div className="flex flex-col gap-7">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-syne font-bold text-3xl text-text-primary">
          Dashboard
        </h1>

        <button
          onClick={load}
          className="px-4 py-2 rounded-xl bg-surface2 border border-border text-sm text-text-muted hover:text-white hover:border-cyan-500 transition-all"
        >
          ⟳ Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={loading ? '…' : users.length}
          color="cyan"
        />

        <StatCard
          label="Total Plans"
          value={loading ? '…' : totalPlans}
          color="green"
        />

        <StatCard
          label="Total Chats"
          value={loading ? '…' : totalChats}
          color="purple"
        />

        <StatCard
          label="With Conditions"
          value={loading ? '…' : withCond}
          color="amber"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Disease Chart */}
        <div className="bg-surface rounded-3xl border border-border p-5 shadow-lg">
          <h2 className="text-lg font-semibold mb-5 text-white">
            Most Common Diseases
          </h2>

          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <BarChart data={diseaseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="name" stroke="#aaa" />
                <YAxis stroke="#aaa" />
                <Tooltip />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {diseaseData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Models Chart */}
        <div className="bg-surface rounded-3xl border border-border p-5 shadow-lg">
          <h2 className="text-lg font-semibold mb-5 text-white">
            AI Models Usage
          </h2>

          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <PieChart>
                <Pie
                  data={modelData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={110}
                  innerRadius={60}
                  paddingAngle={5}
                  label
                >
                  {modelData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>

                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <UserModal
          user={modal}
          onClose={() => setModal(null)}
          onUpdated={load}
          onDeleted={load}
        />
      )}
    </div>
  );
}