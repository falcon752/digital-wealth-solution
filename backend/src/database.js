const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const DB_PATH = process.env.DB_PATH || './database.sqlite';

let db;

function getDB() {
  if (!db) {
    db = new DatabaseSync(path.resolve(DB_PATH));
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA foreign_keys = ON");
  }
  return db;
}

async function initDB() {
  const database = getDB();

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      isActive INTEGER NOT NULL DEFAULT 1,
      antiPhishingPhrase TEXT,
      twoFactorSecret TEXT,
      twoFactorEnabled INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS balances (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL UNIQUE,
      totalUSD REAL NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      symbol TEXT NOT NULL UNIQUE,
      walletAddress TEXT NOT NULL,
      qrCodeImage TEXT,
      network TEXT,
      minDeposit REAL DEFAULT 0,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS deposits (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      assetId TEXT NOT NULL,
      amount REAL NOT NULL,
      usdValue REAL,
      txHash TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      adminNote TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      confirmedAt TEXT,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (assetId) REFERENCES assets(id)
    );

    CREATE TABLE IF NOT EXISTS withdrawals (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      assetId TEXT NOT NULL,
      amount REAL NOT NULL,
      usdValue REAL,
      destinationAddress TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      adminNote TEXT,
      otpCode TEXT,
      otpExpiry TEXT,
      twoFactorVerified INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      processedAt TEXT,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (assetId) REFERENCES assets(id)
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      userId TEXT,
      action TEXT NOT NULL,
      details TEXT,
      ipAddress TEXT,
      userAgent TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // Seed admin user if not exists
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@digitalwealthsolution.com';
  const adminExists = database.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);

  if (!adminExists) {
    const adminId = uuidv4();
    const hashedPassword = await bcrypt.hash(
      process.env.ADMIN_PASSWORD || 'Admin@SecurePass123',
      12
    );
    database.prepare(`
      INSERT INTO users (id, email, password, firstName, lastName, role)
      VALUES (?, ?, ?, ?, ?, 'admin')
    `).run(
      adminId,
      adminEmail,
      hashedPassword,
      process.env.ADMIN_FIRST_NAME || 'Super',
      process.env.ADMIN_LAST_NAME || 'Admin'
    );
    database.prepare(`
      INSERT INTO balances (id, userId) VALUES (?, ?)
    `).run(uuidv4(), adminId);
    console.log(`Admin user seeded: ${adminEmail}`);
  }

  console.log('Database initialized successfully');
  return database;
}

module.exports = { getDB, initDB };
