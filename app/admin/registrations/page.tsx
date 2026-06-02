'use client';

import { useState, useEffect, useCallback } from 'react';

interface Registration {
  id: number;
  name: string;
  student_id: string;
  phone: string;
  email: string;
  school: string;
  grade: string;
  gender: string;
  luogu_account: string;
  github_account: string;
  programming_language: string;
  oierdb_id: string | null;
  oierdb_data: string | null;
  competition_history: string | null;
  notes: string;
  status: string;
  created_at: string;
  updated_at: string;
  responses?: { question_id: number; response: string }[];
}

export default function RegistrationsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [editingReg, setEditingReg] = useState<Registration | null>(null);
  const [editForm, setEditForm] = useState<Partial<Registration>>({});
  const pageSize = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: (page * pageSize).toString(),
      });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/registrations?${params}`);
      const data = await res.json();
      setRegistrations(data.data || []);
      setTotal(data.total || 0);
    } catch { /* ignore */ }
    setLoading(false);
  }, [search, statusFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除此报名记录吗？此操作不可撤销。')) return;
    try {
      await fetch(`/api/registrations/${id}`, { method: 'DELETE' });
      fetchData();
      if (selectedReg?.id === id) setSelectedReg(null);
    } catch { /* ignore */ }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await fetch(`/api/registrations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchData();
    } catch { /* ignore */ }
  };

  const handleSaveEdit = async () => {
    if (!editingReg) return;
    try {
      await fetch(`/api/registrations/${editingReg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      setEditingReg(null);
      setEditForm({});
      fetchData();
    } catch { /* ignore */ }
  };

  const exportCSV = () => {
    const headers = ['ID', '姓名', '学号', '手机号', '邮箱', '学校', '年级', '性别', 'Luogu', 'GitHub', '编程语言', '状态', '备注', '创建时间'];
    const rows = registrations.map(r =>
      [r.id, r.name, r.student_id, r.phone, r.email, r.school, r.grade, r.gender, r.luogu_account, r.github_account, r.programming_language, r.status, r.notes, r.created_at].map(v => `"${(v || '').toString().replace(/"/g, '""')}"`)
    );
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registrations_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold mb-1">报名管理</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>共 {total} 条报名记录</p>
        </div>
        <button className="btn-secondary text-sm" onClick={exportCSV}>
          ↓ 导出 CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <input type="text" className="input-field max-w-xs" placeholder="搜索姓名、学号、学校..."
          value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
        <select className="input-field max-w-[140px]"
          value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}>
          <option value="">全部状态</option>
          <option value="pending">待审核</option>
          <option value="approved">已通过</option>
          <option value="rejected">已拒绝</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-16">ID</th>
                <th>姓名</th>
                <th>学号</th>
                <th>手机号</th>
                <th>学校</th>
                <th>年级</th>
                <th>编程语言</th>
                <th>状态</th>
                <th className="w-40">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-10"><div className="spinner mx-auto" /></td></tr>
              ) : registrations.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10" style={{ color: 'var(--text-muted)' }}>暂无数据</td></tr>
              ) : (
                registrations.map(reg => (
                  <tr key={reg.id}>
                    <td className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>#{reg.id}</td>
                    <td className="font-medium">{reg.name}</td>
                    <td className="font-mono text-sm">{reg.student_id}</td>
                    <td className="font-mono text-sm">{reg.phone}</td>
                    <td className="text-sm" style={{ color: 'var(--text-secondary)' }}>{reg.school || '-'}</td>
                    <td className="text-sm" style={{ color: 'var(--text-secondary)' }}>{reg.grade || '-'}</td>
                    <td className="text-sm" style={{ color: 'var(--text-secondary)' }}>{reg.programming_language || '-'}</td>
                    <td>
                      <span className={`badge ${reg.status === 'pending' ? 'badge-warning' : reg.status === 'approved' ? 'badge-success' : 'badge-error'}`}>
                        {reg.status === 'pending' ? '待审核' : reg.status === 'approved' ? '已通过' : '已拒绝'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-1.5">
                        <button className="text-xs px-2 py-1 rounded hover:bg-[var(--accent-dim)] transition-colors"
                          style={{ color: 'var(--accent)' }} onClick={() => setSelectedReg(reg)}>
                          详情
                        </button>
                        <button className="text-xs px-2 py-1 rounded hover:bg-[var(--accent-dim)] transition-colors"
                          style={{ color: 'var(--accent)' }} onClick={() => { setEditingReg(reg); setEditForm(reg); }}>
                          编辑
                        </button>
                        <button className="text-xs px-2 py-1 rounded transition-colors"
                          style={{ color: 'var(--error)' }}
                          onClick={() => handleDelete(reg.id)}
                          onMouseEnter={e => (e.target as HTMLElement).style.background = 'rgba(239,68,68,0.1)'}
                          onMouseLeave={e => (e.target as HTMLElement).style.background = ''}>
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button className="btn-secondary text-xs px-3 py-1.5" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            ← 上一页
          </button>
          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            {page + 1} / {totalPages}
          </span>
          <button className="btn-secondary text-xs px-3 py-1.5" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
            下一页 →
          </button>
        </div>
      )}

      {/* Detail modal */}
      {selectedReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setSelectedReg(null)}>
          <div className="card-glow max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 animate-slide-up"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg font-bold">
                报名详情 <span className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>#{selectedReg.id}</span>
              </h3>
              <button onClick={() => setSelectedReg(null)} className="p-1 rounded hover:bg-[var(--bg-elevated)]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  ['姓名', selectedReg.name],
                  ['学号', selectedReg.student_id],
                  ['手机号', selectedReg.phone],
                  ['邮箱', selectedReg.email || '未填写'],
                  ['学校', selectedReg.school || '未填写'],
                  ['年级', selectedReg.grade || '未填写'],
                  ['性别', selectedReg.gender || '未填写'],
                  ['Luogu', selectedReg.luogu_account || '未填写'],
                  ['GitHub', selectedReg.github_account || '未填写'],
                  ['编程语言', selectedReg.programming_language || '未填写'],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
                    <p className="text-sm font-medium mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              {selectedReg.competition_history && (
                <div className="rounded-lg p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-accent)' }}>
                  <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--accent)' }}>OIerDB 竞赛记录</h4>
                  <div className="space-y-1.5">
                    {JSON.parse(selectedReg.competition_history).map((award: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="award-tag">{award.ctype}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{award.award_type}</span>
                        <span style={{ color: 'var(--text-muted)' }}>· {award.school}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedReg.notes && (
                <div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>备注</span>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{selectedReg.notes}</p>
                </div>
              )}

              <div className="flex items-center gap-3 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>审核操作：</span>
                <button className="btn-secondary text-xs px-3 py-1.5"
                  onClick={() => { handleStatusChange(selectedReg.id, 'approved'); setSelectedReg(null); }}>
                  ✓ 通过
                </button>
                <button className="btn-danger text-xs px-3 py-1.5"
                  onClick={() => { handleStatusChange(selectedReg.id, 'rejected'); setSelectedReg(null); }}>
                  ✗ 拒绝
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => { setEditingReg(null); setEditForm({}); }}>
          <div className="card-glow max-w-lg w-full max-h-[80vh] overflow-y-auto p-6 animate-slide-up"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg font-bold">编辑报名 #{editingReg.id}</h3>
              <button onClick={() => { setEditingReg(null); setEditForm({}); }} className="p-1 rounded hover:bg-[var(--bg-elevated)]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {[
                { key: 'name', label: '姓名' },
                { key: 'student_id', label: '学号' },
                { key: 'phone', label: '手机号' },
                { key: 'email', label: '邮箱' },
                { key: 'school', label: '学校' },
                { key: 'grade', label: '年级' },
                { key: 'luogu_account', label: 'Luogu' },
                { key: 'github_account', label: 'GitHub' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>
                  <input type="text" className="input-field text-sm"
                    value={(editForm as any)[key] || ''} onChange={e => setEditForm(prev => ({ ...prev, [key]: e.target.value }))} />
                </div>
              ))}

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>状态</label>
                <select className="input-field text-sm" value={editForm.status || ''} onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}>
                  <option value="pending">待审核</option>
                  <option value="approved">已通过</option>
                  <option value="rejected">已拒绝</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
              <button className="btn-secondary text-sm" onClick={() => { setEditingReg(null); setEditForm({}); }}>取消</button>
              <button className="btn-primary text-sm" onClick={handleSaveEdit}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
