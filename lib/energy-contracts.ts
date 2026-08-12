export type EnergyContractStatus =
  | "Borrador"
  | "Pendiente de activación"
  | "Activo"
  | "Próximo a renovar"
  | "Baja"
  | "Cancelado";

export type EnergyDocument = {
  id: string;
  type: "DNI / NIE" | "CIF" | "Factura" | "Titularidad bancaria" | "Contrato firmado" | "Escrituras" | "Otro";
  name: string;
  status: "Pendiente" | "Recibido" | "Validado";
  uploadedAt: string;
};

export type EnergyTicket = {
  id: string;
  title: string;
  status: "Abierto" | "En curso" | "Resuelto";
  priority: "Baja" | "Media" | "Alta";
  createdAt: string;
};

export type EnergyOperation = {
  id: string;
  type: "Alta" | "Cambio de titular" | "Cambio de potencia" | "Cambio de tarifa" | "Cambio de IBAN" | "Renovación" | "Baja";
  status: "Pendiente" | "En curso" | "Completada" | "Cancelada";
  createdAt: string;
};

export type EnergyTimelineEvent = {
  id: string;
  title: string;
  detail: string;
  createdAt: string;
};

export type EnergyContract = {
  id: string;
  oneReference: string;
  clientId: string;
  clientName: string;
  supplyType: "Luz" | "Gas";
  cups: string;
  provider: string;
  product: string;
  tariffType: string;
  supplyAddress: string;
  contractedPower: string;
  annualConsumption: string;
  iban: string;
  commercial: string;
  backoffice: string;
  status: EnergyContractStatus;
  oneCreatedAt: string;
  activatedAt: string;
  permanenceMonths: number;
  renewalNoticeDays: number;
  cancelledAt: string;
  documents: EnergyDocument[];
  tickets: EnergyTicket[];
  operations: EnergyOperation[];
  timeline: EnergyTimelineEvent[];
  createdAt: string;
  updatedAt: string;
};

export type EnergyContractDraft = Omit<
  EnergyContract,
  "id" | "oneReference" | "documents" | "tickets" | "operations" | "timeline" | "createdAt" | "updatedAt"
>;

const STORAGE_KEY = "one_energy_contracts_v2";

const defaults: EnergyContract[] = [
  {
    id: "energy-clinica-luz",
    oneReference: "EN-000254",
    clientId: "clinica-dental-sur",
    clientName: "Clínica Dental Sur",
    supplyType: "Luz",
    cups: "ES0021000001234567AB",
    provider: "GANA Energía",
    product: "Tarifa 24 horas",
    tariffType: "3.0TD",
    supplyAddress: "Av. Europa 24, 11405 Jerez de la Frontera",
    contractedPower: "15 kW",
    annualConsumption: "42.500 kWh/año",
    iban: "ES9121000418450200051332",
    commercial: "Equipo Empresas",
    backoffice: "Laura Sánchez",
    status: "Activo",
    oneCreatedAt: "2026-08-05",
    activatedAt: "2026-08-08",
    permanenceMonths: 12,
    renewalNoticeDays: 30,
    cancelledAt: "",
    documents: [
      { id: "doc-energy-1", type: "Factura", name: "factura-julio-2026.pdf", status: "Validado", uploadedAt: "2026-08-05" },
      { id: "doc-energy-2", type: "Titularidad bancaria", name: "titularidad-bancaria.pdf", status: "Recibido", uploadedAt: "2026-08-05" },
    ],
    tickets: [
      { id: "TKT-00087", title: "Revisión de factura y consumo", status: "Abierto", priority: "Alta", createdAt: "2026-08-02" },
    ],
    operations: [
      { id: "OP-00341", type: "Alta", status: "Completada", createdAt: "2026-08-08" },
    ],
    timeline: [
      { id: "tl-energy-1", title: "Contrato creado en ONE", detail: "Alta registrada por Equipo Empresas", createdAt: "2026-08-05T09:15:00.000Z" },
      { id: "tl-energy-2", title: "Activación en compañía", detail: "Contrato activado correctamente", createdAt: "2026-08-08T10:30:00.000Z" },
    ],
    createdAt: "2026-08-05T09:15:00.000Z",
    updatedAt: "2026-08-08T10:30:00.000Z",
  },
];

