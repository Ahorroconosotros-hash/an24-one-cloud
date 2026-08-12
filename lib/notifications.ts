"use client";

export type OneNotification = {
  id: string;
  clientId?: string;
  clientName?: string;
  commercial: string;
  title: string;
  message: string;
  category: "RIESGO_BAJA" | "CAMBIO_PRECIOS" | "NOTA_IMPORTANTE";
  priority: "Normal" | "Alta";
  createdAt: string;
  readAt?: string;
  acknowledgedAt?: string;
  channels: { one: boolean; email: boolean };
  emailStatus: "Pendiente" | "Registrado";
};

const KEY = "one_notifications_v1";

export function loadNotifications(): OneNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

export function createNotification(input: Omit<OneNotification,"id"|"createdAt"|"emailStatus">) {
  if (typeof window === "undefined") return null;
  const item: OneNotification = {
    ...input,
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    createdAt: new Date().toISOString(),
    emailStatus: input.channels.email ? "Registrado" : "Pendiente",
  };
  localStorage.setItem(KEY, JSON.stringify([item, ...loadNotifications()]));
  return item;
}
