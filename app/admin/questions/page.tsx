'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

const CodeBlock = dynamic(() => import('../../components/CodeBlock'), { ssr: false });

// ==================== Types ====================
interface Question {
  id: number;
  label: string;
  type: string;
  options: string | null;
  required: number;
  sort_order: number;
  description: string;
  shuffle_options: number;
  created_at: string;
  updated_at: string;
}

interface FormStep {
  id: number;
  step_key: string;
  title: string;
  description: string;
  prompt: string;
  sort_order: number;
  visible: number;
  is_system: number;
  updated_at: string;
}

interface FormField {
  id: number;
  step_key: string;
  field_key: string;
  label: string;
  input_type: string;
  placeholder: string;
  required: number;
  visible: number;
  sort_order: number;
  options: string | null;
  description: string;
  updated_at: string;
}

type TabKey = 'questions' | 'steps' | 'fields';

const INPUT_TYPES = [
  { value: 'text', label: '单行文本' },
  { value: 'email', label: '邮箱' },
  { value: 'tel', label: '电话' },
  { value: 'textarea', label: '多行文本' },
  { value: 'select', label: '下拉选择' },
  { value: 'radio', label: '单选按钮' },
];

const QUESTION_TYPES = [
  { value: 'text', label: '单行文本', icon: 'T' },
  { value: 'textarea', label: '多行文本', icon: '¶' },
  { value: 'number', label: '数字', icon: '#' },
  { value: 'select', label: '单选', icon: '◉' },
  { value: 'code_select', label: '代码单选', icon: '{ }' },
  { value: 'multiselect', label: '多选', icon: '☑' },
  { value: 'checkbox', label: '勾选框', icon: '☒' },
];

const STEP_LABELS: Record<string, string> = {
  basic: '基本信息',
  oierdb: 'OIerDB 验证',
  accounts: '竞赛账号',
  questions: '补充信息',
  review: '确认提交',
};

// ==================== Main Component ====================
export default function QuestionsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('steps');

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold mb-1">表单配置</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>配置注册表单的步骤、字段和补充题目</p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
        {([
          { key: 'steps' as TabKey, label: '步骤配置' },
          { key: 'fields' as TabKey, label: '字段配置' },
          { key: 'questions' as TabKey, label: '补充题目' },
        ]).map(tab => (
          <button key={tab.key}
            className={`flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'text-[#0A0E17]'
                : ''
            }`}
            style={activeTab === tab.key ? { background: 'linear-gradient(135deg, #00B8CC, #00E5FF)' } : { color: 'var(--text-secondary)' }}
            onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'steps' && <StepsConfig />}
      {activeTab === 'fields' && <FieldsConfig />}
      {activeTab === 'questions' && <QuestionsConfig />}
    </div>
  );
}

