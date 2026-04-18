const DB_NAME = "p2p-e2e-keys";
const DB_VERSION = 1;
const STORE_NAME = "keys";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function put(key: string, value: string): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );
}

function get(key: string): Promise<string | null> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve((req.result as string) ?? null);
        req.onerror = () => reject(req.error);
      })
  );
}

export async function savePrivateKey(privateKey: string): Promise<void> {
  await put("privateKey", privateKey);
}

export async function getPrivateKey(): Promise<string | null> {
  return get("privateKey");
}

export async function savePublicKey(publicKey: string): Promise<void> {
  await put("publicKey", publicKey);
}

export async function getPublicKey(): Promise<string | null> {
  return get("publicKey");
}

export async function saveGroupKey(
  groupId: string,
  groupKey: string
): Promise<void> {
  await put(`groupKey:${groupId}`, groupKey);
}

export async function getGroupKey(
  groupId: string
): Promise<string | null> {
  return get(`groupKey:${groupId}`);
}

export async function hasKeys(): Promise<boolean> {
  const pk = await getPrivateKey();
  return pk !== null;
}
