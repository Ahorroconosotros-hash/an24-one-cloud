"use client";

export type EnergyAlertRole = "Administrador" | "BackOffice" | "Comercial";

export type EnergyLifecycleAlert = {
  id: string;
  type: "REVISION_6_MESES" | "VENCIMIENTO_30_DIAS" | "RIESGO_BAJA";
  title: string;
  description: string;
  date: string;
  priority: "Normal" | "Alta";
  roles: EnergyAlertRole[];
  clientId: string;
  clientName: string;
  commercial: string;
  cups: string;
  createdAt: string;
  completed: boolean;
};

const STORAGE_KEY = "one_energy_lifecycle_alerts";

export function loadEnergyLifecycleAlerts(): EnergyLifecycleAlert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveEnergyLifecycleAlerts(alerts: EnergyLifecycleAlert[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
}

export function createEnergyLifecycleAlerts(input: {
  clientId: string;
  clientName: string;
  commercial: string;
  cups: string;
  activationDate: string;
  cancellationDate: string;
  reviewDate: string;
  expiryDate: string;
  expiryNoticeDate: string;
  churnAlert: boolean;
  churnReason: string;
}) {
  if (typeof window === "undefined") return;

  const existing = loadEnergyLifecycleAlerts().filter(
    (item) => !(item.clientId === input.clientId && item.cups === input.cups)
  );
  const createdAt = new Date().toISOString();
  const roles: EnergyAlertRole[] = ["Administrador", "BackOffice", "Comercial"];
  const alerts: EnergyLifecycleAlert[] = [];

  if (input.activationDate && !input.cancellationDate) {
    alerts.push({
      id: `energy-review-${input.clientId}-${input.cups}`,
      type: "REVISION_6_MESES",
      title: "Revisión comercial de Energía",
      description: `${input.clientName} · Revisar el contrato y valorar cambio de compañía o venta cruzada.`,
      date: input.reviewDate,
      priority: "Normal",
      roles,
      clientId: input.clientId,
      clientName: input.clientName,
      commercial: input.commercial,
      cups: input.cups,
      createdAt,
      completed: false,
    });

    alerts.push({
      id: `energy-expiry-${input.clientId}-${input.cups}`,
      type: "VENCIMIENTO_30_DIAS",
      title: "Contrato próximo a vencer",
      description: `${input.clientName} · El contrato de Energía vence el ${input.expiryDate}.`,
      date: input.expiryNoticeDate,
      priority: "Alta",
      roles,
      clientId: input.clientId,
      clientName: input.clientName,
      commercial: input.commercial,
      cups: input.cups,
      createdAt,
      completed: false,
    });
  }

  if (input.churnAlert || input.cancellationDate) {
    alerts.push({
      id: `energy-churn-${input.clientId}-${input.cups}-${Date.now()}`,
      type: "RIESGO_BAJA",
      title: "Riesgo de baja: actuar ahora",
      description: `${input.clientName} · ${input.churnReason || "Se ha comunicado una posible baja del contrato de Energía."}`,
      date: new Date().toISOString().slice(0, 10),
      priority: "Alta",
      roles,
      clientId: input.clientId,
      clientName: input.clientName,
      commercial: input.commercial,
      cups: input.cups,
      createdAt,
      completed: false,
    });
  }

  saveEnergyLifecycleAlerts([...alerts, ...existing]);
}

export function completeEnergyLifecycleAlert(id: string) {
  const alerts = loadEnergyLifecycleAlerts().map((item) =>
    item.id === id ? { ...item, completed: true } : item
  );
  saveEnergyLifecycleAlerts(alerts);
}
