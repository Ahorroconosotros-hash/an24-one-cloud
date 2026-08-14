export type OpportunityStage = "Borrador" | "Propuesta" | "Aceptada" | "Pendiente" | "En curso" | "Tramitado" | "Activado" | "Rechazado" | "Cancelado" | "Baja" | "Perdida";

export type OpportunityRecord = {
  id: string;
  reference: string;
  clientId: string;
  clientName: string;
  service: string;
  provider: string;
  product: string;
  title: string;
  value: number;
  probability: number;
  stage: OpportunityStage;
  commercial: string;
  nextAction: string;
  nextActionDate: string;
  notes: string;
  details?: Record<string, string | string[]>;
  createdAt: string;
  updatedAt: string;
};

export type OpportunityDraft = Omit<OpportunityRecord, "id" | "reference" | "createdAt" | "updatedAt">;

const STORAGE_KEY = "one_opportunities_v1";

const defaults: OpportunityRecord[] = [
  {
    id: "opp-clinica-alarma",
    reference: "OPP-2026-001",
    clientId: "clinica-dental-sur",
    clientName: "Clínica Dental Sur",
    service: "Alarmas",
    provider: "",
    product: "",
    title: "Sistema de alarma para clínica",
    value: 1450,
    probability: 75,
    stage: "Pendiente",
    commercial: "Jesús Martínez",
    nextAction: "Llamar para confirmar la propuesta",
    nextActionDate: "2026-08-07",
    notes: "Cliente integral: ya tiene energía y telefonía.",
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-03T09:00:00.000Z",
  },
  {
    id: "opp-albores-energia",
    reference: "OPP-2026-002",
    clientId: "restaurante-albores",
    clientName: "Restaurante Albores",
    service: "Energía",
    provider: "",
    product: "",
    title: "Revisión de suministro eléctrico",
    value: 3200,
    probability: 35,
    stage: "Borrador",
    commercial: "Jesús Martínez",
    nextAction: "Solicitar última factura",
    nextActionDate: "2026-08-06",
    notes: "Oportunidad detectada desde Cliente 360º.",
    createdAt: "2026-08-02T11:30:00.000Z",
    updatedAt: "2026-08-02T11:30:00.000Z",
  },
];

function canUseStorage() {
  return typeof window !== "undefined";
}

export function loadOpportunities(): OpportunityRecord[] {
  if (!canUseStorage()) return defaults;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
      return defaults;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

export function saveOpportunities(records: OpportunityRecord[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function createOpportunity(draft: OpportunityDraft) {
  const records = loadOpportunities();
  const now = new Date().toISOString();
  const next =
    records.reduce((max, item) => {
      const value = Number(item.reference.replace(/\D/g, ""));
      return Number.isFinite(value) ? Math.max(max, value) : max;
    }, 0) + 1;

  const record: OpportunityRecord = {
    ...draft,
    id: `opp-${Date.now()}`,
    reference: `OPP-2026-${String(next).padStart(3, "0")}`,
    createdAt: now,
    updatedAt: now,
  };
  saveOpportunities([record, ...records]);
  return record;
}

export function updateOpportunityStage(id: string, stage: OpportunityStage) {
  const now = new Date().toISOString();
  const updated = loadOpportunities().map((item) => {
    if (item.id !== id) return item;
    const previousHistory = Array.isArray(item.details?.statusHistory) ? item.details.statusHistory : [];
    return {
      ...item,
      stage,
      updatedAt: now,
      details: {
        ...(item.details ?? {}),
        statusHistory: [...previousHistory, `${now} · ${item.stage} → ${stage}`],
      },
    };
  });
  saveOpportunities(updated);
}

export function deleteOpportunity(id: string) {
  saveOpportunities(loadOpportunities().filter((item) => item.id !== id));
}
