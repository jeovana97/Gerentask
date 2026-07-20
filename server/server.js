import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Serve arquivos de upload estaticamente
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Configuração do Multer para documentos (PDF, Excel, Word)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `att_${Date.now()}_${safeName}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Tipo de arquivo não permitido.'));
  }
});

// Helper for parsing JSON fields safely
const parseJSON = (str, fallback = null) => {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch (e) {
    return fallback;
  }
};

// Helper to record insertion history
const recordInsertionHistory = (type, entityId, entityName, createdBy) => {
  const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
  db.prepare("INSERT INTO insertionHistory (id, type, entityId, entityName, createdBy, date) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, type, entityId, entityName || 'Desconhecido', createdBy || 'Sistema', new Date().toISOString());
};

// Helper to record update history
const recordUpdateHistory = (type, entityId, entityName, oldData, newData, changedBy) => {
  const changes = {};
  for (const key in newData) {
    if (['id', 'deletedAt', 'createdAt', 'deletedBy', 'dueDateNotified'].includes(key)) continue;
    let oldVal = oldData[key];
    let newVal = newData[key];
    if (typeof oldVal === 'string' && (oldVal.startsWith('[') || oldVal.startsWith('{'))) {
      try { oldVal = JSON.parse(oldVal); } catch (e) {}
    }
    if (typeof newVal === 'string' && (newVal.startsWith('[') || newVal.startsWith('{'))) {
      try { newVal = JSON.parse(newVal); } catch (e) {}
    }
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[key] = { from: oldVal, to: newVal };
    }
  }
  if (Object.keys(changes).length > 0) {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    db.prepare("INSERT INTO updateHistory (id, type, entityId, entityName, changedBy, date, changes) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(id, type, entityId, entityName || 'Desconhecido', changedBy || 'Sistema', new Date().toISOString(), JSON.stringify(changes));
  }
};

// History endpoints
app.get('/api/history', (req, res) => {
  res.json(db.prepare("SELECT * FROM deletionHistory ORDER BY date DESC").all());
});

app.get('/api/update-history', (req, res) => {
  const history = db.prepare("SELECT * FROM updateHistory ORDER BY date DESC").all().map(h => ({
    ...h,
    changes: parseJSON(h.changes, {})
  }));
  res.json(history);
});

app.get('/api/insertion-history', (req, res) => {
  res.json(db.prepare("SELECT * FROM insertionHistory ORDER BY date DESC").all());
});

// Users
app.get('/api/users', (req, res) => {
  const includeDeleted = req.query.includeDeleted === 'true';
  const query = includeDeleted ? "SELECT * FROM users" : "SELECT * FROM users WHERE deletedAt IS NULL";
  const users = db.prepare(query).all().map(u => ({
    ...u,
    verified: Boolean(u.verified),
    approved: Boolean(u.approved)
  }));
  res.json(users);
});

app.post('/api/users', (req, res) => {
  const { id, name, email, password, role, departmentId, jobTitleId, verified, approved, photo } = req.body;
  const createdBy = req.query.createdBy || name || 'Sistema';
  const stmt = db.prepare("INSERT INTO users (id, name, email, password, role, departmentId, jobTitleId, verified, approved, photo, deletedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)");
  stmt.run(id, name, email, password, role, departmentId, jobTitleId || null, verified ? 1 : 0, approved ? 1 : 0, photo || null);
  
  recordInsertionHistory('Usuário', id, name, createdBy);
  
  res.status(201).json({ id });
});

app.put('/api/users/:id', (req, res) => {
  const id = req.params.id;
  const fields = req.body;
  const changedBy = req.query.changedBy || 'Sistema';
  
  const oldUser = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!oldUser) return res.status(404).json({ error: 'User not found' });
  
  const sets = [];
  const values = [];
  for (const [key, val] of Object.entries(fields)) {
    sets.push(`${key} = ?`);
    values.push(typeof val === 'boolean' ? (val ? 1 : 0) : val);
  }
  
  if (sets.length === 0) return res.json({ success: true });
  
  values.push(id);
  const stmt = db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`);
  const info = stmt.run(...values);
  
  if (info.changes > 0) {
    recordUpdateHistory('Usuário', id, oldUser.name, oldUser, fields, changedBy);
    res.json({ success: true });
  }
  else res.status(404).json({ error: 'User not found' });
});

