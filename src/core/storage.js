// Storage adapters.

function parseCookieHeader(header) {
  const cookies = {};
  for (const part of String(header || '').split(';')) {
    const at = part.indexOf('=');
    if (at === -1) continue;
    const name = part.slice(0, at).trim();
    if (!name) continue;
    try {
      cookies[name] = decodeURIComponent(part.slice(at + 1).trim());
    } catch {
      cookies[name] = part.slice(at + 1).trim();
    }
  }
  return cookies;
}

function serializeCookie(name, value, options = {}) {
  const parts = [name + '=' + encodeURIComponent(value)];
  parts.push('Path=' + (options.path || '/'));
  parts.push('SameSite=' + (options.sameSite || 'Lax'));
  if (options.maxAge !== undefined) parts.push('Max-Age=' + options.maxAge);
  if (options.secure) parts.push('Secure');
  return parts.join('; ');
}

export class CookieStore {
  constructor(options = {}) {
    this.documentRef = options.documentRef || globalThis.document;
    this.locationRef = options.locationRef || globalThis.location;
    this.name = options.name || 'keymap-preferences';
    this.maxAge = options.maxAge || 60 * 60 * 24 * 365;
  }

  cookieText(value, maxAge) {
    const secure = Boolean(
      this.locationRef && this.locationRef.protocol === 'https:'
    );
    return serializeCookie(this.name, value, { maxAge, secure });
  }

  get() {
    if (!this.documentRef) return null;
    return parseCookieHeader(this.documentRef.cookie)[this.name] || null;
  }

  set(_key, value) {
    if (!this.documentRef) return false;
    this.documentRef.cookie = this.cookieText(value, this.maxAge);
    return true;
  }

  delete() {
    if (!this.documentRef) return false;
    this.documentRef.cookie = this.cookieText('', 0);
    return true;
  }
}

export class MemoryStore {
  constructor() {
    this.data = new Map();
  }

  get(key) {
    return this.data.has(key) ? this.data.get(key) : null;
  }

  set(key, value) {
    this.data.set(key, value);
    return true;
  }

  delete(key) {
    this.data.delete(key);
    return true;
  }

  clear() {
    this.data.clear();
    return true;
  }
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionResult(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(
      transaction.error || new Error('IndexedDB transaction aborted')
    );
    transaction.onerror = () => reject(
      transaction.error || new Error('IndexedDB transaction failed')
    );
  });
}

export class IndexedDbStore {
  constructor(options = {}) {
    this.factory = options.factory || globalThis.indexedDB;
    this.name = options.name || 'keymap';
    this.storeName = options.storeName || 'records';
    this.database = null;
  }

  async open() {
    if (this.database) return this.database;
    if (!this.factory) throw new Error('IndexedDB is not available');

    const request = this.factory.open(this.name, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(this.storeName)) {
        database.createObjectStore(this.storeName);
      }
    };
    this.database = await requestResult(request);
    return this.database;
  }

  async get(key) {
    const database = await this.open();
    const transaction = database.transaction(this.storeName, 'readonly');
    const result = await requestResult(
      transaction.objectStore(this.storeName).get(key)
    );
    return result === undefined ? null : result;
  }

  async set(key, value) {
    const database = await this.open();
    const transaction = database.transaction(this.storeName, 'readwrite');
    transaction.objectStore(this.storeName).put(value, key);
    return transactionResult(transaction);
  }

  async delete(key) {
    const database = await this.open();
    const transaction = database.transaction(this.storeName, 'readwrite');
    transaction.objectStore(this.storeName).delete(key);
    return transactionResult(transaction);
  }

  async clear() {
    const database = await this.open();
    const transaction = database.transaction(this.storeName, 'readwrite');
    transaction.objectStore(this.storeName).clear();
    return transactionResult(transaction);
  }
}
