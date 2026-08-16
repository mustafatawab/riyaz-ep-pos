import Database from "better-sqlite3";
import path from "path";
import os from "os";
import fs from "fs";
import crypto from "crypto";

const DATA_DIR = process.env.RIYAZ_DATA_DIR || path.join(os.homedir(), ".riyaz-enterprise");
const DB_PATH = process.env.RIYAZ_DB_PATH || path.join(DATA_DIR, "riyaz-pos.db");

let db = null;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getDbPath() {
  return DB_PATH;
}

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      recovery_hash TEXT,
      recovery_used INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      barcode TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      company TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      distributor_id TEXT,
      purchase_price REAL NOT NULL DEFAULT 0,
      sale_price REAL NOT NULL DEFAULT 0,
      markup_percent REAL NOT NULL DEFAULT 0,
      stock_qty REAL NOT NULL DEFAULT 0,
      pack_size REAL NOT NULL DEFAULT 1,
      expiry TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS product_prices (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      label TEXT,
      purchase_price REAL NOT NULL DEFAULT 0,
      sale_price REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      customer_id TEXT,
      subtotal REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      amount_paid REAL NOT NULL DEFAULT 0,
      change REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'paid',
      is_payment INTEGER NOT NULL DEFAULT 0,
      return_count INTEGER NOT NULL DEFAULT 0,
      invoice_number TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      barcode TEXT NOT NULL DEFAULT '',
      quantity REAL NOT NULL DEFAULT 0,
      unit_price REAL NOT NULL DEFAULT 0,
      subtotal REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS arrears (
      id TEXT PRIMARY KEY,
      sale_id TEXT,
      customer_id TEXT,
      total_bill REAL NOT NULL DEFAULT 0,
      amount_paid REAL NOT NULL DEFAULT 0,
      balance_due REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS arrear_payments (
      id TEXT PRIMARY KEY,
      arrear_id TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      payment_sale_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (arrear_id) REFERENCES arrears(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS stock (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      distributor_id TEXT,
      company_id TEXT,
      supplier_id TEXT,
      invoice_number TEXT NOT NULL DEFAULT '',
      quantity REAL NOT NULL DEFAULT 0,
      purchase_price REAL NOT NULL DEFAULT 0,
      sale_price REAL NOT NULL DEFAULT 0,
      expiry TEXT,
      total_value REAL NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS distributors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      company_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      second_number TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      second_number TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS returns (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      refund_amount REAL NOT NULL DEFAULT 0,
      reason TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales(id)
    );

    CREATE TABLE IF NOT EXISTS return_items (
      id TEXT PRIMARY KEY,
      return_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      refund_amount REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '',
      amount REAL NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS barcodes (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      product_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS zakat_settings (
      id TEXT PRIMARY KEY,
      gold_rate REAL NOT NULL DEFAULT 0,
      silver_rate REAL NOT NULL DEFAULT 0,
      nisab_basis TEXT NOT NULL DEFAULT 'silver',
      inventory_value TEXT NOT NULL DEFAULT 'retail',
      deduct_liabilities INTEGER NOT NULL DEFAULT 1,
      zakat_rate REAL NOT NULL DEFAULT 0.025,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS zakat_calculations (
      id TEXT PRIMARY KEY,
      snapshot_date TEXT NOT NULL,
      hawl_start_date TEXT NOT NULL DEFAULT '',
      gold_rate REAL NOT NULL DEFAULT 0,
      silver_rate REAL NOT NULL DEFAULT 0,
      nisab_basis TEXT NOT NULL DEFAULT 'silver',
      nisab_amount REAL NOT NULL DEFAULT 0,
      inventory_value REAL NOT NULL DEFAULT 0,
      receivables REAL NOT NULL DEFAULT 0,
      cash_in_hand REAL NOT NULL DEFAULT 0,
      other_receivables REAL NOT NULL DEFAULT 0,
      other_assets REAL NOT NULL DEFAULT 0,
      liabilities REAL NOT NULL DEFAULT 0,
      deductions_enabled INTEGER NOT NULL DEFAULT 1,
      gross_assets REAL NOT NULL DEFAULT 0,
      total_liabilities REAL NOT NULL DEFAULT 0,
      net_zakatable REAL NOT NULL DEFAULT 0,
      nisab_met INTEGER NOT NULL DEFAULT 0,
      zakat_due REAL NOT NULL DEFAULT 0,
      items_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
    CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
    CREATE INDEX IF NOT EXISTS idx_arrears_customer ON arrears(customer_id);
    CREATE INDEX IF NOT EXISTS idx_product_prices_product ON product_prices(product_id);
  `);

  ensureSalesInvoiceNumbers();
  ensureSuppliers();
  ensureZakat();
}

function tableHasColumn(table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column);
}

function localYmd(isoOrDate) {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate || Date.now());
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function nextInvoiceNumber(createdAtIso) {
  const ymd = localYmd(createdAtIso || new Date().toISOString());
  const prefix = `INV-${ymd}-`;
  const row = db
    .prepare(
      `SELECT invoice_number FROM sales
       WHERE invoice_number LIKE ?
       ORDER BY invoice_number DESC
       LIMIT 1`,
    )
    .get(`${prefix}%`);
  let seq = 1;
  if (row && row.invoice_number) {
    const n = parseInt(String(row.invoice_number).split("-").pop(), 10);
    if (Number.isFinite(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

function backfillInvoiceNumbers() {
  const rows = db
    .prepare(
      `SELECT id, created_at FROM sales
       WHERE is_payment = 0 AND (invoice_number IS NULL OR invoice_number = '')
       ORDER BY created_at ASC, id ASC`,
    )
    .all();
  if (!rows.length) return;

  const counters = {};
  const existing = db
    .prepare(
      `SELECT invoice_number FROM sales
       WHERE invoice_number LIKE 'INV-%'
       ORDER BY invoice_number ASC`,
    )
    .all();
  for (const row of existing) {
    const parts = String(row.invoice_number).split("-");
    if (parts.length < 3) continue;
    const ymd = parts[1];
    const n = parseInt(parts[parts.length - 1], 10);
    if (!Number.isFinite(n)) continue;
    counters[ymd] = Math.max(counters[ymd] || 0, n);
  }

  const update = db.prepare("UPDATE sales SET invoice_number = ? WHERE id = ?");
  const assign = db.transaction(() => {
    for (const row of rows) {
      const ymd = localYmd(row.created_at);
      counters[ymd] = (counters[ymd] || 0) + 1;
      update.run(`INV-${ymd}-${String(counters[ymd]).padStart(4, "0")}`, row.id);
    }
  });
  assign();
}

function ensureSalesInvoiceNumbers() {
  if (!tableHasColumn("sales", "invoice_number")) {
    db.exec(`ALTER TABLE sales ADD COLUMN invoice_number TEXT NOT NULL DEFAULT ''`);
  }
  backfillInvoiceNumbers();
  db.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_invoice_number
     ON sales(invoice_number) WHERE invoice_number != ''`,
  );
}

function ensureSuppliers() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      second_number TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
  `);

  if (!tableHasColumn("stock", "supplier_id")) {
    db.exec(`ALTER TABLE stock ADD COLUMN supplier_id TEXT`);
  }

  const supplierCount = db.prepare("SELECT COUNT(*) AS c FROM suppliers").get().c;
  if (supplierCount === 0) {
    const companies = db.prepare("SELECT id, name, phone, address, second_number, created_at FROM companies").all();
    const insert = db.prepare(
      "INSERT OR IGNORE INTO suppliers (id, name, phone, address, second_number, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    );
    for (const c of companies) {
      insert.run(c.id, c.name, c.phone || "", c.address || "", c.second_number || "", c.created_at || now());
    }
    const distributors = db.prepare("SELECT id, name, phone, created_at FROM distributors").all();
    for (const d of distributors) {
      insert.run(d.id, d.name, d.phone || "", "", "", d.created_at || now());
    }
  }

  db.exec(`
    UPDATE stock
    SET supplier_id = COALESCE(NULLIF(supplier_id, ''), company_id, distributor_id)
    WHERE supplier_id IS NULL OR supplier_id = ''
  `);
}

function ensureZakat() {
  const count = db.prepare("SELECT COUNT(*) AS c FROM zakat_settings").get().c;
  if (count === 0) {
    db.prepare(
      "INSERT INTO zakat_settings (id, gold_rate, silver_rate, nisab_basis, inventory_value, deduct_liabilities, zakat_rate, updated_at) VALUES (?, 0, 0, 'silver', 'retail', 1, 0.025, ?)",
    ).run("default", now());
  }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  const candidate = crypto.scryptSync(String(password), salt, 64).toString("hex");
  const a = Buffer.from(candidate, "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function seedAdmin() {
  const count = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
  if (count > 0) return;
  const { salt, hash } = hashPassword("admin123");
  db.prepare(
    "INSERT INTO users (id, username, password_salt, password_hash, role, recovery_used, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)",
  ).run(crypto.randomUUID(), "admin", salt, hash, "admin", new Date().toISOString());
}

function initDb() {
  if (db) return db;
  ensureDir();
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate();
  seedAdmin();
  return db;
}

function getDb() {
  return initDb();
}

function reloadDb() {
  if (db) {
    try {
      db.close();
    } catch (_) {}
    db = null;
  }
  return initDb();
}

const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();

/* ------------------------- helpers ------------------------- */

function rowToProduct(row) {
  if (!row) return null;
  return { ...row };
}

const PRODUCT_SELECT = `
  SELECT id, barcode, name, company, category, location, distributor_id,
         sale_price, purchase_price, markup_percent, stock_qty,
         expiry, active, created_at
  FROM products
`;

function getCustomerSummary(customerId) {
  return getDb()
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM sales s WHERE s.customer_id = ? AND s.is_payment = 0) AS total_purchases,
         (SELECT COALESCE(SUM(balance_due), 0) FROM arrears a WHERE a.customer_id = ? AND a.status = 'pending') AS outstanding_arrear,
         (SELECT MAX(created_at) FROM sales s WHERE s.customer_id = ? AND s.is_payment = 0) AS last_purchase
       `,
    )
    .get(customerId, customerId, customerId);
}

function rowToCustomer(row) {
  if (!row) return null;
  const summary = getCustomerSummary(row.id);
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    created_at: row.created_at,
    total_purchases: summary.total_purchases,
    outstanding_arrear: summary.outstanding_arrear,
    last_purchase: summary.last_purchase,
  };
}

function getSaleById(id) {
  const row = getDb()
    .prepare(
      `SELECT s.*, c.name AS customer_name FROM sales s LEFT JOIN customers c ON c.id = s.customer_id WHERE s.id = ?`,
    )
    .get(id);
  if (!row) return null;
  const items = getDb()
    .prepare(
      `SELECT id, sale_id, product_id, product_name, barcode, quantity, unit_price, subtotal FROM sale_items WHERE sale_id = ?`,
    )
    .all(id);
  return { ...row, items };
}

function getArrear(id) {
  const row = getDb()
    .prepare(
      `SELECT a.*, c.name AS customer_name FROM arrears a LEFT JOIN customers c ON c.id = a.customer_id WHERE a.id = ?`,
    )
    .get(id);
  if (!row) return null;
  const payments = getDb()
    .prepare(
      `SELECT id, amount, payment_sale_id, created_at FROM arrear_payments WHERE arrear_id = ? ORDER BY created_at ASC`,
    )
    .all(id);
  return { ...row, payments };
}

function insertArrear({ customerId, totalBill, amountPaid, saleId }) {
  const id = uid();
  const createdAt = now();
  const paid = amountPaid || 0;
  const balance = totalBill - paid;
  const status = balance <= 0 ? "settled" : "pending";
  getDb()
    .prepare(
      `INSERT INTO arrears (id, sale_id, customer_id, total_bill, amount_paid, balance_due, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, saleId || null, customerId, totalBill, paid, balance, status, createdAt);
  if (paid > 0) {
    getDb()
      .prepare(
        `INSERT INTO arrear_payments (id, arrear_id, amount, payment_sale_id, created_at) VALUES (?, ?, ?, ?, ?)`,
      )
      .run(uid(), id, paid, null, createdAt);
  }
  return getArrear(id);
}

/* ------------------------- auth ------------------------- */

function login(username, password) {
  const user = getDb().prepare("SELECT * FROM users WHERE username = ?").get(String(username || "").trim());
  if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
    throw new Error("Invalid username or password");
  }
  return { user: { id: user.id, username: user.username, role: user.role } };
}

function logout() {
  return { success: true };
}

function verifyAdminPassword(password) {
  const admin = getDb().prepare("SELECT * FROM users WHERE role = 'admin'").all();
  for (const user of admin) {
    if (verifyPassword(password, user.password_salt, user.password_hash)) return true;
  }
  return false;
}

function verifyPasswordFn(password) {
  return { valid: verifyAdminPassword(password) };
}

function generateRecoveryKey() {
  const words = ["aurora", "delta", "falcon", "harbor", "juniper", "lambda", "nimbus", "orbit", "pixel", "quartz", "sierra", "tundra"];
  const phrase = Array.from({ length: 5 }, () => words[Math.floor(Math.random() * words.length)]).join("-");
  const admin = getDb().prepare("SELECT * FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1").get();
  if (!admin) throw new Error("No admin user found");
  const { salt, hash } = hashPassword(phrase);
  getDb()
    .prepare("UPDATE users SET recovery_hash = ?, recovery_used = 0 WHERE id = ?")
    .run(`${salt}:${hash}`, admin.id);
  return { phrase };
}

function recoverPassword(phrase, newPassword) {
  const admin = getDb().prepare("SELECT * FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1").get();
  if (!admin) return { success: false, error: "No admin user found" };
  if (!admin.recovery_hash || admin.recovery_used) {
    return { success: false, error: "Recovery key is invalid or already used" };
  }
  const [salt, hash] = admin.recovery_hash.split(":");
  if (!salt || !hash || !verifyPassword(phrase, salt, hash)) {
    return { success: false, error: "Invalid recovery key" };
  }
  const { salt: newSalt, hash: newHash } = hashPassword(newPassword);
  getDb()
    .prepare("UPDATE users SET password_salt = ?, password_hash = ?, recovery_used = 1 WHERE id = ?")
    .run(newSalt, newHash, admin.id);
  return { success: true };
}

/* ------------------------- categories ------------------------- */

function listCategories() {
  return getDb().prepare("SELECT id, name, created_at FROM categories ORDER BY name COLLATE NOCASE ASC").all();
}

function createCategory(input) {
  const id = uid();
  getDb().prepare("INSERT INTO categories (id, name, created_at) VALUES (?, ?, ?)").run(id, input.name, now());
  return getDb().prepare("SELECT id, name, created_at FROM categories WHERE id = ?").get(id);
}

function updateCategory(id, input) {
  getDb().prepare("UPDATE categories SET name = ? WHERE id = ?").run(input.name, id);
  return getDb().prepare("SELECT id, name, created_at FROM categories WHERE id = ?").get(id);
}

function deleteCategory(id) {
  getDb().prepare("DELETE FROM categories WHERE id = ?").run(id);
  return { success: true };
}

/* ------------------------- products ------------------------- */

function listProducts(includeArchived) {
  const sql = includeArchived ? PRODUCT_SELECT : `${PRODUCT_SELECT} WHERE active = 1`;
  const rows = getDb().prepare(`${sql} ORDER BY name COLLATE NOCASE ASC`).all();
  return rows.map(rowToProduct);
}

function searchProducts(q) {
  const like = `%${q}%`;
  const rows = getDb()
    .prepare(
      `${PRODUCT_SELECT} WHERE active = 1 AND (name LIKE ? OR barcode LIKE ? OR category LIKE ? OR company LIKE ? OR location LIKE ?) ORDER BY name COLLATE NOCASE ASC LIMIT 50`,
    )
    .all(like, like, like, like, like);
  return rows.map(rowToProduct);
}

function getProductByBarcode(barcode) {
  const row = getDb().prepare(`${PRODUCT_SELECT} WHERE barcode = ?`).get(barcode);
  if (!row) return null;
  return rowToProduct(row);
}

function computeMarkup(purchasePrice, salePrice) {
  if (!purchasePrice || !salePrice) return 0;
  return Math.round(((salePrice - purchasePrice) / purchasePrice) * 100);
}

function createProduct(input) {
  const id = uid();
  const createdAt = now();
  const purchasePrice = input.purchasePrice || 0;
  const salePrice = input.salePrice || 0;
  const markupPercent = input.markupPercent ?? computeMarkup(purchasePrice, salePrice);
  getDb()
    .prepare(
      `INSERT INTO products (id, barcode, name, company, category, location, distributor_id, purchase_price, sale_price, markup_percent, stock_qty, pack_size, expiry, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, 1, ?)`,
    )
    .run(
      id,
      input.barcode,
      input.name,
      input.company || "",
      input.category || "",
      input.location || "",
      input.distributorId || null,
      purchasePrice,
      salePrice,
      markupPercent,
      input.expiry || null,
      createdAt,
    );
  upsertBarcode(input.barcode, id);
  const row = getDb().prepare(`${PRODUCT_SELECT} WHERE id = ?`).get(id);
  return rowToProduct(row);
}

function updateProduct(id, input) {
  const purchasePrice = input.purchasePrice || 0;
  const salePrice = input.salePrice || 0;
  const markupPercent = input.markupPercent ?? computeMarkup(purchasePrice, salePrice);
  getDb()
    .prepare(
      `UPDATE products SET barcode = ?, name = ?, company = ?, category = ?, location = ?, distributor_id = ?,
         purchase_price = ?, sale_price = ?, markup_percent = ?, pack_size = 1, expiry = ?
       WHERE id = ?`,
    )
    .run(
      input.barcode,
      input.name,
      input.company || "",
      input.category || "",
      input.location || "",
      input.distributorId || null,
      purchasePrice,
      salePrice,
      markupPercent,
      input.expiry || null,
      id,
    );
  getDb().prepare("DELETE FROM product_prices WHERE product_id = ?").run(id);
  upsertBarcode(input.barcode, id);
  const row = getDb().prepare(`${PRODUCT_SELECT} WHERE id = ?`).get(id);
  return rowToProduct(row);
}

function archiveProduct(id) {
  getDb().prepare("UPDATE products SET active = 0 WHERE id = ?").run(id);
  return { success: true };
}

function restoreProduct(id) {
  getDb().prepare("UPDATE products SET active = 1 WHERE id = ?").run(id);
  return { success: true };
}

function upsertBarcode(code, productId) {
  if (!code) return;
  const existing = getDb().prepare("SELECT id FROM barcodes WHERE code = ?").get(code);
  if (existing) {
    getDb().prepare("UPDATE barcodes SET product_id = ? WHERE id = ?").run(productId, existing.id);
  } else {
    getDb().prepare("INSERT INTO barcodes (id, code, product_id, created_at) VALUES (?, ?, ?, ?)").run(uid(), code, productId, now());
  }
}

/* ------------------------- customers ------------------------- */

function listCustomers() {
  const rows = getDb().prepare("SELECT id, name, phone, address, created_at FROM customers ORDER BY name COLLATE NOCASE ASC").all();
  return rows.map(rowToCustomer);
}

function searchCustomers(q) {
  const like = `%${q}%`;
  const rows = getDb()
    .prepare("SELECT id, name, phone, address, created_at FROM customers WHERE name LIKE ? OR phone LIKE ? ORDER BY name COLLATE NOCASE ASC LIMIT 50")
    .all(like, like);
  return rows.map(rowToCustomer);
}

function getCustomer(id) {
  const row = getDb().prepare("SELECT id, name, phone, address, created_at FROM customers WHERE id = ?").get(id);
  if (!row) return null;
  const customer = rowToCustomer(row);
  const purchases = getDb()
    .prepare(
      `SELECT s.id, s.customer_id, s.subtotal, s.discount, s.total, s.amount_paid, s.change, s.status, s.invoice_number, s.created_at,
              (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) AS item_count
       FROM sales s WHERE s.customer_id = ? AND s.is_payment = 0 ORDER BY s.created_at DESC`,
    )
    .all(id);
  for (const p of purchases) {
    p.items = getDb()
      .prepare(`SELECT id, sale_id, product_id, product_name, barcode, quantity, unit_price, subtotal FROM sale_items WHERE sale_id = ?`)
      .all(p.id);
  }
  const arrears = getDb()
    .prepare("SELECT id, sale_id, customer_id, total_bill, amount_paid, balance_due, status, created_at FROM arrears WHERE customer_id = ? ORDER BY created_at DESC")
    .all(id);
  for (const a of arrears) {
    a.customer_name = customer.name;
    a.payments = getDb()
      .prepare("SELECT id, amount, payment_sale_id, created_at FROM arrear_payments WHERE arrear_id = ? ORDER BY created_at ASC")
      .all(a.id);
  }
  return { ...customer, purchases, arrears };
}

function createCustomer(input) {
  const id = uid();
  getDb()
    .prepare("INSERT INTO customers (id, name, phone, address, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(id, input.name, input.phone || "", input.address || "", now());
  return getCustomer(id);
}

function updateCustomer(id, input) {
  getDb()
    .prepare("UPDATE customers SET name = ?, phone = ?, address = ? WHERE id = ?")
    .run(input.name, input.phone || "", input.address || "", id);
  return getCustomer(id);
}

function deleteCustomer(id, opts) {
  const force = opts && opts.force;
  const hasSales = getDb().prepare("SELECT COUNT(*) AS c FROM sales WHERE customer_id = ? AND is_payment = 0").get(id).c;
  const hasArrears = getDb().prepare("SELECT COUNT(*) AS c FROM arrears WHERE customer_id = ?").get(id).c;
  if ((hasSales > 0 || hasArrears > 0) && !force) {
    throw new Error("Customer has existing sales or arrears. Use force delete to remove them.");
  }
  getDb().transaction(() => {
    getDb().prepare("DELETE FROM arrears WHERE customer_id = ?").run(id);
    getDb().prepare("UPDATE sales SET customer_id = NULL WHERE customer_id = ?").run(id);
    getDb().prepare("DELETE FROM customers WHERE id = ?").run(id);
  })();
  return { success: true };
}

/* ------------------------- sales ------------------------- */

function createSale(input) {
  return getDb().transaction(() => {
    const id = uid();
    const createdAt = now();
    const invoiceNumber = nextInvoiceNumber(createdAt);
    const status = input.amountPaid >= input.total ? "paid" : "partial";
    const change = Math.max(0, input.amountPaid - input.total);
    getDb()
      .prepare(
        `INSERT INTO sales (id, customer_id, subtotal, discount, total, amount_paid, change, status, is_payment, return_count, invoice_number, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
      )
      .run(id, input.customerId || null, input.subtotal || 0, input.discount || 0, input.total, input.amountPaid, change, status, invoiceNumber, createdAt);

    for (const item of input.items || []) {
      getDb()
        .prepare(
          `INSERT INTO sale_items (id, sale_id, product_id, product_name, barcode, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(uid(), id, item.productId, item.productName, item.barcode || "", item.quantity, item.unitPrice || 0, item.subtotal || 0);
      getDb().prepare("UPDATE products SET stock_qty = MAX(0, stock_qty - ?) WHERE id = ?").run(item.quantity, item.productId);
      upsertBarcode(item.barcode, item.productId);
    }

    if (status === "partial" && input.customerId) {
      insertArrear({ customerId: input.customerId, totalBill: input.total, amountPaid: input.amountPaid, saleId: id });
    }

    const row = getDb()
      .prepare(
        `SELECT s.*, c.name AS customer_name FROM sales s LEFT JOIN customers c ON c.id = s.customer_id WHERE s.id = ?`,
      )
      .get(id);
    row.items = input.items || [];
    return row;
  })();
}

function listRecentSales(limit) {
  const rows = getDb()
    .prepare(
      `SELECT s.*, c.name AS customer_name,
              (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) AS item_count
       FROM sales s LEFT JOIN customers c ON c.id = s.customer_id
       WHERE s.is_payment = 0
       ORDER BY s.created_at DESC LIMIT ?`,
    )
    .all(limit || 10);
  return rows;
}

function listSales(opts) {
  opts = opts || {};
  const conditions = ["s.is_payment = 0"];
  const params = [];
  if (opts.search) {
    const like = `%${opts.search}%`;
    conditions.push(`(s.invoice_number LIKE ? OR s.id LIKE ? OR c.name LIKE ? OR EXISTS (SELECT 1 FROM sale_items si WHERE si.sale_id = s.id AND si.product_name LIKE ?))`);
    params.push(like, like, like, like);
  }
  if (opts.dateFrom) {
    conditions.push(`s.created_at >= ?`);
    params.push(`${opts.dateFrom}T00:00:00`);
  }
  if (opts.dateTo) {
    conditions.push(`s.created_at <= ?`);
    params.push(`${opts.dateTo}T23:59:59`);
  }
  return getDb()
    .prepare(
      `SELECT s.*, c.name AS customer_name,
              (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) AS item_count
       FROM sales s LEFT JOIN customers c ON c.id = s.customer_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY s.created_at DESC`,
    )
    .all(...params);
}

function searchSales(q) {
  return listSales({ search: q });
}

function listSalesByDate(dateStr, tzOffset) {
  const offsetMs = (Number(tzOffset) || 0) * 60000;
  const start = new Date(`${dateStr}T00:00:00`);
  const startUtc = new Date(start.getTime() - offsetMs).toISOString();
  const endUtc = new Date(start.getTime() + 86400000 - offsetMs).toISOString();
  return getDb()
    .prepare(
      `SELECT s.*, c.name AS customer_name FROM sales s LEFT JOIN customers c ON c.id = s.customer_id
       WHERE s.is_payment = 0 AND s.created_at >= ? AND s.created_at < ? ORDER BY s.created_at DESC`,
    )
    .all(startUtc, endUtc);
}

/* ------------------------- arrears ------------------------- */

function listArrears(status) {
  const rows = status
    ? getDb()
        .prepare(
          `SELECT a.*, c.name AS customer_name FROM arrears a LEFT JOIN customers c ON c.id = a.customer_id WHERE a.status = ? ORDER BY a.created_at DESC`,
        )
        .all(status)
    : getDb()
        .prepare(
          `SELECT a.*, c.name AS customer_name FROM arrears a LEFT JOIN customers c ON c.id = a.customer_id ORDER BY a.created_at DESC`,
        )
        .all();
  for (const r of rows) {
    r.payments = getDb()
      .prepare("SELECT id, amount, payment_sale_id, created_at FROM arrear_payments WHERE arrear_id = ? ORDER BY created_at ASC")
      .all(r.id);
  }
  return rows;
}

function createArrear(input) {
  if (!input.customerId) throw new Error("Customer is required");
  const arrear = insertArrear({ customerId: input.customerId, totalBill: input.totalBill, amountPaid: input.amountPaid || 0, saleId: input.saleId });
  return arrear;
}

function recordArrearPayment(arrearId, amount, password) {
  if (!verifyAdminPassword(password)) throw new Error("Incorrect admin password");
  if (!(amount > 0)) throw new Error("Payment amount must be greater than zero");
  return getDb().transaction(() => {
    const arrear = getArrear(arrearId);
    if (!arrear) throw new Error("Arrear not found");
    const newPaid = arrear.amount_paid + amount;
    const balance = Math.max(0, arrear.total_bill - newPaid);
    const status = balance <= 0 ? "settled" : "pending";
    getDb().prepare("UPDATE arrears SET amount_paid = ?, balance_due = ?, status = ? WHERE id = ?").run(newPaid, balance, status, arrearId);
    const paymentSaleId = uid();
    const createdAt = now();
    getDb()
      .prepare(
        `INSERT INTO sales (id, customer_id, subtotal, discount, total, amount_paid, change, status, is_payment, return_count, created_at)
         VALUES (?, ?, ?, 0, ?, ?, 0, 'paid', 1, 0, ?)`,
      )
      .run(paymentSaleId, arrear.customer_id, amount, amount, amount, createdAt);
    getDb()
      .prepare("INSERT INTO arrear_payments (id, arrear_id, amount, payment_sale_id, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(uid(), arrearId, amount, paymentSaleId, createdAt);
    return { arrear: getArrear(arrearId), paymentSaleId };
  })();
}

function settleArrear(arrearId, password) {
  if (!verifyAdminPassword(password)) throw new Error("Incorrect admin password");
  return getDb().transaction(() => {
    const arrear = getArrear(arrearId);
    if (!arrear) throw new Error("Arrear not found");
    const remaining = Math.max(0, arrear.balance_due);
    if (remaining <= 0) return { arrear: getArrear(arrearId), paymentSaleId: null };
    const paymentSaleId = uid();
    const createdAt = now();
    getDb().prepare("UPDATE arrears SET amount_paid = total_bill, balance_due = 0, status = 'settled' WHERE id = ?").run(arrearId);
    getDb()
      .prepare(
        `INSERT INTO sales (id, customer_id, subtotal, discount, total, amount_paid, change, status, is_payment, return_count, created_at)
         VALUES (?, ?, ?, 0, ?, ?, 0, 'paid', 1, 0, ?)`,
      )
      .run(paymentSaleId, arrear.customer_id, remaining, remaining, remaining, createdAt);
    getDb()
      .prepare("INSERT INTO arrear_payments (id, arrear_id, amount, payment_sale_id, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(uid(), arrearId, remaining, paymentSaleId, createdAt);
    return { arrear: getArrear(arrearId), paymentSaleId };
  })();
}

function deleteArrear(id) {
  getDb().prepare("DELETE FROM arrears WHERE id = ?").run(id);
  return { success: true };
}

/* ------------------------- stock ------------------------- */

function listStock() {
  return getDb()
    .prepare(
      `SELECT st.id, st.product_id, p.name AS product_name, st.supplier_id, s.name AS supplier_name,
              st.invoice_number, st.quantity,
              st.purchase_price, st.sale_price, st.expiry, st.total_value, st.active, st.created_at
       FROM stock st
       LEFT JOIN products p ON p.id = st.product_id
       LEFT JOIN suppliers s ON s.id = st.supplier_id
       ORDER BY st.created_at DESC`,
    )
    .all();
}

function createStock(input) {
  return getDb().transaction(() => {
    const product = getDb().prepare("SELECT * FROM products WHERE id = ?").get(input.productId);
    if (!product) throw new Error("Product not found");
    const quantity = Number(input.quantity) || 0;
    const purchasePrice = input.purchasePrice ?? product.purchase_price;
    const salePrice = input.salePrice ?? product.sale_price;
    const id = uid();
    getDb()
      .prepare(
        `INSERT INTO stock (id, product_id, supplier_id, invoice_number, quantity, purchase_price, sale_price, expiry, total_value, active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      )
      .run(id, input.productId, input.supplierId || null, input.invoiceNumber || "", quantity, purchasePrice, salePrice, input.expiry || null, quantity * purchasePrice, now());
    getDb().prepare("UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?").run(quantity, input.productId);
    return getDb().prepare("SELECT * FROM stock WHERE id = ?").get(id);
  })();
}

function updateStock(id, input) {
  return getDb().transaction(() => {
    const existing = getDb().prepare("SELECT * FROM stock WHERE id = ?").get(id);
    if (!existing) throw new Error("Stock entry not found");
    const product = getDb().prepare("SELECT * FROM products WHERE id = ?").get(input.productId);
    if (!product) throw new Error("Product not found");
    const quantity = Number(input.quantity) || 0;
    const purchasePrice = input.purchasePrice ?? product.purchase_price;
    const salePrice = input.salePrice ?? product.sale_price;
    getDb()
      .prepare(
        `UPDATE stock SET product_id = ?, supplier_id = ?, invoice_number = ?, quantity = ?,
           purchase_price = ?, sale_price = ?, expiry = ?, total_value = ?
         WHERE id = ?`,
      )
      .run(input.productId, input.supplierId || null, input.invoiceNumber || "", quantity, purchasePrice, salePrice, input.expiry || null, quantity * purchasePrice, id);
    getDb().prepare("UPDATE products SET stock_qty = MAX(0, stock_qty + ?) WHERE id = ?").run(quantity - existing.quantity, input.productId);
    return getDb().prepare("SELECT * FROM stock WHERE id = ?").get(id);
  })();
}

function deleteStock(id) {
  getDb().transaction(() => {
    const existing = getDb().prepare("SELECT * FROM stock WHERE id = ?").get(id);
    if (!existing) return;
    getDb().prepare("UPDATE stock SET active = 0 WHERE id = ?").run(id);
    getDb().prepare("UPDATE products SET stock_qty = MAX(0, stock_qty - ?) WHERE id = ?").run(existing.quantity, existing.product_id);
  })();
  return { success: true };
}

/* ------------------------- suppliers ------------------------- */

function listSuppliers() {
  return getDb()
    .prepare(
      `SELECT s.id, s.name, s.phone, s.address, s.second_number, s.created_at,
              (SELECT COUNT(*) FROM stock st WHERE st.supplier_id = s.id AND st.active = 1) AS stock_count
       FROM suppliers s
       ORDER BY s.name COLLATE NOCASE ASC`,
    )
    .all();
}

function createSupplier(input) {
  const id = uid();
  getDb()
    .prepare("INSERT INTO suppliers (id, name, phone, address, second_number, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, input.name, input.phone || "", input.address || "", input.second_number || "", now());
  return getDb().prepare("SELECT id, name, phone, address, second_number, created_at FROM suppliers WHERE id = ?").get(id);
}

function updateSupplier(id, input) {
  getDb()
    .prepare("UPDATE suppliers SET name = ?, phone = ?, address = ?, second_number = ? WHERE id = ?")
    .run(input.name, input.phone || "", input.address || "", input.second_number || "", id);
  return getDb().prepare("SELECT id, name, phone, address, second_number, created_at FROM suppliers WHERE id = ?").get(id);
}

function deleteSupplier(id) {
  const inUse = getDb().prepare("SELECT COUNT(*) AS c FROM stock WHERE supplier_id = ? AND active = 1").get(id).c;
  if (inUse > 0) throw new Error("Cannot delete supplier with active stock purchases");
  getDb().prepare("DELETE FROM suppliers WHERE id = ?").run(id);
  return { success: true };
}

/* ------------------------- returns ------------------------- */

function listReturns() {
  const rows = getDb()
    .prepare(
      `SELECT r.id, r.sale_id, s.invoice_number, c.name AS customer_name, r.refund_amount, r.reason, r.created_at
       FROM returns r LEFT JOIN sales s ON s.id = r.sale_id LEFT JOIN customers c ON c.id = s.customer_id
       ORDER BY r.created_at DESC`,
    )
    .all();
  for (const r of rows) {
    r.items = getDb()
      .prepare("SELECT product_name, quantity, refund_amount FROM return_items WHERE return_id = ?")
      .all(r.id);
  }
  return rows;
}

function getReturn(id) {
  const row = getDb()
    .prepare(
      `SELECT r.id, r.sale_id, s.invoice_number, c.name AS customer_name, r.refund_amount, r.reason, r.created_at
       FROM returns r LEFT JOIN sales s ON s.id = r.sale_id LEFT JOIN customers c ON c.id = s.customer_id
       WHERE r.id = ?`,
    )
    .get(id);
  if (!row) return null;
  row.items = getDb().prepare("SELECT product_name, quantity, refund_amount FROM return_items WHERE return_id = ?").all(row.id);
  return row;
}

function createReturn(input) {
  return getDb().transaction(() => {
    const sale = getDb().prepare("SELECT * FROM sales WHERE id = ?").get(input.saleId);
    if (!sale) throw new Error("Sale not found");
    if (sale.return_count > 0) throw new Error("This sale has already been returned");
    const id = uid();
    const createdAt = now();
    getDb()
      .prepare("INSERT INTO returns (id, sale_id, refund_amount, reason, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(id, input.saleId, input.refundAmount || 0, input.reason || "", createdAt);
    for (const item of input.items || []) {
      getDb()
        .prepare("INSERT INTO return_items (id, return_id, product_id, product_name, quantity, refund_amount) VALUES (?, ?, ?, ?, ?, ?)")
        .run(uid(), id, item.productId, item.productName || "", item.quantity || 0, item.refundAmount || 0);
      getDb().prepare("UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?").run(item.quantity || 0, item.productId);
    }
    getDb().prepare("UPDATE sales SET return_count = 1 WHERE id = ?").run(input.saleId);
    const customer = sale.customer_id ? getDb().prepare("SELECT name FROM customers WHERE id = ?").get(sale.customer_id) : null;
    return {
      id,
      sale_id: input.saleId,
      customer_name: customer ? customer.name : null,
      refund_amount: input.refundAmount || 0,
      reason: input.reason || "",
      created_at: createdAt,
      items: (input.items || []).map((i) => ({ product_name: i.productName, quantity: i.quantity, refund_amount: i.refundAmount })),
    };
  })();
}

/* ------------------------- expenses ------------------------- */

function listExpenses() {
  return getDb().prepare("SELECT id, title, category, amount, notes, date, created_at FROM expenses ORDER BY date DESC, created_at DESC").all();
}

function createExpense(input) {
  const id = uid();
  getDb()
    .prepare("INSERT INTO expenses (id, title, category, amount, notes, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(id, input.title, input.category || "", input.amount || 0, input.notes || "", input.date, now());
  return getDb().prepare("SELECT id, title, category, amount, notes, date, created_at FROM expenses WHERE id = ?").get(id);
}

function updateExpense(id, input) {
  getDb()
    .prepare("UPDATE expenses SET title = ?, category = ?, amount = ?, notes = ?, date = ? WHERE id = ?")
    .run(input.title, input.category || "", input.amount || 0, input.notes || "", input.date, id);
  return getDb().prepare("SELECT id, title, category, amount, notes, date, created_at FROM expenses WHERE id = ?").get(id);
}

function deleteExpense(id) {
  getDb().prepare("DELETE FROM expenses WHERE id = ?").run(id);
  return { success: true };
}

/* ------------------------- barcodes ------------------------- */

function listBarcodes() {
  return getDb()
    .prepare(
      `SELECT b.id, b.code, b.product_id, b.created_at, p.name AS product_name, p.active AS product_active
       FROM barcodes b LEFT JOIN products p ON p.id = b.product_id
       ORDER BY b.created_at DESC`,
    )
    .all()
    .map((row) => ({
      id: row.id,
      code: row.code,
      productId: row.product_id,
      createdAt: row.created_at,
      product: row.product_name ? { name: row.product_name, active: row.product_active } : null,
    }));
}

function createBarcode(code) {
  const existing = getDb().prepare("SELECT id FROM barcodes WHERE code = ?").get(code);
  if (existing) throw new Error("Barcode already exists");
  const product = getDb().prepare("SELECT id FROM products WHERE barcode = ?").get(code);
  const id = uid();
  getDb()
    .prepare("INSERT INTO barcodes (id, code, product_id, created_at) VALUES (?, ?, ?, ?)")
    .run(id, code, product ? product.id : null, now());
  return { id, code, productId: product ? product.id : null, createdAt: now(), product: product ? { name: "", active: 1 } : null };
}

function deleteBarcode(id) {
  getDb().prepare("DELETE FROM barcodes WHERE id = ?").run(id);
  return { success: true };
}

/* ------------------------- dashboard ------------------------- */

function localDayString(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() - (offsetDays || 0));
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function revenueForDay(dayStr) {
  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(total), 0) AS total FROM sales WHERE is_payment = 0 AND substr(created_at, 1, 10) = ?`,
    )
    .get(dayStr);
  return row.total;
}

function dashboardStats() {
  const today = localDayString(0);

  const todayRevenue = revenueForDay(today);
  const totalArrears = getDb().prepare("SELECT COALESCE(SUM(balance_due), 0) AS t FROM arrears WHERE status = 'pending'").get().t;
  const lowStockCount = getDb().prepare("SELECT COUNT(*) AS c FROM products WHERE active = 1 AND stock_qty > 0 AND stock_qty <= 5").get().c;
  const expiringSoonCount = getDb()
    .prepare("SELECT COUNT(*) AS c FROM products WHERE active = 1 AND expiry IS NOT NULL AND expiry > ? AND expiry <= ?")
    .get(localDayString(0), localDayString(30)).c;

  const weekRevenue = [];
  for (let i = 6; i >= 0; i--) {
    const day = localDayString(i);
    weekRevenue.push({ day, revenue: revenueForDay(day) });
  }

  const monthRevenue = [];
  for (let i = 29; i >= 0; i--) {
    const day = localDayString(i);
    monthRevenue.push({ day, revenue: revenueForDay(day) });
  }

  const topProducts = getDb()
    .prepare(
      `SELECT si.product_name AS name, COALESCE(SUM(si.subtotal), 0) AS value
       FROM sale_items si JOIN sales s ON s.id = si.sale_id
       WHERE s.is_payment = 0
       GROUP BY si.product_id ORDER BY COALESCE(SUM(si.subtotal), 0) DESC LIMIT 5`,
    )
    .all();

  return {
    todayRevenue,
    totalArrears,
    lowStockCount,
    expiringSoonCount,
    weekRevenue,
    monthRevenue,
    topProducts,
  };
}

/* ------------------------- zakat ------------------------- */

const SILVER_NISAB_GRAMS = 612.36; // equivalent of 52.5 tola
const GOLD_NISAB_GRAMS = 87.48; // equivalent of 7.5 tola
const DEFAULT_ZAKAT_RATE = 0.025;

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function getZakatSettings() {
  const row = getDb().prepare("SELECT * FROM zakat_settings ORDER BY rowid LIMIT 1").get();
  const s = row || {
    id: "default",
    gold_rate: 0,
    silver_rate: 0,
    nisab_basis: "silver",
    inventory_value: "retail",
    deduct_liabilities: 1,
    zakat_rate: DEFAULT_ZAKAT_RATE,
    updated_at: now(),
  };
  const nisabSilver = round2((s.silver_rate || 0) * SILVER_NISAB_GRAMS);
  const nisabGold = round2((s.gold_rate || 0) * GOLD_NISAB_GRAMS);
  let nisabAmount = 0;
  if (s.nisab_basis === "gold") nisabAmount = nisabGold;
  else if (s.nisab_basis === "lowest") {
    nisabAmount = nisabGold && nisabSilver ? Math.min(nisabGold, nisabSilver) : nisabGold || nisabSilver;
  } else nisabAmount = nisabSilver;
  return {
    id: s.id,
    goldRate: s.gold_rate,
    silverRate: s.silver_rate,
    nisabBasis: s.nisab_basis,
    inventoryValue: s.inventory_value,
    deductLiabilities: !!s.deduct_liabilities,
    zakatRate: s.zakat_rate,
    updatedAt: s.updated_at,
    nisabSilver,
    nisabGold,
    nisabAmount,
  };
}

function saveZakatSettings(input) {
  const s = getZakatSettings();
  getDb()
    .prepare(
      `UPDATE zakat_settings
       SET gold_rate = ?, silver_rate = ?, nisab_basis = ?, inventory_value = ?,
           deduct_liabilities = ?, zakat_rate = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      input.goldRate ?? s.goldRate,
      input.silverRate ?? s.silverRate,
      input.nisabBasis || s.nisabBasis,
      input.inventoryValue || s.inventoryValue,
      input.deductLiabilities ?? s.deductLiabilities ? 1 : 0,
      input.zakatRate ?? s.zakatRate,
      now(),
      s.id,
    );
  return getZakatSettings();
}

function zakatPreview(opts) {
  const settings = getZakatSettings();
  const basis = opts?.inventoryValue || settings.inventoryValue || "retail";
  const products = getDb()
    .prepare(
      `SELECT id, name, barcode, stock_qty, sale_price, purchase_price
       FROM products WHERE active = 1 AND stock_qty > 0
       ORDER BY name COLLATE NOCASE ASC`,
    )
    .all();
  const inventoryItems = products.map((p) => {
    const unit = basis === "cost" ? p.purchase_price || 0 : p.sale_price || 0;
    return {
      productId: p.id,
      name: p.name,
      barcode: p.barcode,
      quantity: p.stock_qty,
      unitValue: unit,
      value: round2(p.stock_qty * unit),
    };
  });
  const inventoryValue = round2(inventoryItems.reduce((s, i) => s + i.value, 0));
  const receivableRows = getDb()
    .prepare(
      `SELECT a.id, a.customer_id, c.name AS customer_name, a.balance_due
       FROM arrears a LEFT JOIN customers c ON c.id = a.customer_id
       WHERE a.status = 'pending'
       ORDER BY a.created_at DESC`,
    )
    .all();
  const receivables = receivableRows.map((r) => ({
    arrearId: r.id,
    customerId: r.customer_id,
    customerName: r.customer_name || "—",
    value: round2(r.balance_due || 0),
  }));
  const receivablesTotal = round2(receivables.reduce((s, i) => s + i.value, 0));
  return { inventoryBasis: basis, inventoryItems, inventoryValue, receivables, receivablesTotal, settings };
}

function getZakatCalculation(id) {
  const row = getDb().prepare("SELECT * FROM zakat_calculations WHERE id = ?").get(id);
  if (!row) return null;
  let items = [];
  try {
    items = JSON.parse(row.items_json || "[]");
  } catch (_) {}
  return { ...row, nisab_met: !!row.nisab_met, deductions_enabled: !!row.deductions_enabled, items };
}

function calculateZakat(input) {
  const settings = getZakatSettings();
  const inventoryValue = round2(Number(input.inventoryValue) || 0);
  const receivables = round2(Number(input.receivables) || 0);
  const cashInHand = round2(Number(input.cashInHand) || 0);
  const otherReceivables = round2(Number(input.otherReceivables) || 0);
  const otherAssets = round2(Number(input.otherAssets) || 0);
  const liabilities = round2(Number(input.liabilities) || 0);
  const deductLiabilities = input.deductLiabilities ?? settings.deductLiabilities;
  const grossAssets = round2(inventoryValue + receivables + cashInHand + otherReceivables + otherAssets);
  const totalLiabilities = deductLiabilities ? liabilities : 0;
  const netZakatable = round2(Math.max(0, grossAssets - totalLiabilities));
  const nisabAmount = settings.nisabAmount || 0;
  const nisabMet = nisabAmount > 0 && netZakatable >= nisabAmount;
  const zakatDue = nisabMet ? round2(netZakatable * (settings.zakatRate || DEFAULT_ZAKAT_RATE)) : 0;
  const createdAt = now();
  const id = uid();
  getDb()
    .prepare(
      `INSERT INTO zakat_calculations
       (id, snapshot_date, hawl_start_date, gold_rate, silver_rate, nisab_basis, nisab_amount,
        inventory_value, receivables, cash_in_hand, other_receivables, other_assets,
        liabilities, deductions_enabled, gross_assets, total_liabilities, net_zakatable,
        nisab_met, zakat_due, items_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.snapshotDate,
      input.hawlStartDate || "",
      settings.goldRate,
      settings.silverRate,
      settings.nisabBasis,
      settings.nisabAmount || 0,
      inventoryValue,
      receivables,
      cashInHand,
      otherReceivables,
      otherAssets,
      liabilities,
      deductLiabilities ? 1 : 0,
      grossAssets,
      totalLiabilities,
      netZakatable,
      nisabMet ? 1 : 0,
      zakatDue,
      JSON.stringify(input.items || []),
      createdAt,
    );
  return getZakatCalculation(id);
}

function listZakatCalculations() {
  return getDb()
    .prepare("SELECT * FROM zakat_calculations ORDER BY created_at DESC")
    .all()
    .map((r) => ({ ...r, nisab_met: !!r.nisab_met, deductions_enabled: !!r.deductions_enabled }));
}

function deleteZakatCalculation(id) {
  getDb().prepare("DELETE FROM zakat_calculations WHERE id = ?").run(id);
  return { success: true };
}

/* ------------------------- api map ------------------------- */

const dbApi = {
  auth: {
    login,
    logout,
    verifyPassword: verifyPasswordFn,
    generateRecoveryKey,
    recoverPassword,
  },
  products: {
    list: () => listProducts(false),
    listAll: () => listProducts(true),
    search: searchProducts,
    getByBarcode: getProductByBarcode,
    create: createProduct,
    update: updateProduct,
    delete: archiveProduct,
    archive: archiveProduct,
    restore: restoreProduct,
  },
  sales: {
    create: createSale,
    listRecent: listRecentSales,
    getById: getSaleById,
    search: searchSales,
    listByDate: listSalesByDate,
    listAll: listSales,
  },
  customers: {
    list: listCustomers,
    search: searchCustomers,
    create: createCustomer,
    update: updateCustomer,
    delete: deleteCustomer,
    getById: getCustomer,
  },
  arrears: {
    list: listArrears,
    create: createArrear,
    recordPayment: recordArrearPayment,
    delete: deleteArrear,
    settle: settleArrear,
  },
  stock: {
    list: listStock,
    create: createStock,
    update: updateStock,
    delete: deleteStock,
  },
  suppliers: {
    list: listSuppliers,
    create: createSupplier,
    update: updateSupplier,
    delete: deleteSupplier,
  },
  returns: {
    list: listReturns,
    getById: getReturn,
    create: createReturn,
  },
  expenses: {
    list: listExpenses,
    create: createExpense,
    update: updateExpense,
    delete: deleteExpense,
  },
  categories: {
    list: listCategories,
    create: createCategory,
    update: updateCategory,
    delete: deleteCategory,
  },
  dashboard: {
    stats: dashboardStats,
  },
  barcodes: {
    list: listBarcodes,
    create: createBarcode,
    delete: deleteBarcode,
  },
  zakat: {
    settings: getZakatSettings,
    saveSettings: saveZakatSettings,
    preview: zakatPreview,
    calculate: calculateZakat,
    list: listZakatCalculations,
    getById: getZakatCalculation,
    delete: deleteZakatCalculation,
  },
};

export { initDb, getDb, getDbPath, dbApi, verifyAdminPassword, reloadDb };
