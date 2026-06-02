'use client';

import { useState, useEffect, useCallback } from 'react';

interface Webhook {
  id: number;
  name: string;
  url: string;
  secret: string;
  events: string;
  frequency: string;
  is_active: number;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

const EVENT_OPTIONS = [
  { value: 'registration.new', label: '新报名' },
  { value: 'registration.updated', label: '报名更新' },
  { value: 'registration.deleted', label: '报名删除' },
];

const FREQUENCY_OPTIONS = [
  { value: 'realtime', label: '实时推送', desc: '每次事件立即推送' },
  { value: 'hourly', label: '每小时汇总', desc: '每小时批量推送一次' },
  { value: 'daily', label: '每日汇总', desc: '每天批量推送一次' },
];

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [testing, setTesting] = useState<number | null>(null);
  const [flushing, setFlushing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formSecret, setFormSecret] = useState('');
  const [formEvents, setFormEvents] = useState<string[]>(['registration.new']);
  const [formFrequency, setFormFrequency] = useState('realtime');
  const [formActive, setFormActive] = useState(true);
  const [formSaving, setFormSaving] = useState(false);

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch('/api/webhooks');
      const data = await res.json();
      setWebhooks(data.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchWebhooks(); }, [fetchWebhooks]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const resetForm = () => {
    setFormName('');
    setFormUrl('');
    setFormSecret('');
    setFormEvents(['registration.new']);
    setFormFrequency('realtime');
    setFormActive(true);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formUrl.trim()) {
      showToast('名称和 URL 为必填项', 'error');
      return;
    }
    setFormSaving(true);

