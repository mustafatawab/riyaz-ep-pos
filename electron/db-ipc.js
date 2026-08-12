import { ipcMain } from "electron";
import { dbApi, initDb } from "./db.js";

function lookup(method) {
  const [ns, fn] = String(method).split(".");
  if (!ns || !fn || !dbApi[ns] || typeof dbApi[ns][fn] !== "function") {
    throw new Error(`Unknown database method: ${method}`);
  }
  return dbApi[ns][fn];
}

export function registerDbHandlers() {
  initDb();

  ipcMain.handle("db:invoke", (_event, method, args) => {
    try {
      const fn = lookup(method);
      const data = fn(...(Array.isArray(args) ? args : []));
      return { ok: true, data };
    } catch (err) {
      return {
        ok: false,
        error: err && err.message ? err.message : String(err),
      };
    }
  });
}
