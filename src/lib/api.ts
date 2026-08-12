import type {
  Product, ProductInput, Customer, CustomerInput, Sale, SaleInput,
  Arrear, ArrearInput, StockPurchase, StockInput, Supplier, SupplierInput,
  ReturnEntry, ReturnInput, Expense, ExpenseInput,
  Category, CategoryInput, DashboardStats, BarcodeEntry,
} from "@/types";
import type { BackupResult, BackupEntry, GDriveConfig } from "@/types/electron";

async function call<T>(method: string, ...args: unknown[]): Promise<T> {
  if (!window.dbInvoke) {
    throw new Error("Desktop database is not available");
  }
  const res = await window.dbInvoke(method, ...args);
  if (!res.ok) {
    throw new Error(res.error || "Database error");
  }
  return res.data as T;
}

const api = {
  auth: {
    login: (username: string, password: string): Promise<{
      user: { id: string; username: string; role: string };
    }> => call("auth.login", username, password),
    logout: (): Promise<{ success: boolean }> => call("auth.logout"),
    verifyPassword: (password: string): Promise<{ valid: boolean }> =>
      call("auth.verifyPassword", password),
    generateRecoveryKey: (): Promise<{ phrase: string }> =>
      call("auth.generateRecoveryKey"),
    recoverPassword: (phrase: string, newPassword: string): Promise<{ success: boolean; error?: string }> =>
      call("auth.recoverPassword", phrase, newPassword),
  },
  products: {
    list: (): Promise<Product[]> => call("products.list"),
    search: (q: string): Promise<Product[]> => call("products.search", q),
    getByBarcode: (b: string): Promise<Product | null> => call("products.getByBarcode", b),
    create: (p: ProductInput): Promise<Product> => call("products.create", p),
    update: (id: string, p: ProductInput): Promise<Product> => call("products.update", id, p),
    delete: (id: string): Promise<{ success: boolean }> => call("products.delete", id),
    archive: (id: string): Promise<{ success: boolean }> => call("products.archive", id),
    restore: (id: string): Promise<{ success: boolean }> => call("products.restore", id),
    listAll: (): Promise<Product[]> => call("products.listAll"),
  },
  sales: {
    create: (s: SaleInput): Promise<Sale> => call("sales.create", s),
    listRecent: (l = 10): Promise<Sale[]> => call("sales.listRecent", l),
    getById: (id: string): Promise<Sale | null> => call("sales.getById", id),
    search: (q: string): Promise<Sale[]> => call("sales.search", q),
    listByDate: (dateStr: string): Promise<Sale[]> => call("sales.listByDate", dateStr),
    listAll: (opts?: { search?: string; dateFrom?: string; dateTo?: string }): Promise<Sale[]> =>
      call("sales.listAll", opts),
  },
  customers: {
    list: (): Promise<Customer[]> => call("customers.list"),
    search: (q: string): Promise<Customer[]> => call("customers.search", q),
    create: (c: CustomerInput): Promise<Customer> => call("customers.create", c),
    update: (id: string, c: CustomerInput): Promise<Customer> => call("customers.update", id, c),
    delete: (id: string, opts?: { force?: boolean }): Promise<{ success: boolean }> =>
      call("customers.delete", id, opts),
    getById: (id: string): Promise<Customer | null> => call("customers.getById", id),
  },
  arrears: {
    list: (status?: string): Promise<Arrear[]> => call("arrears.list", status),
    create: (a: ArrearInput): Promise<Arrear> => call("arrears.create", a),
    recordPayment: (id: string, amount: number, password: string): Promise<{ arrear: Arrear; paymentSaleId: string }> =>
      call("arrears.recordPayment", id, amount, password),
    delete: (id: string): Promise<{ success: boolean }> => call("arrears.delete", id),
    settle: (id: string, password: string): Promise<{ arrear: Arrear; paymentSaleId: string }> =>
      call("arrears.settle", id, password),
  },
  stock: {
    list: (): Promise<StockPurchase[]> => call("stock.list"),
    create: (p: StockInput): Promise<StockPurchase> => call("stock.create", p),
    update: (id: string, p: StockInput): Promise<StockPurchase> => call("stock.update", id, p),
    delete: (id: string): Promise<{ success: boolean }> => call("stock.delete", id),
  },
  suppliers: {
    list: (): Promise<Supplier[]> => call("suppliers.list"),
    create: (s: SupplierInput): Promise<Supplier> => call("suppliers.create", s),
    update: (id: string, s: SupplierInput): Promise<Supplier> => call("suppliers.update", id, s),
    delete: (id: string): Promise<{ success: boolean }> => call("suppliers.delete", id),
  },
  returns: {
    list: (): Promise<ReturnEntry[]> => call("returns.list"),
    getById: (id: string): Promise<ReturnEntry | null> => call("returns.getById", id),
    create: (r: ReturnInput): Promise<ReturnEntry> => call("returns.create", r),
  },
  expenses: {
    list: (): Promise<Expense[]> => call("expenses.list"),
    create: (e: ExpenseInput): Promise<Expense> => call("expenses.create", e),
    update: (id: string, e: ExpenseInput): Promise<Expense> => call("expenses.update", id, e),
    delete: (id: string): Promise<{ success: boolean }> => call("expenses.delete", id),
  },
  categories: {
    list: (): Promise<Category[]> => call("categories.list"),
    create: (c: CategoryInput): Promise<Category> => call("categories.create", c),
    update: (id: string, c: CategoryInput): Promise<Category> => call("categories.update", id, c),
    delete: (id: string): Promise<{ success: boolean }> => call("categories.delete", id),
  },
  dashboard: {
    stats: (): Promise<DashboardStats> => call("dashboard.stats"),
  },
  settings: {
    backupCreate: (): Promise<BackupResult> => {
      if (!window.electronAPI?.settings?.backupCreate) {
        return Promise.resolve({ success: false, error: "Backups not available" });
      }
      return window.electronAPI.settings.backupCreate();
    },
    backupList: (): Promise<BackupEntry[]> => {
      if (!window.electronAPI?.settings?.backupList) {
        return Promise.resolve([]);
      }
      return window.electronAPI.settings.backupList();
    },
    backupDelete: (name: string): Promise<{ success: boolean; error?: string }> =>
      window.electronAPI.settings.backupDelete(name),
    backupRestore: (name: string): Promise<{ success: boolean; error?: string }> =>
      window.electronAPI.settings.backupRestore(name),
    getBackupDirectory: (): Promise<{ path: string }> =>
      window.electronAPI.settings.getBackupDirectory(),
    gdriveGetConfig: (): Promise<GDriveConfig> =>
      window.electronAPI.settings.gdriveGetConfig(),
    gdriveSaveConfig: (cfg: GDriveConfig): Promise<{ success: boolean }> =>
      window.electronAPI.settings.gdriveSaveConfig(cfg),
  },
  barcodes: {
    list: (): Promise<BarcodeEntry[]> => call("barcodes.list"),
    create: (code: string): Promise<BarcodeEntry> => call("barcodes.create", code),
    delete: (id: string): Promise<{ success: boolean }> => call("barcodes.delete", id),
  },
};

export { api };
