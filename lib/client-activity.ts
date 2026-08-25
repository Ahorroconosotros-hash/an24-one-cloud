"use client";

export type ClientActivityType =
  | "Prospecto creado"
  | "Cliente creado"
  | "Llamada"
  | "Email"
  | "WhatsApp"
  | "Nota"
  | "Oportunidad"
  | "Presupuesto"
  | "Operación"
  | "Contrato";

export type ClientActivity = {
  id: string;
  clientId: string;
  type: ClientActivityType;
  title: string;
  detail: string;
  createdAt: string;
  user: string;
};

const STORAGE_KEY = "one_client_activity_v1";

function canUseStorage() {
  return typeof window !== "undefined";
}

export function loadClientActivities(clientId?: string): ClientActivity[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const items = Array.isArray(parsed) ? parsed : [];
    return clientId ? items.filter((item) => item.clientId === clientId) : items;
  } catch {
    return [];
  }
}

export function addClientActivity(input: Omit<ClientActivity, "id" | "createdAt">) {
  if (!canUseStorage()) return null;
  const item: ClientActivity = {
    ...input,
    id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  const current = loadClientActivities();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([item, ...current]));
  return item;
}
