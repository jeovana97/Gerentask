import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFilePath = path.join(__dirname, 'database.db');
const jsonFilePath = path.join(__dirname, 'database.json');

const db = new Database(dbFilePath);
db.pragma('journal_mode = WAL'); // Para melhor performance

// Criar tabelas se não existirem
db.exec(`
  CREATE TABLE IF NOT EXISTS jobTitles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    accessLevel TEXT NOT NULL,
    deletedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    deletedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    departmentId TEXT,
    verified INTEGER DEFAULT 0,
    approved INTEGER DEFAULT 0,
    deletedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT,
    priority TEXT,
    dueDate TEXT,
    departmentId TEXT,
    assignedToIds TEXT,
    isPersonal INTEGER DEFAULT 0,
    createdAt TEXT,
    createdById TEXT,
    createdBy TEXT,
    approvalStatus TEXT,
    comments TEXT,
    attachments TEXT,
    deletedAt TEXT,
    dueDateNotified INTEGER DEFAULT 0,
    ccIds TEXT
  );

  CREATE TABLE IF NOT EXISTS deletionHistory (
    id TEXT PRIMARY KEY,
    type TEXT,
    name TEXT,
    deletedBy TEXT,
    date TEXT
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    title TEXT,
    message TEXT,
    taskId TEXT,
    userIds TEXT,
    createdAt TEXT,
    read INTEGER DEFAULT 0,
    priority INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS updateHistory (
    id TEXT PRIMARY KEY,
    type TEXT,
    entityId TEXT,
    entityName TEXT,
    changedBy TEXT,
    date TEXT,
    changes TEXT
  );

  CREATE TABLE IF NOT EXISTS insertionHistory (
    id TEXT PRIMARY KEY,
    type TEXT,
    entityId TEXT,
    entityName TEXT,
    createdBy TEXT,
    date TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

try {
  db.prepare('ALTER TABLE users ADD COLUMN jobTitleId TEXT;').run();
} catch (e) {
  // Column already exists
}

try {
  db.prepare('ALTER TABLE tasks ADD COLUMN deletedBy TEXT;').run();
} catch (e) {
  // Column already exists
}

try {
  db.prepare('ALTER TABLE tasks ADD COLUMN rejectionReason TEXT;').run();
} catch (e) {
  // Column already exists
}

// Função de migração do database.json antigo para o SQLite
const migrateData = () => {
  const stmt = db.prepare("SELECT count(*) as count FROM users");
  const count = stmt.get().count;
  
  if (count === 0 && fs.existsSync(jsonFilePath)) {
    console.log("Migrando dados do database.json para o SQLite...");
    try {
      const data = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
      
      const insertDept = db.prepare("INSERT INTO departments (id, name, description, deletedAt) VALUES (?, ?, ?, ?)");
      for (const d of (data.departments || [])) {
        insertDept.run(d.id, d.name, d.description, d.deletedAt || null);
      }

      const insertUser = db.prepare("INSERT INTO users (id, name, email, password, role, departmentId, verified, approved, deletedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
      for (const u of (data.users || [])) {
        insertUser.run(u.id, u.name, u.email, u.password, u.role, u.departmentId, u.verified ? 1 : 0, u.approved ? 1 : 0, u.deletedAt || null);
      }

      const insertTask = db.prepare(`
        INSERT INTO tasks (
          id, title, description, status, priority, dueDate, departmentId,
          assignedToIds, isPersonal, createdAt, createdById, createdBy,
          approvalStatus, comments, attachments, deletedAt, ccIds
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const t of (data.tasks || [])) {
        const assignedToIds = t.assignedToIds ? JSON.stringify(t.assignedToIds) : (t.assignedToId ? JSON.stringify([t.assignedToId]) : '[]');
        const comments = typeof t.comments === 'string' ? t.comments : JSON.stringify(t.comments || []);
        const attachments = typeof t.attachments === 'string' ? t.attachments : JSON.stringify(t.attachments || []);
        const ccIds = Array.isArray(t.ccIds) ? JSON.stringify(t.ccIds) : (t.ccIds || '[]');
        
        insertTask.run(
          t.id, t.title, t.description, t.status, t.priority, t.dueDate, t.departmentId,
          assignedToIds, t.isPersonal ? 1 : 0, t.createdAt, t.createdById, t.createdBy,
          t.approvalStatus, comments, attachments, t.deletedAt || null, ccIds
        );
      }

      const insertHistory = db.prepare("INSERT INTO deletionHistory (id, type, name, deletedBy, date) VALUES (?, ?, ?, ?, ?)");
      for (const h of (data.deletionHistory || [])) {
        insertHistory.run(h.id, h.type, h.name, h.deletedBy, h.date);
      }

      const insertNotif = db.prepare("INSERT INTO notifications (id, title, message, taskId, userIds, createdAt, read, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
      for (const n of (data.notifications || [])) {
        insertNotif.run(n.id, n.title, n.message, n.taskId, JSON.stringify(n.userIds || []), n.createdAt, n.read ? 1 : 0, 0);
      }

      console.log("Migração concluída com sucesso!");
    } catch (err) {
      console.error("Erro durante a migração:", err);
    }
  }
};

migrateData();

// Migração: Adicionar coluna priority na tabela notifications (caso já exista)
try {
  db.exec("ALTER TABLE notifications ADD COLUMN priority INTEGER DEFAULT 0");
  console.log("Coluna 'priority' adicionada à tabela notifications.");
} catch (e) {
  // Ignora se a coluna já existir
}

try {
  db.exec("ALTER TABLE tasks ADD COLUMN dueDateNotified INTEGER DEFAULT 0");
  console.log("Coluna 'dueDateNotified' adicionada à tabela tasks.");
} catch (e) {
  // Ignora se a coluna já existir
}

try {
  db.exec("ALTER TABLE tasks ADD COLUMN ccIds TEXT");
  console.log("Coluna 'ccIds' adicionada à tabela tasks.");
} catch (e) {
  // Ignora se a coluna já existir
}

export default db;