app.delete('/api/users/:id', (req, res) => {
  const id = req.params.id;
  const deletedBy = req.query.deletedBy || 'Desconhecido';
  
  const user = db.prepare("SELECT name FROM users WHERE id = ?").get(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const now = new Date().toISOString();
  db.prepare("UPDATE users SET deletedAt = ? WHERE id = ?").run(now, id);
  db.prepare("INSERT INTO deletionHistory (id, type, name, deletedBy, date) VALUES (?, ?, ?, ?, ?)").run(
    Date.now().toString(), 'Usuário', user.name, deletedBy, now
  );
  
  res.json({ success: true });
});

// Job Titles
app.get('/api/job-titles', (req, res) => {
  const includeDeleted = req.query.includeDeleted === 'true';
  const query = includeDeleted ? "SELECT * FROM jobTitles" : "SELECT * FROM jobTitles WHERE deletedAt IS NULL";
  res.json(db.prepare(query).all());
});

app.post('/api/job-titles', (req, res) => {
  const { id, name, accessLevel } = req.body;
  const createdBy = req.query.createdBy || 'Sistema';
  db.prepare("INSERT INTO jobTitles (id, name, accessLevel, deletedAt) VALUES (?, ?, ?, NULL)").run(id, name, accessLevel);
  
  recordInsertionHistory('Cargo', id, name, createdBy);
  
  res.status(201).json({ id });
});

app.put('/api/job-titles/:id', (req, res) => {
  const id = req.params.id;
  const fields = req.body;
  const changedBy = req.query.changedBy || 'Sistema';
  
  const oldJob = db.prepare("SELECT * FROM jobTitles WHERE id = ?").get(id);
  if (!oldJob) return res.status(404).json({ error: 'Job title not found' });
  
  const sets = [];
  const values = [];
  for (const [key, val] of Object.entries(fields)) {
    sets.push(`${key} = ?`);
    values.push(val);
  }
  
  if (sets.length === 0) return res.json({ success: true });
  
  values.push(id);
  const stmt = db.prepare(`UPDATE jobTitles SET ${sets.join(', ')} WHERE id = ?`);
  const info = stmt.run(...values);
  
  if (info.changes > 0) {
    recordUpdateHistory('Cargo', id, oldJob.name, oldJob, fields, changedBy);
    res.json({ success: true });
  }
  else res.status(404).json({ error: 'Job title not found' });
});

app.delete('/api/job-titles/:id', (req, res) => {
  const id = req.params.id;
  const deletedBy = req.query.deletedBy || 'Desconhecido';
  
  const jobTitle = db.prepare("SELECT name FROM jobTitles WHERE id = ?").get(id);
  if (!jobTitle) return res.status(404).json({ error: 'Job title not found' });

  const now = new Date().toISOString();
  db.prepare("UPDATE jobTitles SET deletedAt = ? WHERE id = ?").run(now, id);
  db.prepare("INSERT INTO deletionHistory (id, type, name, deletedBy, date) VALUES (?, ?, ?, ?, ?)").run(
    Date.now().toString(), 'Cargo', jobTitle.name, deletedBy, now
  );
  
  res.json({ success: true });
});

// Departments
app.get('/api/departments', (req, res) => {
  const includeDeleted = req.query.includeDeleted === 'true';
  const query = includeDeleted ? "SELECT * FROM departments" : "SELECT * FROM departments WHERE deletedAt IS NULL";
  res.json(db.prepare(query).all());
});

app.post('/api/departments', (req, res) => {
  const { id, name, description } = req.body;
  const createdBy = req.query.createdBy || 'Sistema';
  db.prepare("INSERT INTO departments (id, name, description, deletedAt) VALUES (?, ?, ?, NULL)").run(id, name, description);
  
  recordInsertionHistory('Departamento', id, name, createdBy);
  
  res.status(201).json({ id });
});

app.put('/api/departments/:id', (req, res) => {
  const id = req.params.id;
  const fields = req.body;
  const changedBy = req.query.changedBy || 'Sistema';
  
  const oldDept = db.prepare("SELECT * FROM departments WHERE id = ?").get(id);
  if (!oldDept) return res.status(404).json({ error: 'Department not found' });
  
  const sets = [];
  const values = [];
  for (const [key, val] of Object.entries(fields)) {
    sets.push(`${key} = ?`);
    values.push(val);
  }
  
  if (sets.length === 0) return res.json({ success: true });
  
  values.push(id);
  const stmt = db.prepare(`UPDATE departments SET ${sets.join(', ')} WHERE id = ?`);
  const info = stmt.run(...values);
  
  if (info.changes > 0) {
    recordUpdateHistory('Departamento', id, oldDept.name, oldDept, fields, changedBy);
    res.json({ success: true });
  }
  else res.status(404).json({ error: 'Department not found' });
});

app.delete('/api/departments/:id', (req, res) => {
  const id = req.params.id;
  const deletedBy = req.query.deletedBy || 'Desconhecido';
  
  const dept = db.prepare("SELECT name FROM departments WHERE id = ?").get(id);
  if (!dept) return res.status(404).json({ error: 'Department not found' });

  const now = new Date().toISOString();
  db.prepare("UPDATE departments SET deletedAt = ? WHERE id = ?").run(now, id);
  db.prepare("INSERT INTO deletionHistory (id, type, name, deletedBy, date) VALUES (?, ?, ?, ?, ?)").run(
    Date.now().toString(), 'Departamento', dept.name, deletedBy, now
  );
  
  res.json({ success: true });
});

// Tasks
app.get('/api/tasks', (req, res) => {
  const includeDeleted = req.query.includeDeleted === 'true';
  const query = includeDeleted ? "SELECT * FROM tasks" : "SELECT * FROM tasks WHERE deletedAt IS NULL";
  const tasks = db.prepare(query).all().map(t => ({
    ...t,
    isPersonal: Boolean(t.isPersonal),
    assignedToIds: parseJSON(t.assignedToIds, []),
    ccIds: parseJSON(t.ccIds, []),
    comments: parseJSON(t.comments, []),
    attachments: parseJSON(t.attachments, [])
  }));
  res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
  const t = req.body;
  const assignedToIds = JSON.stringify(t.assignedToIds || []);
  const ccIds = JSON.stringify(t.ccIds || []);
  const comments = JSON.stringify(t.comments || []);
  const attachments = JSON.stringify(t.attachments || []);
  
  const stmt = db.prepare(`
    INSERT INTO tasks (id, title, description, status, priority, dueDate, departmentId, assignedToIds, isPersonal, createdAt, createdById, createdBy, approvalStatus, comments, attachments, deletedAt, ccIds)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
  `);
  stmt.run(
    t.id, t.title, t.description, t.status, t.priority, t.dueDate, t.departmentId,
    assignedToIds, t.isPersonal ? 1 : 0, t.createdAt, t.createdById, t.createdBy,
    t.approvalStatus, comments, attachments, ccIds
  );
  
  recordInsertionHistory('Tarefa', t.id, t.title, t.createdBy || 'Sistema');
  
  res.status(201).json({ id: t.id });
});

app.put('/api/tasks/:id', (req, res) => {
  const id = req.params.id;
  const fields = req.body;
  const changedBy = req.query.changedBy || 'Sistema';
  
  const oldTask = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
  if (!oldTask) return res.status(404).json({ error: 'Task not found' });
  
  const sets = [];
  const values = [];
  for (const [key, val] of Object.entries(fields)) {
    sets.push(`${key} = ?`);
    if (['assignedToIds', 'ccIds', 'comments', 'attachments'].includes(key)) {
      values.push(JSON.stringify(val));
    } else if (key === 'isPersonal') {
      values.push(val ? 1 : 0);
    } else if (key === 'dueDate') {
      values.push(val);
      // Reseta a notificação se o prazo for alterado
      sets.push('dueDateNotified = ?');
      values.push(0);
    } else {
      values.push(val);
    }
  }
  
  if (sets.length === 0) return res.json({ success: true });
  
  values.push(id);
  const stmt = db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`);
  const info = stmt.run(...values);
  
  if (info.changes > 0) {
    recordUpdateHistory('Tarefa', id, oldTask.title, oldTask, fields, changedBy);
    res.json({ success: true });
  }
  else res.status(404).json({ error: 'Task not found' });
});

app.delete('/api/tasks/:id', (req, res) => {
  const id = req.params.id;
  const deletedBy = req.query.deletedBy || 'Desconhecido';
  
  const task = db.prepare("SELECT title FROM tasks WHERE id = ?").get(id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const now = new Date().toISOString();
  db.prepare("UPDATE tasks SET deletedAt = ?, deletedBy = ? WHERE id = ?").run(now, deletedBy, id);
  db.prepare("INSERT INTO deletionHistory (id, type, name, deletedBy, date) VALUES (?, ?, ?, ?, ?)").run(
    Date.now().toString(), 'Tarefa', task.title, deletedBy, now
  );
  
  res.json({ success: true });
});

// History
app.get('/api/history', (req, res) => {
  const history = db.prepare("SELECT * FROM deletionHistory ORDER BY date DESC").all();
  res.json(history);
});

app.get('/api/update-history', (req, res) => {
  const updates = db.prepare("SELECT * FROM updateHistory ORDER BY date DESC").all().map(u => ({
    ...u,
    changes: parseJSON(u.changes, {})
  }));
  res.json(updates);
});

// Notifications
app.get('/api/notifications', (req, res) => {
  const notifs = db.prepare("SELECT * FROM notifications ORDER BY createdAt DESC").all().map(n => ({
    ...n,
    read: Boolean(n.read),
    priority: Boolean(n.priority),
    userIds: parseJSON(n.userIds, [])
  }));
  res.json(notifs);
});

app.post('/api/notifications', (req, res) => {
  const n = req.body;
  const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
  const createdAt = new Date().toISOString();
  const isPriority = n.priority ? 1 : 0;
  
  db.prepare("INSERT INTO notifications (id, title, message, taskId, userIds, createdAt, read, priority) VALUES (?, ?, ?, ?, ?, ?, 0, ?)")
    .run(id, n.title, n.message, n.taskId, JSON.stringify(n.userIds || []), createdAt, isPriority);
  
  res.status(201).json({ id });
});

app.put('/api/notifications/:id/read', (req, res) => {
  const info = db.prepare("UPDATE notifications SET read = 1 WHERE id = ?").run(req.params.id);
  if (info.changes > 0) res.json({ success: true });
  else res.status(404).json({ error: 'Notification not found' });
});

// ── Attachments ─────────────────────────────────────────────────────────────

app.post('/api/tasks/:id/attachments', upload.single('file'), (req, res) => {
  try {
    const taskId = req.params.id;
    const task = db.prepare("SELECT attachments FROM tasks WHERE id = ?").get(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    const isImage = req.file.mimetype.startsWith('image/');
    let attachment;

    if (isImage) {
      const fileData = fs.readFileSync(req.file.path);
      const base64 = `data:${req.file.mimetype};base64,${fileData.toString('base64')}`;
      fs.unlinkSync(req.file.path); 
      attachment = {
        id: `att_${Date.now()}`,
        name: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size,
        data: base64,
        uploadedBy: req.body.uploadedBy || 'Usuário',
        uploadedAt: new Date().toISOString()
      };
    } else {
      attachment = {
        id: `att_${Date.now()}`,
        name: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size,
        url: `/uploads/${req.file.filename}`,
        filename: req.file.filename,
        uploadedBy: req.body.uploadedBy || 'Usuário',
        uploadedAt: new Date().toISOString()
      };
    }

    const attachments = parseJSON(task.attachments, []);
    attachments.push(attachment);
    
    db.prepare("UPDATE tasks SET attachments = ? WHERE id = ?").run(JSON.stringify(attachments), taskId);
    
    res.status(201).json(attachment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id/attachments/:attachmentId', (req, res) => {
  const taskId = req.params.id;
  const attachmentId = req.params.attachmentId;
  
  const task = db.prepare("SELECT attachments FROM tasks WHERE id = ?").get(taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const attachments = parseJSON(task.attachments, []);
  const attIndex = attachments.findIndex(a => a.id === attachmentId);
  if (attIndex === -1) return res.status(404).json({ error: 'Attachment not found' });

  const att = attachments[attIndex];
  if (att.filename) {
    const filePath = path.join(uploadsDir, att.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  attachments.splice(attIndex, 1);
  db.prepare("UPDATE tasks SET attachments = ? WHERE id = ?").run(JSON.stringify(attachments), taskId);
  
  res.json({ success: true });
});

// Settings
app.get('/api/settings', (req, res) => {
  const settings = db.prepare("SELECT * FROM settings").all();
  res.json(settings);
});

app.put('/api/settings/:key', (req, res) => {
  const key = req.params.key;
  const { value } = req.body;
  
  // Insert or Replace
  const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
  stmt.run(key, JSON.stringify(value));
  
  res.json({ success: true });
});

// Middleware de erro do Multer
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Arquivo muito grande. Limite de 5 MB.' });
  }
  res.status(400).json({ error: err.message || 'Erro no upload.' });
});

const PORT = 3000;

// Configurações - Validar Senha
app.post('/api/settings/validate-password', (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Senha é obrigatória.' });
  }
  const expectedHash = '8338c7865ec139c2311be2a6ca6f3dc60781632ed698cc3be6110f82c7a7e094';
  const inputHash = crypto.createHash('sha256').update(password).digest('hex');
  if (inputHash !== expectedHash) {
    return res.status(403).json({ error: 'Senha incorreta.' });
  }
  res.json({ success: true });
});

// Configurações - Limpar Banco de Dados
app.post('/api/settings/clear-db', (req, res) => {
  const { password, currentUserId } = req.body;
  if (!password || !currentUserId) {
    return res.status(400).json({ error: 'Senha e ID do usuário são obrigatórios.' });
  }

  // Hash SHA-256 de "jingjjang" gerado antecipadamente:
  // crypto.createHash('sha256').update('jingjjang').digest('hex')
  const expectedHash = '8338c7865ec139c2311be2a6ca6f3dc60781632ed698cc3be6110f82c7a7e094';
  const inputHash = crypto.createHash('sha256').update(password).digest('hex');

  if (inputHash !== expectedHash) {
    return res.status(403).json({ error: 'Senha incorreta.' });
  }

  try {
    // Inicia uma transação para garantir que apaga tudo ou nada
    const clearTransaction = db.transaction(() => {
      db.prepare("DELETE FROM tasks").run();
      db.prepare("DELETE FROM notifications").run();
      db.prepare("DELETE FROM deletionHistory").run();
      db.prepare("DELETE FROM departments").run();
      // Deleta todos os usuários, EXCETO o usuário atual para evitar logout
      db.prepare("DELETE FROM users WHERE id != ?").run(currentUserId);
    });

    clearTransaction();
    res.json({ success: true });
  } catch (err) {
    console.error("Erro ao limpar o banco de dados:", err);
    res.status(500).json({ error: 'Erro interno ao limpar a base de dados.' });
  }
});

// ── Agendador de Verificação de Prazo de Tarefas ─────────────────────────────
// Executa a cada 15 segundos para facilitar o teste local
setInterval(() => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Busca tarefas não deletadas, não concluídas/arquivadas, cuja data limite chegou/passou
    // e que ainda não tiveram notificação enviada
    const overdueTasks = db.prepare(`
      SELECT * FROM tasks 
      WHERE deletedAt IS NULL 
        AND status NOT IN ('done', 'archived') 
        AND dueDate <= ? 
        AND dueDateNotified = 0
    `).all(today);

    for (const task of overdueTasks) {
      const assignedIds = task.assignedToIds ? JSON.parse(task.assignedToIds) : [];
      const involvedIds = new Set(assignedIds);
      if (task.createdById) involvedIds.add(task.createdById);
      
      const idsArray = Array.from(involvedIds);
      if (idsArray.length > 0) {
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const createdAt = new Date().toISOString();
        
        // Insere a notificação (prioridade 1 para alerta urgente)
        db.prepare("INSERT INTO notifications (id, title, message, taskId, userIds, createdAt, read, priority) VALUES (?, ?, ?, ?, ?, ?, 0, 1)")
          .run(id, "Prazo da Tarefa Expirado!", `O prazo da tarefa "${task.title}" chegou. Por favor, verifique o status.`, task.id, JSON.stringify(idsArray), createdAt);
      }
      
      // Marca como notificado para não spammar
      db.prepare("UPDATE tasks SET dueDateNotified = 1 WHERE id = ?").run(task.id);
    }
  } catch (err) {
    console.error("Erro no job de verificação de prazo:", err);
  }
}, 15 * 1000);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor API rodando na porta ${PORT}`);
});
