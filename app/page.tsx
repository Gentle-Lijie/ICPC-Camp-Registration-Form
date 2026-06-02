'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

const CodeBlock = dynamic(() => import('./components/CodeBlock'), { ssr: false });

// ==================== Types ====================
interface FormStep {
  id: number;
  step_key: string;
  title: string;
  description: string;
  prompt: string;
  sort_order: number;
  visible: number;
  is_system: number;
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
}

interface DynamicQuestion {
  id: number;
  label: string;
  type: string;
  options: string | null;
  required: number;
  description: string;
  shuffle_options: number;
}

interface OIerDBResult {
  id: string;
  name: string;
  pinyin: string;
  level: string;
  awards_parsed: any[];
  sex: string;
  re1: string;
}

const LEVEL_MAP: Record<string, string> = { '0': '未评级', '1': 'CSP入门', '2': 'CSP提高', '3': 'CSP', '4': 'NOIP', '5': 'NOIP提高', '6': '省选', '7': 'NOI', '8': 'NOI+' };
const LEVEL_COLORS: Record<string, string> = { '3': '#94A3B8', '4': '#60A5FA', '5': '#818CF8', '6': '#A78BFA', '7': '#F59E0B', '8': '#EF4444' };

// ==================== Main Component ====================
export default function RegistrationPage() {
  const [steps, setSteps] = useState<FormStep[]>([]);
  const [fields, setFields] = useState<FormField[]>([]);
  const [questions, setQuestions] = useState<DynamicQuestion[]>([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Dynamic form data
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [oierdbResults, setOierdbResults] = useState<OIerDBResult[]>([]);
  const [selectedOier, setSelectedOier] = useState<OIerDBResult | null>(null);
  const [oierdbSearching, setOierdbSearching] = useState(false);
  const [oierdbSearched, setOierdbSearched] = useState(false);
  const [oierdbSkipped, setOierdbSkipped] = useState(false);
  const [questionResponses, setQuestionResponses] = useState<Record<number, string>>({});

  // Load config
  useEffect(() => {
    fetch('/api/form-config')
      .then(r => r.json())
      .then(res => {
        if (res.data) {
          setSteps(res.data.steps || []);
          setFields(res.data.fields || []);
          setQuestions(res.data.questions || []);
        }
      })
      .catch(() => {});
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Build visible step list (skip questions step if empty)
  const visibleSteps = steps.filter(s => {
    if (s.step_key === 'questions' && questions.length === 0) return false;
    return true;
  });

  const currentStep = visibleSteps[currentStepIdx];
  const currentStepKey = currentStep?.step_key;
  const currentFields = fields.filter(f => f.step_key === currentStepKey);

  // Update form field
  const setField = (key: string, value: string) => setFormData(prev => ({ ...prev, [key]: value }));

  // OIerDB search
  const searchOIerDB = useCallback(async () => {
    const name = (formData.name || '').trim();
    if (!name) { showToast('请先填写姓名', 'error'); return; }
    setOierdbSearching(true);
    try {
      const res = await fetch(`/api/oierdb/search?q=${encodeURIComponent(name)}`);
      const data = await res.json();
      setOierdbResults(data.result || []);
      setOierdbSearched(true);
      if (!data.result || data.result.length === 0) showToast('未找到匹配记录，可以跳过', 'error');
    } catch { showToast('网络错误', 'error'); setOierdbSearched(true); }
    setOierdbSearching(false);
  }, [formData.name, showToast]);

  // Navigate
  const canGoNext = (): boolean => {
    if (!currentStep) return false;
    if (currentStepKey === 'basic' || currentStepKey === 'accounts') {
      for (const f of currentFields) {
        if (f.required && !(formData[f.field_key] || '').trim()) {
          showToast(`请填写: ${f.label}`, 'error');
          return false;
        }
      }
      // Phone validation
      const phoneField = currentFields.find(f => f.input_type === 'tel' && f.required);
      if (phoneField && formData[phoneField.field_key]) {
        if (!/^1[3-9]\d{9}$/.test(formData[phoneField.field_key])) {
          showToast(`${phoneField.label}格式不正确`, 'error');
          return false;
        }
      }
    }
    if (currentStepKey === 'oierdb') {
      if (!oierdbSearched) {
        showToast('请先点击搜索', 'error');
        return false;
      }
      if (!selectedOier && !oierdbSkipped) {
        showToast('请选择一条记录或跳过', 'error');
        return false;
      }
    }
    if (currentStepKey === 'questions') {
      for (const q of questions.filter(q => q.required)) {
        if (!(questionResponses[q.id] || '').trim()) {
          showToast(`请填写: ${q.label}`, 'error');
          return false;
        }
      }
    }
    return true;
  };

  const nextStep = () => { if (canGoNext() && currentStepIdx < visibleSteps.length - 1) setCurrentStepIdx(i => i + 1); };
  const prevStep = () => { if (currentStepIdx > 0) setCurrentStepIdx(i => i - 1); };

  // Submit
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const responses = Object.entries(questionResponses).map(([qid, response]) => ({ question_id: parseInt(qid), response }));
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          oierdb_id: selectedOier?.id || null,
          oierdb_data: selectedOier ? JSON.stringify(selectedOier) : null,
          competition_history: selectedOier?.awards_parsed ? JSON.stringify(selectedOier.awards_parsed) : null,
          responses,
        }),
      });
      const data = await res.json();
      if (data.success) { setSubmitted(true); showToast('报名成功！'); }
      else showToast(data.error || '提交失败', 'error');
    } catch { showToast('网络错误', 'error'); }
    setSubmitting(false);
  };

  // ==================== Success Screen ====================
  if (submitted) {
    return (
      <div className="min-h-screen bg-dot-grid flex items-center justify-center p-6">
        <div className="card-glow max-w-md w-full p-10 text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.4)' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <h2 className="font-display text-2xl font-bold mb-3" style={{ color: '#10B981' }}>报名成功</h2>
          <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{formData.name || ''}，你的 ICPC Camp 报名已提交。</p>
          {selectedOier && (
            <div className="mt-6 p-4 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-mono mb-2" style={{ color: 'var(--accent)' }}>OIerDB 已关联</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                竞赛等级: {LEVEL_MAP[selectedOier.level] || 'Lv.' + selectedOier.level}
                {selectedOier.awards_parsed?.length > 0 && ` · ${selectedOier.awards_parsed.length} 项获奖记录`}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (visibleSteps.length === 0) return null;

  // ==================== Render Field ====================
  const parseOptions = (raw: string | null): string[] => {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Handle double-encoded: if the only element is a string that looks like JSON, unwrap it
        if (parsed.length === 1 && typeof parsed[0] === 'string' && parsed[0].startsWith('[')) {
          try { const inner = JSON.parse(parsed[0]); if (Array.isArray(inner)) return inner; } catch {}
        }
        return parsed;
      }
      return [];
    } catch { return []; }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.field_key] || '';
    const opts = parseOptions(field.options);
    const needsFullWidth = field.input_type === 'radio' || field.input_type === 'textarea';

    return (
      <div key={field.id} className={needsFullWidth ? 'md:col-span-2' : ''}>
        <label className="block text-sm font-medium mb-1.5">
          {field.label}
          {field.required ? <span style={{ color: 'var(--error)' }}> *</span> : <span className="text-xs" style={{ color: 'var(--text-muted)' }}> (选填)</span>}
        </label>
        {field.description && <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{field.description}</p>}

        {(field.input_type === 'text' || field.input_type === 'email' || field.input_type === 'tel') && (
          <input type={field.input_type} className={`input-field ${field.input_type === 'tel' ? 'font-mono' : ''}`}
            placeholder={field.placeholder || ''} value={value} onChange={e => setField(field.field_key, e.target.value)} />
        )}

        {field.input_type === 'textarea' && (
          <textarea className="input-field min-h-[100px] resize-y" placeholder={field.placeholder || ''} value={value} onChange={e => setField(field.field_key, e.target.value)} />
        )}

        {field.input_type === 'select' && (
          <select className="input-field" value={value} onChange={e => setField(field.field_key, e.target.value)}>
            <option value="">请选择</option>
            {opts.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        )}

        {field.input_type === 'radio' && (
          <div className="flex gap-4">
            {opts.map(opt => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: value === opt ? 'var(--accent)' : 'var(--text-secondary)' }}>
                <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all" style={{ borderColor: value === opt ? 'var(--accent)' : 'var(--border)' }}>
                  {value === opt && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />}
                </div>
                <input type="radio" name={field.field_key} value={opt} className="hidden" checked={value === opt} onChange={e => setField(field.field_key, e.target.value)} />
                {opt}
              </label>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ==================== Render Step Content ====================
  const renderStepContent = () => {
    if (!currentStep) return null;

    switch (currentStepKey) {
      case 'basic':
      case 'accounts':
        return (
          <div>
            <h3 className="font-display text-lg font-semibold mb-1">{currentStep.title}</h3>
            {currentStep.description && <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>{currentStep.description}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {currentFields.map(renderField)}
            </div>
          </div>
        );

      case 'oierdb':
        return (
          <div>
            <h3 className="font-display text-lg font-semibold mb-1">{currentStep.title}</h3>
            {/* 更醒目的步骤说明 */}
            <div className="rounded-lg p-3 mb-6" style={{ background: 'rgba(0, 229, 255, 0.06)', border: '1px solid var(--border-accent)' }}>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                我们将在 OIerDB 中搜索你的竞赛记录。如果你在里面，点击选择即可关联；如果找不到也完全没问题，<span className="font-semibold" style={{ color: 'var(--accent)' }}>直接点下一步跳过即可</span>。
              </p>
            </div>
            <div className="flex gap-3 mb-6">
              <input type="text" className="input-field flex-1 font-mono" placeholder="输入姓名搜索..." value={formData.name || ''} onChange={e => setField('name', e.target.value)} />
              <button className="btn-primary flex items-center gap-2" onClick={searchOIerDB} disabled={oierdbSearching}>
                {oierdbSearching ? <div className="spinner" /> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>}
                搜索
              </button>
            </div>
            {oierdbResults.length > 0 && (
              <div className="space-y-3 mb-4">
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  找到 {oierdbResults.length} 条可能的记录，如果你在其中请点击选择：
                </p>
                {oierdbResults.slice(0, 8).map((oier, idx) => (
                  <div key={oier.id} className={`profile-card animate-slide-up ${selectedOier?.id === oier.id ? 'selected' : ''}`}
                    style={{ animationDelay: `${idx * 0.05}s` }} onClick={() => {
                      // 点击已选中的卡片 → 取消选择；点击未选中 → 选中
                      if (selectedOier?.id === oier.id) {
                        setSelectedOier(null);
                        setOierdbSkipped(false);
                      } else {
                        setSelectedOier(oier);
                        setOierdbSkipped(false);
                      }
                    }}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display font-semibold">{oier.name}</span>
                          <span className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-elevated)', color: LEVEL_COLORS[oier.level] || 'var(--text-muted)' }}>
                            {LEVEL_MAP[oier.level] || 'Lv.' + oier.level}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{oier.re1}</p>
                      </div>
                      {selectedOier?.id === oier.id && (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0A0E17" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                        </div>
                      )}
                    </div>
                    {oier.awards_parsed?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {oier.awards_parsed.slice(0, 5).map((a: any, i: number) => <span key={i} className="award-tag">{a.identity} · {a.award_type}</span>)}
                        {oier.awards_parsed.length > 5 && <span className="award-tag">+{oier.awards_parsed.length - 5}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {oierdbSearched && !selectedOier && (
              <div className="flex justify-center mt-4">
                <button className="btn-secondary text-sm" onClick={() => { setOierdbSkipped(true); setSelectedOier(null); nextStep(); }}>找不到我，跳过此步骤</button>
              </div>
            )}
          </div>
        );

      case 'questions':
        return (
          <div>
            <h3 className="font-display text-lg font-semibold mb-1">{currentStep.title}</h3>
            {currentStep.description && <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>{currentStep.description}</p>}
            {questions.length === 0 ? (
              <div className="text-center py-10" style={{ color: 'var(--text-muted)' }}><p className="text-sm">暂无补充问题</p></div>
            ) : (
              <div className="space-y-6">
                {questions.map((q, qIdx) => {
                  const isCodeType = q.type === 'code_select';
                  const selectOpts: string[] = (() => {
                    if (!q.options) return [];
                    try {
                      const parsed = JSON.parse(q.options);
                      let arr: string[];
                      if (Array.isArray(parsed)) {
                        if (parsed.length === 1 && typeof parsed[0] === 'string' && parsed[0].startsWith('[')) {
                          try { const inner = JSON.parse(parsed[0]); if (Array.isArray(inner)) arr = inner; else arr = parsed; } catch { arr = parsed; }
                        } else { arr = parsed; }
                      } else { return []; }
                      // Shuffle with a seeded random based on question id for stability
                      if (q.shuffle_options && arr.length > 1) {
                        let seed = q.id * 2654435761 >>> 0;
                        const shuffled = [...arr];
                        for (let i = shuffled.length - 1; i > 0; i--) {
                          seed = (seed * 1103515245 + 12345) & 0x7fffffff;
                          const j = seed % (i + 1);
                          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                        }
                        return shuffled;
                      }
                      return arr;
                    } catch { return []; }
                  })();

                  return (
                    <div key={q.id} className="rounded-xl p-5" style={{
                      background: 'var(--bg-secondary)',
                      border: `1px solid ${isCodeType ? 'var(--border-accent)' : 'var(--border)'}`,
                    }}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-mono text-xs px-2 py-0.5 rounded font-bold" style={{
                          background: isCodeType ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                          color: isCodeType ? 'var(--accent)' : 'var(--text-muted)',
                        }}>
                          {isCodeType ? '{ }' : `#${qIdx + 1}`}
                        </span>
                        <label className="text-sm font-medium">
                          {q.label}
                          {q.required ? <span style={{ color: 'var(--error)' }}> *</span> : <span className="text-xs" style={{ color: 'var(--text-muted)' }}> (选填)</span>}
                        </label>
                      </div>

                      {/* Code block for code_select */}
                      {isCodeType && q.description && (
                        <div className="mb-4">
                          <CodeBlock code={q.description} language="python" />
                        </div>
                      )}
                      {/* Plain description for non-code types */}
                      {!isCodeType && q.description && (
                        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{q.description}</p>
                      )}

                      {/* Answer input */}
                      {(q.type === 'select' || q.type === 'code_select') && (
                        <select className="input-field" value={questionResponses[q.id] || ''} onChange={e => setQuestionResponses(p => ({ ...p, [q.id]: e.target.value }))}>
                          <option value="">{isCodeType ? '请判断算法功能' : '请选择'}</option>
                          {selectOpts.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      )}
                      {q.type === 'text' && <input type="text" className="input-field" value={questionResponses[q.id] || ''} onChange={e => setQuestionResponses(p => ({ ...p, [q.id]: e.target.value }))} />}
                      {q.type === 'textarea' && <textarea className="input-field min-h-[80px] resize-y" value={questionResponses[q.id] || ''} onChange={e => setQuestionResponses(p => ({ ...p, [q.id]: e.target.value }))} />}
                      {q.type === 'number' && <input type="number" className="input-field font-mono" value={questionResponses[q.id] || ''} onChange={e => setQuestionResponses(p => ({ ...p, [q.id]: e.target.value }))} />}
                      {q.type === 'multiselect' && (
                        <div className="flex flex-wrap gap-2">
                          {selectOpts.map(opt => {
                            const sel: string[] = (questionResponses[q.id] || '').split(',').filter(Boolean);
                            return (
                              <button key={opt} type="button" className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${sel.includes(opt) ? 'border-[var(--accent)] bg-[var(--accent-dim)]' : 'border-[var(--border)]'}`}
                                onClick={() => { const n = sel.includes(opt) ? sel.filter(s => s !== opt) : [...sel, opt]; setQuestionResponses(p => ({ ...p, [q.id]: n.join(',') })); }}>
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {q.type === 'checkbox' && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={questionResponses[q.id] === 'true'} onChange={e => setQuestionResponses(p => ({ ...p, [q.id]: e.target.checked ? 'true' : '' }))} className="w-4 h-4 rounded" />
                          <span className="text-sm">{q.label}</span>
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'review':
        return (
          <div>
            <h3 className="font-display text-lg font-semibold mb-1">{currentStep.title}</h3>
            {currentStep.description && <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>{currentStep.description}</p>}
            <div className="space-y-4">
              {/* All configured fields grouped by step */}
              {steps.filter(s => s.step_key !== 'review' && s.step_key !== 'questions' && s.step_key !== 'oierdb').map(step => {
                const stepFields = fields.filter(f => f.step_key === step.step_key && formData[f.field_key]);
                if (stepFields.length === 0) return null;
                return (
                  <div key={step.step_key} className="rounded-lg p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--accent)' }}>{step.title}</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {stepFields.map(f => (
                        <div key={f.id}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{f.label}</span>
                          <p className="font-medium mt-0.5">{formData[f.field_key]}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {/* OIerDB */}
              {selectedOier && (
                <div className="rounded-lg p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-accent)' }}>
                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--accent)' }}>OIerDB 竞赛记录</h4>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-display font-semibold">{selectedOier.name}</span>
                    <span className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-elevated)', color: LEVEL_COLORS[selectedOier.level] || 'var(--text-muted)' }}>
                      {LEVEL_MAP[selectedOier.level] || 'Lv.' + selectedOier.level}
                    </span>
                  </div>
                  {selectedOier.awards_parsed?.length > 0 && (
                    <div className="space-y-1.5">{selectedOier.awards_parsed.map((a: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="award-tag">{a.ctype}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{a.award_type}</span>
                        <span style={{ color: 'var(--text-muted)' }}>· {a.school}</span>
                      </div>
                    ))}</div>
                  )}
                </div>
              )}
              {/* Dynamic questions */}
              {questions.length > 0 && Object.keys(questionResponses).length > 0 && (
                <div className="rounded-lg p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--accent)' }}>补充信息</h4>
                  {questions.map(q => { const resp = questionResponses[q.id]; if (!resp) return null; return <div key={q.id} className="mb-2"><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{q.label}</span><p className="text-sm mt-0.5">{resp}</p></div>; })}
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-dot-grid">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, var(--accent), transparent)' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-[0.02]" style={{ background: 'radial-gradient(circle, var(--gold), transparent)' }} />
      </div>

      <div className="relative max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <header className="mb-12 animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center font-display font-bold text-sm" style={{ background: 'linear-gradient(135deg, #00B8CC, #00E5FF)', color: '#0A0E17' }}>IC</div>
            <div>
              <h1 className="font-display text-xl font-bold tracking-wide" style={{ color: 'var(--accent)' }}>ICPC CAMP</h1>
              <p className="text-[10px] font-mono tracking-[0.3em] uppercase" style={{ color: 'var(--text-muted)' }}>Registration System</p>
            </div>
          </div>
          <h2 className="font-display text-3xl font-bold mb-2">ICPC Camp 报名注册</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>请填写以下信息完成报名。</p>
        </header>

        {/* Step indicator */}
        {visibleSteps.length > 0 && (
          <div className="flex items-center justify-between mb-10 animate-slide-up">
            {visibleSteps.map((s, i) => {
              const isActive = i === currentStepIdx;
              const isCompleted = i < currentStepIdx;
              return (
                <div key={s.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`step-indicator ${isActive ? 'step-active' : isCompleted ? 'step-completed' : 'step-pending'}`}>
                      {isCompleted ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                        : <span className="text-xs">{String(i + 1).padStart(2, '0')}</span>}
                    </div>
                    <span className="text-[10px] mt-1.5 font-medium whitespace-nowrap" style={{ color: isActive ? 'var(--accent)' : isCompleted ? 'var(--success)' : 'var(--text-muted)' }}>{s.title}</span>
                  </div>
                  {i < visibleSteps.length - 1 && <div className="flex-1 h-px mx-2 mt-[-16px]" style={{ background: isCompleted ? 'var(--success)' : 'var(--border)' }} />}
                </div>
              );
            })}
          </div>
        )}

        {/* Step content */}
        <div className="card-glow p-8 animate-slide-up" key={currentStepKey}>
          {renderStepContent()}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
            <button className="btn-secondary" onClick={prevStep} style={{ visibility: currentStepIdx === 0 ? 'hidden' : 'visible' }}>← 上一步</button>
            {currentStepKey === 'review' ? (
              <button className="btn-primary flex items-center gap-2" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <><div className="spinner" style={{ borderTopColor: '#0A0E17' }} />提交中...</> : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" /></svg>确认提交</>}
              </button>
            ) : (
              <button className="btn-primary" onClick={nextStep}
                disabled={currentStepKey === 'oierdb' && !oierdbSearched}>
                下一步 →
              </button>
            )}
          </div>
        </div>

        <footer className="mt-10 text-center">
          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>ICPC Camp Registration System · Powered by Next.js</p>
        </footer>
      </div>

      {toast && (
        <div className="toast" style={{ borderColor: toast.type === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)' }}>
          <div className="flex items-center gap-3">
            {toast.type === 'error' ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
            <span className="text-sm">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