// ==================== Steps Config Tab ====================
function StepsConfig() {
  const [steps, setSteps] = useState<FormStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<FormStep>>({});

  const fetchSteps = useCallback(async () => {
    try {
      const res = await fetch('/api/form-steps');
      const data = await res.json();
      setSteps(data.data || []);
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSteps(); }, [fetchSteps]);

  const handleSave = async () => {
    if (!editingId) return;
    await fetch(`/api/form-steps/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    setEditingId(null);
    setEditForm({});
    fetchSteps();
  };

  const toggleVisible = async (step: FormStep) => {
    await fetch(`/api/form-steps/${step.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible: step.visible ? 0 : 1 }),
    });
    fetchSteps();
  };

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div className="space-y-3">
      {steps.map((step, idx) => (
        <div key={step.id} className="card p-5">
          {editingId === step.id ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>步骤标题</label>
                <input type="text" className="input-field"
                  value={editForm.title || ''} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>步骤描述/提示文字</label>
                <textarea className="input-field min-h-[80px] resize-y"
                  value={editForm.description || ''} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>额外提示（prompt）</label>
                <input type="text" className="input-field"
                  value={editForm.prompt || ''} onChange={e => setEditForm(p => ({ ...p, prompt: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-3">
                <button className="btn-secondary text-sm" onClick={() => { setEditingId(null); setEditForm({}); }}>取消</button>
                <button className="btn-primary text-sm" onClick={handleSave}>保存</button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                    #{idx + 1}
                  </span>
                  <span className="font-mono text-xs px-2 py-1 rounded" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                    {step.step_key}
                  </span>
                  <span className={`badge ${step.visible ? 'badge-success' : 'badge-error'}`}>
                    {step.visible ? '显示' : '隐藏'}
                  </span>
                  {step.is_system ? <span className="badge badge-info">系统</span> : null}
                </div>
                <h4 className="font-medium text-sm mb-1">{step.title}</h4>
                {step.description && (
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{step.description}</p>
                )}
                {step.prompt && (
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Prompt: {step.prompt}</p>
                )}
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button className="text-xs px-2 py-1.5 rounded transition-colors"
                  style={{ color: step.visible ? 'var(--text-muted)' : 'var(--success)' }}
                  onClick={() => toggleVisible(step)}>
                  {step.visible ? '隐藏' : '显示'}
                </button>
                <button className="text-xs px-2 py-1.5 rounded hover:bg-[var(--accent-dim)] transition-colors"
                  style={{ color: 'var(--accent)' }}
                  onClick={() => { setEditingId(step.id); setEditForm(step); }}>
                  编辑
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ==================== Fields Config Tab ====================
function FieldsConfig() {
  const [fields, setFields] = useState<FormField[]>([]);
  const [steps, setSteps] = useState<FormStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<FormField>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ step_key: 'basic', field_key: '', label: '', input_type: 'text', placeholder: '', required: false, visible: true, options: '', description: '' });
  const [filterStep, setFilterStep] = useState<string>('all');

  const fetchData = useCallback(async () => {
    try {
      const [fRes, sRes] = await Promise.all([fetch('/api/form-fields'), fetch('/api/form-steps')]);
      setFields((await fRes.json()).data || []);
      setSteps((await sRes.json()).data || []);
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const payload = { ...editForm };
    if (payload.options && typeof payload.options === 'string' && payload.options.trim()) {
      (payload as any).options = payload.options.split('\n').map((o: string) => o.trim()).filter(Boolean);
    } else if (payload.options === '') {
      (payload as any).options = null;
    }
    await fetch(`/api/form-fields/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setEditingId(null);
    setEditForm({});
    fetchData();
  };

  const handleAdd = async () => {
    if (!addForm.field_key || !addForm.label) return;
    const payload: any = { ...addForm, required: addForm.required ? 1 : 0, visible: addForm.visible ? 1 : 0, sort_order: fields.filter(f => f.step_key === addForm.step_key).length };
    if (addForm.options.trim()) {
      payload.options = addForm.options.split('\n').map(o => o.trim()).filter(Boolean);
    } else {
      payload.options = null;
    }
    await fetch('/api/form-fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setShowAddForm(false);
    setAddForm({ step_key: 'basic', field_key: '', label: '', input_type: 'text', placeholder: '', required: false, visible: true, options: '', description: '' });
    fetchData();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此字段？')) return;
    await fetch(`/api/form-fields/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const handleMove = async (field: FormField, direction: 'up' | 'down') => {
    const sameStepFields = fields.filter(f => f.step_key === field.step_key).sort((a, b) => a.sort_order - b.sort_order);
    const idx = sameStepFields.findIndex(f => f.id === field.id);
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === sameStepFields.length - 1)) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const newOrder = [...sameStepFields];
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    for (let i = 0; i < newOrder.length; i++) {
      if (newOrder[i].sort_order !== i) {
        fetch(`/api/form-fields/${newOrder[i].id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: i }),
        });
      }
    }
    fetchData();
  };

  const filteredFields = filterStep === 'all' ? fields : fields.filter(f => f.step_key === filterStep);
  const stepGroups = steps.map(s => s.step_key);

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div>
      {/* Filter + Add */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <button className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${filterStep === 'all' ? 'border-[var(--accent)] bg-[var(--accent-dim)]' : 'border-[var(--border)]'}`}
            onClick={() => setFilterStep('all')}>
            全部
          </button>
          {stepGroups.map(sk => (
            <button key={sk} className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${filterStep === sk ? 'border-[var(--accent)] bg-[var(--accent-dim)]' : 'border-[var(--border)]'}`}
              onClick={() => setFilterStep(sk)}>
              {STEP_LABELS[sk] || sk}
            </button>
          ))}
        </div>
        <button className="btn-primary text-sm" onClick={() => setShowAddForm(true)}>+ 添加字段</button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="card-glow p-5 mb-4 animate-slide-up">
          <h3 className="text-sm font-semibold mb-3">新建字段</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>所属步骤</label>
              <select className="input-field text-sm" value={addForm.step_key} onChange={e => setAddForm(p => ({ ...p, step_key: e.target.value }))}>
                {stepGroups.map(sk => <option key={sk} value={sk}>{STEP_LABELS[sk] || sk}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>字段键（英文）</label>
              <input type="text" className="input-field text-sm font-mono" placeholder="如: nickname"
                value={addForm.field_key} onChange={e => setAddForm(p => ({ ...p, field_key: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>标签</label>
              <input type="text" className="input-field text-sm" placeholder="如: 昵称"
                value={addForm.label} onChange={e => setAddForm(p => ({ ...p, label: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>输入类型</label>
              <select className="input-field text-sm" value={addForm.input_type} onChange={e => setAddForm(p => ({ ...p, input_type: e.target.value }))}>
                {INPUT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>占位提示</label>
              <input type="text" className="input-field text-sm" placeholder="如: 请输入昵称"
                value={addForm.placeholder} onChange={e => setAddForm(p => ({ ...p, placeholder: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>描述说明</label>
              <input type="text" className="input-field text-sm" placeholder="可选"
                value={addForm.description} onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            {(addForm.input_type === 'select' || addForm.input_type === 'radio') && (
              <div className="col-span-2">
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>选项（每行一个）</label>
                <textarea className="input-field text-sm font-mono min-h-[60px]" placeholder={'选项A\n选项B'}
                  value={addForm.options} onChange={e => setAddForm(p => ({ ...p, options: e.target.value }))} />
              </div>
            )}
            <div className="col-span-2 flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={addForm.required} onChange={e => setAddForm(p => ({ ...p, required: e.target.checked }))} className="w-4 h-4 rounded" />
                必填
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={addForm.visible} onChange={e => setAddForm(p => ({ ...p, visible: e.target.checked }))} className="w-4 h-4 rounded" />
                显示
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            <button className="btn-secondary text-sm" onClick={() => setShowAddForm(false)}>取消</button>
            <button className="btn-primary text-sm" onClick={handleAdd} disabled={!addForm.field_key || !addForm.label}>添加</button>
          </div>
        </div>
      )}

      {/* Field list grouped by step */}
      {filterStep === 'all' ? stepGroups.map(sk => {
        const stepFields = filteredFields.filter(f => f.step_key === sk);
        if (stepFields.length === 0) return null;
        return (
          <div key={sk} className="mb-6">
            <h3 className="font-display text-sm font-semibold mb-3" style={{ color: 'var(--accent)' }}>
              {STEP_LABELS[sk] || sk}
            </h3>
            <FieldList fields={stepFields} editingId={editingId} editForm={editForm} setEditForm={setEditForm} setEditingId={setEditingId}
              onSave={handleSaveEdit} onDelete={handleDelete} onMove={handleMove} />
          </div>
        );
      }) : (
        <FieldList fields={filteredFields} editingId={editingId} editForm={editForm} setEditForm={setEditForm} setEditingId={setEditingId}
          onSave={handleSaveEdit} onDelete={handleDelete} onMove={handleMove} />
      )}
    </div>
  );
}

// ==================== Field List Sub-component ====================
function FieldList({ fields, editingId, editForm, setEditForm, setEditingId, onSave, onDelete, onMove }: {
  fields: FormField[];
  editingId: number | null;
  editForm: Partial<FormField>;
  setEditForm: (f: Partial<FormField> | ((prev: Partial<FormField>) => Partial<FormField>)) => void;
  setEditingId: (id: number | null) => void;
  onSave: () => void;
  onDelete: (id: number) => void;
  onMove: (field: FormField, dir: 'up' | 'down') => void;
}) {
  return (
    <div className="space-y-2">
      {fields.map((field, idx) => (
        <div key={field.id} className="card p-4">
          {editingId === field.id ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>标签</label>
                  <input type="text" className="input-field text-sm" value={editForm.label || ''} onChange={e => setEditForm(p => ({ ...p, label: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>输入类型</label>
                  <select className="input-field text-sm" value={editForm.input_type || 'text'} onChange={e => setEditForm(p => ({ ...p, input_type: e.target.value }))}>
                    {INPUT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>占位提示</label>
                  <input type="text" className="input-field text-sm" value={editForm.placeholder || ''} onChange={e => setEditForm(p => ({ ...p, placeholder: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>描述</label>
                  <input type="text" className="input-field text-sm" value={editForm.description || ''} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} />
                </div>
                {(editForm.input_type === 'select' || editForm.input_type === 'radio') && (
                  <div className="col-span-2">
                    <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>选项（每行一个）</label>
                    <textarea className="input-field text-sm font-mono min-h-[60px]"
                      value={(() => {
                        if (!editForm.options) return '';
                        try {
                          const parsed = JSON.parse(editForm.options);
                          // Handle double-encoded options
                          if (Array.isArray(parsed) && parsed.length === 1 && typeof parsed[0] === 'string' && parsed[0].startsWith('[')) {
                            try { const inner = JSON.parse(parsed[0]); if (Array.isArray(inner)) return inner.join('\n'); } catch {}
                          }
                          return Array.isArray(parsed) ? parsed.join('\n') : editForm.options;
                        } catch { return editForm.options; }
                      })()}
                      onChange={e => setEditForm(p => ({ ...p, options: e.target.value }))} />
                  </div>
                )}
                <div className="col-span-2 flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" checked={editForm.required === 1} onChange={e => setEditForm(p => ({ ...p, required: e.target.checked ? 1 : 0 }))} className="w-4 h-4 rounded" />
                    必填
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" checked={editForm.visible === 1} onChange={e => setEditForm(p => ({ ...p, visible: e.target.checked ? 1 : 0 }))} className="w-4 h-4 rounded" />
                    显示
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button className="btn-secondary text-sm" onClick={() => { setEditingId(null); setEditForm({}); }}>取消</button>
                <button className="btn-primary text-sm" onClick={onSave}>保存</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="font-mono text-xs px-1.5 py-0.5 rounded shrink-0" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                  {field.field_key}
                </span>
                <span className="text-sm font-medium truncate">{field.label}</span>
                <span className="font-mono text-xs px-1.5 py-0.5 rounded shrink-0" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                  {INPUT_TYPES.find(t => t.value === field.input_type)?.label || field.input_type}
                </span>
                {field.required ? <span className="badge badge-warning">必填</span> : null}
                {!field.visible ? <span className="badge badge-error">隐藏</span> : null}
                {field.placeholder ? <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>"{field.placeholder}"</span> : null}
              </div>
              <div className="flex items-center gap-1 ml-4 shrink-0">
                <button className="p-1.5 rounded hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => onMove(field, 'up')} disabled={idx === 0} title="上移">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
                </button>
                <button className="p-1.5 rounded hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => onMove(field, 'down')} disabled={idx === fields.length - 1} title="下移">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </button>
                <button className="p-1.5 rounded hover:bg-[var(--accent-dim)] transition-colors" onClick={() => { setEditingId(field.id); setEditForm(field); }} title="编辑">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                </button>
                <button className="p-1.5 rounded hover:bg-[rgba(239,68,68,0.1)] transition-colors" onClick={() => onDelete(field.id)} title="删除">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ==================== Questions Config Tab (original) ====================
function QuestionsConfig() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formLabel, setFormLabel] = useState('');
  const [formType, setFormType] = useState('text');
  const [formDescription, setFormDescription] = useState('');
  const [formRequired, setFormRequired] = useState(true);
  const [formOptions, setFormOptions] = useState('');
  const [formShuffleOptions, setFormShuffleOptions] = useState(false);
  const [formSaving, setFormSaving] = useState(false);

  const fetchQuestions = useCallback(async () => {
    try {
      const res = await fetch('/api/questions');
      setQuestions((await res.json()).data || []);
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const resetForm = () => { setFormLabel(''); setFormType('text'); setFormDescription(''); setFormRequired(true); setFormOptions(''); setFormShuffleOptions(false); setEditingId(null); setShowAddForm(false); };

  const handleSave = async () => {
    if (!formLabel.trim()) return;
    setFormSaving(true);
    const payload: any = { label: formLabel.trim(), type: formType, description: formDescription.trim(), required: formRequired, shuffle_options: formShuffleOptions ? 1 : 0,
      options: (formType === 'select' || formType === 'multiselect' || formType === 'code_select') && formOptions.trim() ? formOptions.split('\n').map((o: string) => o.trim()).filter(Boolean) : null };
    try {
      if (editingId) {
        await fetch(`/api/questions/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      } else {
        payload.sort_order = questions.length;
        await fetch('/api/questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      }
      resetForm(); fetchQuestions();
    } catch { /* */ }
    setFormSaving(false);
  };

  const handleEdit = (q: Question) => {
    setEditingId(q.id); setFormLabel(q.label); setFormType(q.type); setFormDescription(q.description || '');
    setFormRequired(q.required === 1); setFormShuffleOptions(q.shuffle_options === 1);
    setFormOptions(q.options ? JSON.parse(q.options).join('\n') : ''); setShowAddForm(true);
  };

  const handleDelete = async (id: number) => { if (!confirm('确定删除此题目？')) return; await fetch(`/api/questions/${id}`, { method: 'DELETE' }); fetchQuestions(); };

  const handleMove = async (id: number, direction: 'up' | 'down') => {
    const idx = questions.findIndex(q => q.id === id);
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === questions.length - 1)) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const newOrder = [...questions]; [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    setQuestions(newOrder);
    for (let i = 0; i < newOrder.length; i++) {
      if (newOrder[i].sort_order !== i) fetch(`/api/questions/${newOrder[i].id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sort_order: i }) });
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="btn-primary text-sm" onClick={() => { resetForm(); setShowAddForm(true); }}>+ 添加题目</button>
      </div>

      {showAddForm && (
        <div className="card-glow p-5 mb-4 animate-slide-up">
          <h3 className="text-sm font-semibold mb-3">{editingId ? '编辑题目' : '新建题目'}</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>题目标题</label>
              <input type="text" className="input-field" placeholder="例如：你希望学习哪些算法专题？" value={formLabel} onChange={e => setFormLabel(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>题目类型</label>
              <div className="flex flex-wrap gap-2">
                {QUESTION_TYPES.map(t => (
                  <button key={t.value} type="button" className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border transition-all ${formType === t.value ? 'border-[var(--accent)] bg-[var(--accent-dim)]' : 'border-[var(--border)]'}`}
                    onClick={() => setFormType(t.value)}>
                    <span className="font-mono font-bold" style={{ color: 'var(--accent)' }}>{t.icon}</span>{t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                {formType === 'code_select' ? '伪代码/代码内容' : '描述说明'}
              </label>
              {formType === 'code_select' ? (
                <textarea className="input-field min-h-[160px] resize-y font-mono text-sm" placeholder="在此输入伪代码/代码..." value={formDescription} onChange={e => setFormDescription(e.target.value)} />
              ) : (
                <input type="text" className="input-field" placeholder="可选" value={formDescription} onChange={e => setFormDescription(e.target.value)} />
              )}
            </div>
            {(formType === 'code_select') && formDescription && (
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>代码预览</label>
                <CodeBlock code={formDescription} language="python" />
              </div>
            )}
            {(formType === 'select' || formType === 'multiselect' || formType === 'code_select') && (
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>选项（每行一个）</label>
                <textarea className="input-field min-h-[80px] font-mono text-sm" placeholder={'选项 A\n选项 B'} value={formOptions} onChange={e => setFormOptions(e.target.value)} />
              </div>
            )}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formRequired} onChange={e => setFormRequired(e.target.checked)} className="w-4 h-4 rounded" /><span className="text-sm">必填</span></label>
              {(formType === 'select' || formType === 'multiselect' || formType === 'code_select') && (
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formShuffleOptions} onChange={e => setFormShuffleOptions(e.target.checked)} className="w-4 h-4 rounded" /><span className="text-sm">随机打乱选项</span></label>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            <button className="btn-secondary text-sm" onClick={resetForm}>取消</button>
            <button className="btn-primary text-sm" onClick={handleSave} disabled={formSaving || !formLabel.trim()}>{formSaving ? '保存中...' : editingId ? '更新' : '添加'}</button>
          </div>
        </div>
      )}

      {loading ? <div className="flex justify-center py-10"><div className="spinner" /></div> : questions.length === 0 ? (
        <div className="card p-10 text-center"><p className="text-sm" style={{ color: 'var(--text-muted)' }}>暂无补充题目</p></div>
      ) : (
        <div className="space-y-2">
          {questions.map((q, idx) => {
            const options: string[] = q.options ? JSON.parse(q.options) : [];
            return (
              <div key={q.id} className="card p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>#{idx + 1}</span>
                      <span className="font-mono text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>{QUESTION_TYPES.find(t => t.value === q.type)?.icon} {QUESTION_TYPES.find(t => t.value === q.type)?.label}</span>
                      {q.required ? <span className="badge badge-warning">必填</span> : <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>选填</span>}
                      {q.shuffle_options ? <span className="badge badge-info">随机选项</span> : null}
                    </div>
                    <h4 className="text-sm font-medium">{q.label}</h4>
                    {q.description && q.type !== 'code_select' && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{q.description}</p>}
                    {q.type === 'code_select' && q.description && (
                      <div className="mt-2"><CodeBlock code={q.description} language="python" className="max-w-2xl" /></div>
                    )}
                    {options.length > 0 && <div className="flex flex-wrap gap-1 mt-1.5">{options.map(o => <span key={o} className="award-tag">{o}</span>)}</div>}
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <button className="p-1.5 rounded hover:bg-[var(--bg-elevated)]" onClick={() => handleMove(q.id, 'up')} disabled={idx === 0}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><polyline points="18 15 12 9 6 15" /></svg></button>
                    <button className="p-1.5 rounded hover:bg-[var(--bg-elevated)]" onClick={() => handleMove(q.id, 'down')} disabled={idx === questions.length - 1}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg></button>
                    <button className="p-1.5 rounded hover:bg-[var(--accent-dim)]" onClick={() => handleEdit(q)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg></button>
                    <button className="p-1.5 rounded hover:bg-[rgba(239,68,68,0.1)]" onClick={() => handleDelete(q.id)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
