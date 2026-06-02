'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart,
} from 'recharts';

interface DashboardData {
  totalRegistrations: number;
  todayRegistrations: number;
  weekRegistrations: number;
  pendingCount: number;
  dailyTrend: { date: string; count: number }[];
  schoolDistribution: { school: string; count: number }[];
  gradeDistribution: { grade: string; count: number }[];
  languageDistribution: { language: string; count: number }[];
  recentRegistrations: { id: number; name: string; school: string; grade: string; created_at: string; status: string }[];
}

const COLORS = ['#00E5FF', '#F59E0B', '#10B981', '#8B5CF6', '#EF4444', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <p className="font-medium">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} style={{ color: entry.color }}>{entry.name}: {entry.value}</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(r => r.json())
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>加载失败</div>;
  }

  const statsCards = [
    { label: '总报名数', value: data.totalRegistrations, color: 'var(--accent)', bg: 'var(--accent-dim)' },
    { label: '今日新增', value: data.todayRegistrations, color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' },
    { label: '本周新增', value: data.weekRegistrations, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' },
    { label: '待审核', value: data.pendingCount, color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold mb-1">数据概览</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>ICPC Camp 报名数据实时统计</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsCards.map((card, i) => (
          <div key={i} className="card p-5 animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>{card.label}</p>
            <div className="flex items-end gap-3">
              <span className="font-display text-3xl font-bold" style={{ color: card.color }}>
                {card.value}
              </span>
              <div className="w-2 h-2 rounded-full mb-2" style={{ background: card.color, boxShadow: `0 0 8px ${card.color}` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Registration trend */}
        <div className="card p-5">
          <h3 className="font-display text-sm font-semibold mb-4">报名趋势（近 30 天）</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.dailyTrend}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00E5FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" stroke="#00E5FF" fill="url(#areaGrad)"
                strokeWidth={2} name="报名数" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* School distribution */}
        <div className="card p-5">
          <h3 className="font-display text-sm font-semibold mb-4">学校分布 TOP 10</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.schoolDistribution.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} allowDecimals={false} />
              <YAxis dataKey="school" type="category" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#00E5FF" radius={[0, 4, 4, 0]} name="人数" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Grade distribution */}
        <div className="card p-5">
          <h3 className="font-display text-sm font-semibold mb-4">年级分布</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data.gradeDistribution} dataKey="count" nameKey="grade"
                cx="50%" cy="50%" outerRadius={70} innerRadius={40}
                paddingAngle={3} label={({ grade, percent }: any) => `${grade} ${(percent * 100).toFixed(0)}%`}
                labelLine={{ stroke: 'var(--text-muted)', strokeWidth: 1 }}>
                {data.gradeDistribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Language distribution */}
        <div className="card p-5">
          <h3 className="font-display text-sm font-semibold mb-4">编程语言分布</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data.languageDistribution} dataKey="count" nameKey="language"
                cx="50%" cy="50%" outerRadius={70} innerRadius={40}
                paddingAngle={3} label={({ language, percent }: any) => `${language} ${(percent * 100).toFixed(0)}%`}
                labelLine={{ stroke: 'var(--text-muted)', strokeWidth: 1 }}>
                {data.languageDistribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Quick stats */}
        <div className="card p-5">
          <h3 className="font-display text-sm font-semibold mb-4">快速统计</h3>
          <div className="space-y-3">
            {data.schoolDistribution.slice(0, 6).map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                  <span className="text-xs truncate max-w-[120px]" style={{ color: 'var(--text-secondary)' }}>
                    {item.school}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 rounded-full" style={{
                    background: COLORS[i],
                    width: `${Math.min(Math.max((item.count / (data.schoolDistribution[0]?.count || 1)) * 80, 8), 80)}px`,
                  }} />
                  <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                    {item.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent registrations */}
      <div className="card p-5">
        <h3 className="font-display text-sm font-semibold mb-4">最近报名</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>姓名</th>
              <th>学校</th>
              <th>年级</th>
              <th>状态</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            {data.recentRegistrations.map((reg) => (
              <tr key={reg.id}>
                <td className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>#{reg.id}</td>
                <td className="font-medium">{reg.name}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{reg.school || '-'}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{reg.grade || '-'}</td>
                <td>
                  <span className={`badge ${reg.status === 'pending' ? 'badge-warning' : 'badge-success'}`}>
                    {reg.status === 'pending' ? '待审核' : '已通过'}
                  </span>
                </td>
                <td className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                  {new Date(reg.created_at).toLocaleDateString('zh-CN')}
                </td>
              </tr>
            ))}
            {data.recentRegistrations.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                  暂无报名数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
