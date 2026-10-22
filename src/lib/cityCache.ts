import type { CityContext, CityMeta } from "../types";

const DB_NAME = "tapeta";
const DB_VERSION = 1;
const STORE_NAME = "cities";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 90;
const SAVED_CITY_KEY = "tapeta:last-city:v1";

let databasePromise: Promise<IDBDatabase | null> | null = null;

function openDatabase(): Promise<IDBDatabase | null> {
  if (databasePromise) return databasePromise;
  if (!("indexedDB" in window)) {
    databasePromise = Promise.resolve(null);
    return databasePromise;
  }

  databasePromise = new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "relationId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });

  return databasePromise;
}

function isCityContext(value: unknown): value is CityContext {
  if (!value || typeof value !== "object") return false;
  const city = value as Partial<CityContext>;
  return (
    typeof city.relationId === "number" &&
    typeof city.name === "string" &&
    Array.isArray(city.regions)
  );
}

function isCityMeta(value: unknown): value is CityMeta {
  if (!value || typeof value !== "object") return false;
  const city = value as Partial<CityMeta>;
  return (
    typeof city.relationId === "number" &&
    Number.isFinite(city.relationId) &&
    typeof city.name === "string" &&
    city.name.length > 0
  );
}

export async function readCachedCity(
  relationId: number,
): Promise<CityContext | null> {
  const database = await openDatabase();
  if (!database) return null;

  return new Promise((resolve) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(relationId);

    request.onsuccess = () => {
      const record = request.result as
        | (CityContext & { cachedAt?: number })
        | undefined;
      if (!record || !isCityContext(record)) {
        resolve(null);
        return;
      }
      const cachedAt = record.cachedAt ?? Date.parse(record.fetchedAt);
      if (!Number.isFinite(cachedAt) || Date.now() - cachedAt > MAX_AGE_MS) {
        resolve(null);
        return;
      }
      resolve({ ...record, source: "cache" });
    };
    request.onerror = () => resolve(null);
  });
}

export async function writeCachedCity(city: CityContext): Promise<void> {
  const database = await openDatabase();
  if (!database) return;

  return new Promise((resolve) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put({
      ...city,
      cachedAt: Date.now(),
    });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
}

export function readSavedCityMeta(): CityMeta | null {
  try {
    const raw = window.localStorage.getItem(SAVED_CITY_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isCityMeta(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveCityMeta(city: CityMeta): void {
  try {
    window.localStorage.setItem(SAVED_CITY_KEY, JSON.stringify(city));
  } catch {
    // Private browsing or a full storage quota should not break navigation.
  }
}