    try {
      const payload = {
        name: formName.trim(),
        url: formUrl.trim(),
        secret: formSecret.trim(),
        events: formEvents,
        frequency: formFrequency,
        is_active: formActive,
      };

      if (editingId) {
        const res = await fetch(`/api/webhooks/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          showToast('Webhook 已更新');
        } else {
          showToast(data.error || '更新失败', 'error');
        }
      } else {
        const res = await fetch('/api/webhooks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          showToast('Webhook 已创建');
        } else {
          showToast(data.error || '创建失败', 'error');
        }
      }

      resetForm();
      fetchWebhooks();
    } catch {
      showToast('保存失败', 'error');
    }
    setFormSaving(false);
  };

  const handleEdit = (w: Webhook) => {
    setEditingId(w.id);
    setFormName(w.name);
    setFormUrl(w.url);
    setFormSecret(w.secret);
    setFormEvents(JSON.parse(w.events || '[]'));
    setFormFrequency(w.frequency);
    setFormActive(w.is_active === 1);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此 Webhook？')) return;
    await fetch(`/api/webhooks/${id}`, { method: 'DELETE' });
    fetchWebhooks();
    showToast('已删除');
  };

  const handleTest = async (id: number) => {
    setTesting(id);
    try {
      const res = await fetch(`/api/webhooks/test/${id}`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        showToast('测试推送成功！');
      } else {
        showToast(`测试失败: ${data.error || '未知错误'}`, 'error');
      }
    } catch {
      showToast('测试请求失败', 'error');
    }
    setTesting(null);
  };

  const handleFlush = async () => {
    setFlushing(true);
    try {
      const res = await fetch('/api/webhooks/flush', { method: 'POST' });
      const data = await res.json();
      showToast(`已发送 ${data.sent} 个，失败 ${data.failed} 个`);
      fetchWebhooks();
    } catch {
      showToast('推送失败', 'error');
    }
    setFlushing(false);
  };

  const toggleEvent = (event: string) => {
    setFormEvents(prev =>
      prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]
    );
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold mb-1">Webhook 管理</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            配置 Webhook 以在事件触发时推送数据到指定 URL
          </p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary text-sm" onClick={handleFlush} disabled={flushing}>
            {flushing ? '推送中...' : '⚡ 手动推送队列'}
          </button>
          <button className="btn-primary text-sm" onClick={() => { resetForm(); setShowForm(true); }}>
            + 添加 Webhook
          </button>
        </div>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="card-glow p-6 mb-6 animate-slide-up">
          <h3 className="font-display text-sm font-semibold mb-4">
            {editingId ? '编辑 Webhook' : '新建 Webhook'}
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>名称</label>
                <input type="text" className="input-field" placeholder="如：飞书通知"
                  value={formName} onChange={e => setFormName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>URL</label>
                <input type="url" className="input-field font-mono text-sm" placeholder="https://..."
                  value={formUrl} onChange={e => setFormUrl(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>签名密钥（可选）</label>
              <input type="text" className="input-field font-mono text-sm" placeholder="用于 HMAC-SHA256 签名验证"
                value={formSecret} onChange={e => setFormSecret(e.target.value)} />
            </div>

            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>触发事件</label>
              <div className="flex flex-wrap gap-2">
                {EVENT_OPTIONS.map(ev => (
                  <button key={ev.value} type="button"
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${formEvents.includes(ev.value)
                      ? 'border-[var(--accent)] bg-[var(--accent-dim)]'
                      : 'border-[var(--border)] hover:border-[var(--text-muted)]'
                    }`}
                    onClick={() => toggleEvent(ev.value)}>
                    {ev.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>推送频率</label>
              <div className="grid grid-cols-3 gap-3">
                {FREQUENCY_OPTIONS.map(f => (
                  <button key={f.value} type="button"
                    className={`p-3 rounded-lg border text-left transition-all ${formFrequency === f.value
                      ? 'border-[var(--accent)] bg-[var(--accent-dim)]'
                      : 'border-[var(--border)] hover:border-[var(--text-muted)]'
                    }`}
                    onClick={() => setFormFrequency(f.value)}>
                    <p className="text-xs font-medium">{f.label}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formActive} onChange={e => setFormActive(e.target.checked)}
                className="w-4 h-4 rounded" />
              <span className="text-sm">启用</span>
            </label>
          </div>

          <div className="flex justify-between items-center mt-5 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
              推送格式: POST JSON · Header: X-Webhook-Signature, X-Webhook-Event
            </div>
            <div className="flex gap-3">
              <button className="btn-secondary text-sm" onClick={resetForm}>取消</button>
              <button className="btn-primary text-sm" onClick={handleSave} disabled={formSaving}>
                {formSaving ? '保存中...' : editingId ? '更新' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Webhook list */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="spinner" /></div>
      ) : webhooks.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'var(--accent-dim)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>暂无 Webhook，点击上方按钮添加</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh, idx) => {
            const events: string[] = JSON.parse(wh.events || '[]');
            const freqLabel = FREQUENCY_OPTIONS.find(f => f.value === wh.frequency)?.label || wh.frequency;

            return (
              <div key={wh.id} className="card p-5 animate-slide-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-sm">{wh.name}</h4>
                      <span className={`badge ${wh.is_active ? 'badge-success' : 'badge-error'}`}>
                        {wh.is_active ? '已启用' : '已禁用'}
                      </span>
                      <span className="badge badge-info">{freqLabel}</span>
                    </div>
                    <p className="font-mono text-xs mb-2 truncate max-w-lg" style={{ color: 'var(--text-muted)' }}>
                      {wh.url}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {events.map(ev => {
                        const eventLabel = EVENT_OPTIONS.find(e => e.value === ev)?.label || ev;
                        return (
                          <span key={ev} className="award-tag">{eventLabel}</span>
                        );
                      })}
                    </div>
                    {wh.last_triggered_at && (
                      <p className="text-[10px] mt-2 font-mono" style={{ color: 'var(--text-muted)' }}>
                        最后触发: {new Date(wh.last_triggered_at).toLocaleString('zh-CN')}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button className="btn-secondary text-xs px-3 py-1.5"
                      onClick={() => handleTest(wh.id)} disabled={testing === wh.id}>
                      {testing === wh.id ? (
                        <span className="flex items-center gap-1"><div className="spinner" style={{ width: 12, height: 12 }} /> 测试中</span>
                      ) : '⚡ 测试'}
                    </button>
                    <button className="text-xs px-2 py-1.5 rounded hover:bg-[var(--accent-dim)] transition-colors"
                      style={{ color: 'var(--accent)' }} onClick={() => handleEdit(wh)}>
                      编辑
                    </button>
                    <button className="text-xs px-2 py-1.5 rounded transition-colors"
                      style={{ color: 'var(--error)' }} onClick={() => handleDelete(wh.id)}>
                      删除
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Webhook payload example */}
      <div className="mt-8">
        <h3 className="font-display text-sm font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
          推送数据格式示例
        </h3>
        <div className="card p-5 font-mono text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <pre>{JSON.stringify({
            event: 'registration.new',
            timestamp: '2024-01-15T10:30:00.000Z',
            data: {
              id: 1,
              name: '张三',
              student_id: '2024010001',
              phone: '138****1234',
              school: '计算机科学与技术学院',
              grade: '大二',
              programming_language: 'C++',
              competition_history: [
                { identity: 'NOIP2023提高', award_type: '一等奖', school: '某中学', province: '北京' }
              ],
            }
          }, null, 2)}</pre>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast" style={{
          borderColor: toast.type === 'error' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)',
        }}>
          <div className="flex items-center gap-3">
            <span className="text-sm">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