function canUseStorage() {
  return typeof window !== "undefined";
}

function normalizeCups(value: string) {
  return value.toUpperCase().replace(/\s+/g, "").trim();
}

export function loadEnergyContracts(): EnergyContract[] {
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

export function saveEnergyContracts(contracts: EnergyContract[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts));
}

export function getEnergyContract(id: string) {
  return loadEnergyContracts().find((contract) => contract.id === id) ?? null;
}

export function getEnergyContractsByClient(clientId: string) {
  return loadEnergyContracts().filter((contract) => contract.clientId === clientId);
}

export function findEnergyContractByCups(cups: string, excludeId?: string) {
  const normalized = normalizeCups(cups);
  if (!normalized) return null;
  return (
    loadEnergyContracts().find(
      (contract) => contract.id !== excludeId && normalizeCups(contract.cups) === normalized
    ) ?? null
  );
}

export function calculateEndDate(activatedAt: string, permanenceMonths: number) {
  if (!activatedAt || !permanenceMonths) return "";
  const date = new Date(`${activatedAt}T12:00:00`);
  date.setMonth(date.getMonth() + permanenceMonths);
  return date.toISOString().slice(0, 10);
}

export function calculateNoticeDate(
  activatedAt: string,
  permanenceMonths: number,
  renewalNoticeDays: number
) {
  const endDate = calculateEndDate(activatedAt, permanenceMonths);
  if (!endDate) return "";
  const date = new Date(`${endDate}T12:00:00`);
  date.setDate(date.getDate() - renewalNoticeDays);
  return date.toISOString().slice(0, 10);
}

export function daysUntil(value: string) {
  if (!value) return null;
  const target = new Date(`${value}T12:00:00`).getTime();
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.ceil((target - today.getTime()) / 86400000);
}

export function deriveEnergyContractStatus(contract: EnergyContract): EnergyContractStatus {
  if (contract.cancelledAt) return "Baja";
  if (!contract.activatedAt) return "Pendiente de activación";
  const noticeDate = calculateNoticeDate(
    contract.activatedAt,
    contract.permanenceMonths,
    contract.renewalNoticeDays
  );
  const remainingToNotice = daysUntil(noticeDate);
  if (remainingToNotice !== null && remainingToNotice <= 0) return "Próximo a renovar";
  return contract.status === "Borrador" ? "Borrador" : "Activo";
}

export function createEnergyContract(draft: EnergyContractDraft) {
  const duplicate = findEnergyContractByCups(draft.cups);
  if (duplicate) {
    throw new Error(`El CUPS ya existe en el contrato ${duplicate.oneReference}.`);
  }

  const contracts = loadEnergyContracts();
  const now = new Date().toISOString();
  const nextNumber =
    contracts.reduce((max, contract) => {
      const value = Number(contract.oneReference.replace(/\D/g, ""));
      return Number.isFinite(value) ? Math.max(max, value) : max;
    }, 253) + 1;

  const contract: EnergyContract = {
    ...draft,
    id: `energy-${Date.now()}`,
    oneReference: `EN-${String(nextNumber).padStart(6, "0")}`,
    cups: normalizeCups(draft.cups),
    documents: [],
    tickets: [],
    operations: [
      { id: `OP-${Date.now()}`, type: "Alta", status: "Pendiente", createdAt: now.slice(0, 10) },
    ],
    timeline: [
      { id: `TL-${Date.now()}`, title: "Contrato creado en ONE", detail: `Creado por ${draft.commercial || "usuario actual"}`, createdAt: now },
    ],
    createdAt: now,
    updatedAt: now,
  };

  saveEnergyContracts([contract, ...contracts]);
  return contract;
}
