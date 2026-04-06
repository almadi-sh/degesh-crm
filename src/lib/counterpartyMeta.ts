export interface CounterpartyCreationMeta {
  createdAt: string;
  createdBy: string;
}

const CLIENT_META_KEY = "clientCreationMeta";
const SUPPLIER_META_KEY = "supplierCreationMeta";

const readMetaMap = (key: string): Record<string, CounterpartyCreationMeta> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, CounterpartyCreationMeta>;
  } catch {
    return {};
  }
};

const writeMetaMap = (key: string, map: Record<string, CounterpartyCreationMeta>) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(map));
};

const setCreationMeta = (key: string, id: number, createdBy: string) => {
  const map = readMetaMap(key);
  if (!map[String(id)]) {
    map[String(id)] = {
      createdAt: new Date().toISOString(),
      createdBy,
    };
    writeMetaMap(key, map);
  }
  return map[String(id)];
};

const getCreationMeta = (key: string, id: number): CounterpartyCreationMeta | null => {
  return readMetaMap(key)[String(id)] ?? null;
};

export const setClientCreationMeta = (id: number, createdBy: string) => setCreationMeta(CLIENT_META_KEY, id, createdBy);
export const setSupplierCreationMeta = (id: number, createdBy: string) => setCreationMeta(SUPPLIER_META_KEY, id, createdBy);

export const getClientCreationMeta = (id: number) => getCreationMeta(CLIENT_META_KEY, id);
export const getSupplierCreationMeta = (id: number) => getCreationMeta(SUPPLIER_META_KEY, id);

export const formatCreatedAt = (iso: string) =>
  new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
