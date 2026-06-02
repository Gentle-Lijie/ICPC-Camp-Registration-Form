import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'registrations.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initializeSchema(db);
  return db;
}

function initializeSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'text',
      options TEXT,
      required INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      student_id TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT DEFAULT '',
      school TEXT DEFAULT '',
      grade TEXT DEFAULT '',
      gender TEXT DEFAULT '',
      luogu_account TEXT DEFAULT '',
      github_account TEXT DEFAULT '',
      programming_language TEXT DEFAULT '',
      oierdb_id TEXT,
      oierdb_data TEXT,
      competition_history TEXT,
      notes TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS question_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_id INTEGER NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      response TEXT DEFAULT '',
      UNIQUE(registration_id, question_id)
    );

    CREATE TABLE IF NOT EXISTS webhooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      secret TEXT DEFAULT '',
      events TEXT DEFAULT '["registration.new"]',
      frequency TEXT DEFAULT 'realtime',
      is_active INTEGER DEFAULT 1,
      last_triggered_at TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS webhook_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      webhook_id INTEGER NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      attempts INTEGER DEFAULT 0,
      error TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      sent_at TEXT
    );

    CREATE TABLE IF NOT EXISTS form_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      step_key TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      prompt TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      visible INTEGER DEFAULT 1,
      is_system INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS form_fields (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      step_key TEXT NOT NULL,
      field_key TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      input_type TEXT NOT NULL DEFAULT 'text',
      placeholder TEXT DEFAULT '',
      required INTEGER DEFAULT 0,
      visible INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      options TEXT,
      description TEXT DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // Migrations: add shuffle_options column if missing
  const cols = (db.prepare("PRAGMA table_info(questions)").all() as { name: string }[]).map(c => c.name);
  if (!cols.includes('shuffle_options')) {
    db.exec('ALTER TABLE questions ADD COLUMN shuffle_options INTEGER DEFAULT 0');
  }

  // Seed default form_steps if empty
  const stepCount = (db.prepare('SELECT COUNT(*) as c FROM form_steps').get() as any).c;
  if (stepCount === 0) {
    const insertStep = db.prepare(
      `INSERT INTO form_steps (step_key, title, description, prompt, sort_order, visible, is_system)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    insertStep.run('basic', '基本信息', '带 * 的为必填项', '', 0, 1, 0);
    insertStep.run('oierdb', 'OIerDB 身份验证', '我们将在 OIerDB 中搜索你的竞赛记录，请选择正确的个人资料。如果找不到也可以跳过。', '', 1, 1, 1);
    insertStep.run('accounts', '竞赛账号', '填写你的在线评测平台账号，方便我们了解你的编程水平。', '', 2, 1, 0);
    insertStep.run('questions', '补充信息', '请回答以下问题。', '', 3, 1, 1);
    insertStep.run('review', '确认信息', '请仔细检查以下信息，确认无误后提交。', '', 4, 1, 1);
  }

  // Seed default form_fields if empty
  const fieldCount = (db.prepare('SELECT COUNT(*) as c FROM form_fields').get() as any).c;
  if (fieldCount === 0) {
    const insertField = db.prepare(
      `INSERT INTO form_fields (step_key, field_key, label, input_type, placeholder, required, visible, sort_order, options, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    // Basic info fields
    insertField.run('basic', 'name', '姓名', 'text', '请输入真实姓名', 1, 1, 0, null, '');
    insertField.run('basic', 'student_id', '学号', 'text', '请输入学号', 1, 1, 1, null, '');
    insertField.run('basic', 'phone', '手机号', 'tel', '11 位手机号', 1, 1, 2, null, '');
    insertField.run('basic', 'email', '邮箱', 'email', '可选', 0, 1, 3, null, '');
    insertField.run('basic', 'school', '学校/学院', 'text', '如：计算机科学与技术学院', 0, 1, 4, null, '');
    insertField.run('basic', 'grade', '年级', 'select', null, 0, 1, 5, '["大一","大二","大三","大四","研一","研二","研三","其他"]', '');
    insertField.run('basic', 'gender', '性别', 'radio', null, 0, 1, 6, '["男","女","其他"]', '');
    // Account fields
    insertField.run('accounts', 'luogu_account', 'Luogu 账号', 'text', '你的洛谷用户名', 0, 1, 0, null, '');
    insertField.run('accounts', 'github_account', 'GitHub 账号', 'text', '你的 GitHub 用户名', 0, 1, 1, null, '');
    insertField.run('accounts', 'programming_language', '常用编程语言', 'select', null, 0, 1, 2, '["C","C++","Java","Python","Rust","Go","其他"]', '');
    insertField.run('accounts', 'notes', '备注', 'textarea', '其他你想告诉我们的信息...', 0, 1, 3, null, '');
  }
}

// ==================== Questions ====================

export interface Question {
  id: number;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'code_select' | 'number' | 'checkbox';
  options: string | null;
  required: number;
  sort_order: number;
  description: string;
  shuffle_options: number;
  created_at: string;
  updated_at: string;
}

export function getQuestions(): Question[] {
  return getDb().prepare('SELECT * FROM questions ORDER BY sort_order ASC, id ASC').all() as Question[];
}

export function getQuestionById(id: number): Question | undefined {
  return getDb().prepare('SELECT * FROM questions WHERE id = ?').get(id) as Question | undefined;
}

export function createQuestion(q: Omit<Question, 'id' | 'created_at' | 'updated_at'>): Question {
  const stmt = getDb().prepare(
    `INSERT INTO questions (label, type, options, required, sort_order, description)
     VALUES (@label, @type, @options, @required, @sort_order, @description)`
  );
  const result = stmt.run(q);
  return getQuestionById(result.lastInsertRowid as number)!;
}

export function updateQuestion(id: number, q: Partial<Question>): Question | undefined {
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(q)) {
    if (key === 'id' || key === 'created_at') continue;
    fields.push(`${key} = ?`);
    values.push(value);
  }

  if (fields.length === 0) return getQuestionById(id);

  fields.push("updated_at = datetime('now', 'localtime')");
  values.push(id);

  getDb().prepare(`UPDATE questions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getQuestionById(id);
}

export function deleteQuestion(id: number): boolean {
  const result = getDb().prepare('DELETE FROM questions WHERE id = ?').run(id);
  return result.changes > 0;
}

// ==================== Registrations ====================

export interface Registration {
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
}

export interface RegistrationWithResponses extends Registration {
  responses?: { question_id: number; response: string }[];
}

export function getRegistrations(options?: { search?: string; status?: string; limit?: number; offset?: number }): { data: Registration[]; total: number } {
  const db = getDb();
  let where = '1=1';
  const params: any[] = [];

  if (options?.search) {
    where += ` AND (name LIKE ? OR student_id LIKE ? OR school LIKE ? OR phone LIKE ?)`;
    const term = `%${options.search}%`;
    params.push(term, term, term, term);
  }

  if (options?.status) {
    where += ` AND status = ?`;
    params.push(options.status);
  }

  const total = (db.prepare(`SELECT COUNT(*) as count FROM registrations WHERE ${where}`).get(...params) as any).count;

  const limit = options?.limit || 50;
  const offset = options?.offset || 0;
  const data = db.prepare(`SELECT * FROM registrations WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset) as Registration[];

  return { data, total };
}

export function getRegistrationById(id: number): RegistrationWithResponses | undefined {
  const reg = getDb().prepare('SELECT * FROM registrations WHERE id = ?').get(id) as Registration | undefined;
  if (!reg) return undefined;

  const responses = getDb().prepare('SELECT question_id, response FROM question_responses WHERE registration_id = ?').all(id) as { question_id: number; response: string }[];

  return { ...reg, responses };
}

export function createRegistration(data: {
  name: string;
  student_id: string;
  phone: string;
  email?: string;
  school?: string;
  grade?: string;
  gender?: string;
  luogu_account?: string;
  github_account?: string;
  programming_language?: string;
  oierdb_id?: string | null;
  oierdb_data?: string | null;
  competition_history?: string | null;
  notes?: string;
  responses?: { question_id: number; response: string }[];
}): Registration {
  const db = getDb();

  const reg = db.prepare(`
    INSERT INTO registrations (name, student_id, phone, email, school, grade, gender,
      luogu_account, github_account, programming_language, oierdb_id, oierdb_data,
      competition_history, notes)
    VALUES (@name, @student_id, @phone, @email, @school, @grade, @gender,
      @luogu_account, @github_account, @programming_language, @oierdb_id, @oierdb_data,
      @competition_history, @notes)
  `).run({
    name: data.name,
    student_id: data.student_id,
    phone: data.phone,
    email: data.email || '',
    school: data.school || '',
    grade: data.grade || '',
    gender: data.gender || '',
    luogu_account: data.luogu_account || '',
    github_account: data.github_account || '',
    programming_language: data.programming_language || '',
    oierdb_id: data.oierdb_id || null,
    oierdb_data: data.oierdb_data || null,
    competition_history: data.competition_history || null,
    notes: data.notes || '',
  });

  const regId = reg.lastInsertRowid as number;

  if (data.responses && data.responses.length > 0) {
    const respStmt = db.prepare('INSERT OR REPLACE INTO question_responses (registration_id, question_id, response) VALUES (?, ?, ?)');
    for (const r of data.responses) {
      respStmt.run(regId, r.question_id, r.response);
    }
  }

  return getRegistrationById(regId) as Registration;
}

export function updateRegistration(id: number, data: Partial<Registration>): Registration | undefined {
  const db = getDb();
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (key === 'id' || key === 'created_at') continue;
    fields.push(`${key} = ?`);
    values.push(value);
  }

  if (fields.length === 0) return getRegistrationById(id);

  fields.push("updated_at = datetime('now', 'localtime')");
  values.push(id);

  db.prepare(`UPDATE registrations SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getRegistrationById(id);
}

export function deleteRegistration(id: number): boolean {
  const result = getDb().prepare('DELETE FROM registrations WHERE id = ?').run(id);
  return result.changes > 0;
}

// ==================== Webhooks ====================

export interface Webhook {
  id: number;
  name: string;
  url: string;
  secret: string;
  events: string;
  frequency: 'realtime' | 'hourly' | 'daily';
  is_active: number;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookQueueItem {
  id: number;
  webhook_id: number;
  event_type: string;
  payload: string;
  status: string;
  attempts: number;
  error: string | null;
  created_at: string;
  sent_at: string | null;
}

export function getWebhooks(): Webhook[] {
  return getDb().prepare('SELECT * FROM webhooks ORDER BY created_at DESC').all() as Webhook[];
}

export function getWebhookById(id: number): Webhook | undefined {
  return getDb().prepare('SELECT * FROM webhooks WHERE id = ?').get(id) as Webhook | undefined;
}

export function createWebhook(w: Omit<Webhook, 'id' | 'last_triggered_at' | 'created_at' | 'updated_at'>): Webhook {
  const stmt = getDb().prepare(
    `INSERT INTO webhooks (name, url, secret, events, frequency, is_active)
     VALUES (@name, @url, @secret, @events, @frequency, @is_active)`
  );
  const result = stmt.run(w);
  return getWebhookById(result.lastInsertRowid as number)!;
}

export function updateWebhook(id: number, w: Partial<Webhook>): Webhook | undefined {
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(w)) {
    if (key === 'id' || key === 'created_at') continue;
    fields.push(`${key} = ?`);
    values.push(value);
  }

  if (fields.length === 0) return getWebhookById(id);

  fields.push("updated_at = datetime('now', 'localtime')");
  values.push(id);

  getDb().prepare(`UPDATE webhooks SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getWebhookById(id);
}

export function deleteWebhook(id: number): boolean {
  const result = getDb().prepare('DELETE FROM webhooks WHERE id = ?').run(id);
  return result.changes > 0;
}

export function enqueueWebhookEvent(webhookId: number, eventType: string, payload: string): void {
  getDb().prepare(
    `INSERT INTO webhook_queue (webhook_id, event_type, payload) VALUES (?, ?, ?)`
  ).run(webhookId, eventType, payload);
}

export function getPendingWebhookQueue(webhookId?: number): WebhookQueueItem[] {
  if (webhookId) {
    return getDb().prepare('SELECT * FROM webhook_queue WHERE webhook_id = ? AND status = ? ORDER BY created_at ASC').all(webhookId, 'pending') as WebhookQueueItem[];
  }
  return getDb().prepare('SELECT * FROM webhook_queue WHERE status = ? ORDER BY created_at ASC').all('pending') as WebhookQueueItem[];
}

export function updateWebhookQueueItem(id: number, data: Partial<WebhookQueueItem>): void {
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (key === 'id') continue;
    fields.push(`${key} = ?`);
    values.push(value);
  }

  if (fields.length === 0) return;
  values.push(id);

  getDb().prepare(`UPDATE webhook_queue SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

// ==================== Dashboard Stats ====================

export function getDashboardStats() {
  const db = getDb();

  const totalRegistrations = (db.prepare('SELECT COUNT(*) as c FROM registrations').get() as any).c;
  const todayRegistrations = (db.prepare("SELECT COUNT(*) as c FROM registrations WHERE date(created_at) = date('now', 'localtime')").get() as any).c;
  const weekRegistrations = (db.prepare("SELECT COUNT(*) as c FROM registrations WHERE created_at >= datetime('now', '-7 days', 'localtime')").get() as any).c;
  const pendingCount = (db.prepare("SELECT COUNT(*) as c FROM registrations WHERE status = 'pending'").get() as any).c;

  const dailyTrend = db.prepare(`
    SELECT date(created_at) as date, COUNT(*) as count
    FROM registrations
    WHERE created_at >= datetime('now', '-30 days', 'localtime')
    GROUP BY date(created_at)
    ORDER BY date ASC
  `).all() as { date: string; count: number }[];

  const schoolDistribution = db.prepare(`
    SELECT COALESCE(school, '未填写') as school, COUNT(*) as count
    FROM registrations
    GROUP BY school
    ORDER BY count DESC
    LIMIT 20
  `).all() as { school: string; count: number }[];

  const gradeDistribution = db.prepare(`
    SELECT COALESCE(grade, '未填写') as grade, COUNT(*) as count
    FROM registrations
    GROUP BY grade
    ORDER BY count DESC
  `).all() as { grade: string; count: number }[];

  const languageDistribution = db.prepare(`
    SELECT COALESCE(programming_language, '未填写') as language, COUNT(*) as count
    FROM registrations
    GROUP BY programming_language
    ORDER BY count DESC
    LIMIT 10
  `).all() as { language: string; count: number }[];

  const recentRegistrations = db.prepare(`
    SELECT id, name, school, grade, created_at, status
    FROM registrations
    ORDER BY created_at DESC
    LIMIT 10
  `).all() as Registration[];

  return {
    totalRegistrations,
    todayRegistrations,
    weekRegistrations,
    pendingCount,
    dailyTrend,
    schoolDistribution,
    gradeDistribution,
    languageDistribution,
    recentRegistrations,
  };
}

// ==================== Form Steps ====================

export interface FormStep {
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

export function getFormSteps(): FormStep[] {
  return getDb().prepare('SELECT * FROM form_steps ORDER BY sort_order ASC').all() as FormStep[];
}

export function getFormStepById(id: number): FormStep | undefined {
  return getDb().prepare('SELECT * FROM form_steps WHERE id = ?').get(id) as FormStep | undefined;
}

export function getFormStepByKey(key: string): FormStep | undefined {
  return getDb().prepare('SELECT * FROM form_steps WHERE step_key = ?').get(key) as FormStep | undefined;
}

export function updateFormStep(id: number, data: Partial<FormStep>): FormStep | undefined {
  const fields: string[] = [];
  const values: any[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (key === 'id' || key === 'created_at' || key === 'updated_at') continue;
    fields.push(`${key} = ?`);
    values.push(value);
  }
  if (fields.length === 0) return getFormStepById(id);
  fields.push("updated_at = datetime('now', 'localtime')");
  values.push(id);
  getDb().prepare(`UPDATE form_steps SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getFormStepById(id);
}

// ==================== Form Fields ====================

export interface FormField {
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

export function getFormFields(): FormField[] {
  return getDb().prepare('SELECT * FROM form_fields ORDER BY step_key ASC, sort_order ASC').all() as FormField[];
}

export function getFormFieldsByStep(stepKey: string): FormField[] {
  return getDb().prepare('SELECT * FROM form_fields WHERE step_key = ? ORDER BY sort_order ASC').all(stepKey) as FormField[];
}

export function getVisibleFormFields(): FormField[] {
  return getDb().prepare('SELECT * FROM form_fields WHERE visible = 1 ORDER BY step_key ASC, sort_order ASC').all() as FormField[];
}

export function getFormFieldById(id: number): FormField | undefined {
  return getDb().prepare('SELECT * FROM form_fields WHERE id = ?').get(id) as FormField | undefined;
}

export function createFormField(f: Omit<FormField, 'id' | 'updated_at'>): FormField {
  const stmt = getDb().prepare(
    `INSERT INTO form_fields (step_key, field_key, label, input_type, placeholder, required, visible, sort_order, options, description)
     VALUES (@step_key, @field_key, @label, @input_type, @placeholder, @required, @visible, @sort_order, @options, @description)`
  );
  const result = stmt.run(f);
  return getFormFieldById(result.lastInsertRowid as number)!;
}

export function updateFormField(id: number, data: Partial<FormField>): FormField | undefined {
  const fields: string[] = [];
  const values: any[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (key === 'id' || key === 'updated_at') continue;
    fields.push(`${key} = ?`);
    values.push(value);
  }
  if (fields.length === 0) return getFormFieldById(id);
  fields.push("updated_at = datetime('now', 'localtime')");
  values.push(id);
  getDb().prepare(`UPDATE form_fields SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getFormFieldById(id);
}

export function deleteFormField(id: number): boolean {
  const result = getDb().prepare('DELETE FROM form_fields WHERE id = ?').run(id);
  return result.changes > 0;
}

// ==================== Form Config (combined) ====================

export function getFormConfig() {
  const steps = getFormSteps().filter(s => s.visible);
  const fields = getVisibleFormFields();
  const questions = getQuestions();
  return { steps, fields, questions };
}
