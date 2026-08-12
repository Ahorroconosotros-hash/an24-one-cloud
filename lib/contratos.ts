export type ContractStatus = "Borrador" | "Pendiente BackOffice" | "Tramitado" | "Activo" | "Incidencia" | "Baja";

export type ContractProduct = {
  id: string;
  name: string;
  quantity: number;
  commissionMode: "Contrato" | "Producto";
  commissionAmount?: number;
  details?: string;
};

export type OneContract = {
  id: string;
  reference: string;
  clientId: string;
  service: string;
  provider: string;
  mainProduct: string;
  status: ContractStatus;
  cups?: string;
  supplyType?: "Luz" | "Gas";
  providerContractReference?: string;
  policyNumber?: string;
  products: ContractProduct[];
  commercial: string;
  backoffice: string;
  activationDate: string;
  renewalDate: string;
  createdAt: string;
  updatedAt: string;
};

export type ContractDraft = Omit<OneContract, "id" | "reference" | "createdAt" | "updatedAt">;

const STORAGE_KEY = "one_contracts_v2";

function canUseStorage() {
  return typeof window !== "undefined";
}

function normalize(value: string | undefined) {
  return (value ?? "").toUpperCase().replace(/\s+/g, "").replace(/[-./]/g, "");
}

function addMonths(value: string, months: number) {
  const base = value ? new Date(`${value}T12:00:00`) : new Date();
  base.setMonth(base.getMonth() + months);
  return base.toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const sampleContracts: OneContract[] = [
  {
    id: "ctr-clinica-energia-1",
    reference: "ONE-CTR-000001",
    clientId: "clinica-dental-sur",
    service: "Energía",
    provider: "GANA Energía",
    mainProduct: "Luz · Tarifa 2.0TD",
    status: "Activo",
    cups: "ES0021000001234567AA",
    supplyType: "Luz",
    products: [{ id: "prod-luz-1", name: "Suministro eléctrico", quantity: 1, commissionMode: "Contrato" }],
    commercial: "Equipo Empresas",
    backoffice: "BackOffice Central",
    activationDate: "2025-03-14",
    renewalDate: "2026-03-14",
    createdAt: "2025-03-10T10:00:00.000Z",
    updatedAt: "2026-07-30T08:42:00.000Z",
  },
  {
    id: "ctr-clinica-telefonia-1",
    reference: "ONE-CTR-000002",
    clientId: "clinica-dental-sur",
    service: "Telefonía",
    provider: "Finetwork",
    mainProduct: "Fibra + líneas móviles",
    status: "Activo",
    providerContractReference: "FIN-845123",
    products: [
      { id: "prod-fibra-1", name: "Fibra 600 Mb", quantity: 1, commissionMode: "Producto" },
      { id: "prod-linea-1", name: "Línea móvil 100 GB", quantity: 1, commissionMode: "Producto", details: "600 123 456" },
      { id: "prod-linea-2", name: "Línea móvil 60 GB", quantity: 1, commissionMode: "Producto", details: "600 123 457" },
    ],
    commercial: "Equipo Empresas",
    backoffice: "BackOffice Central",
    activationDate: "2025-04-29",
    renewalDate: "2027-04-29",
    createdAt: "2025-04-20T10:00:00.000Z",
    updatedAt: "2026-07-30T08:42:00.000Z",
  },
  {
    id: "ctr-clinica-alarmas-1",
    reference: "ONE-CTR-000003",
    clientId: "clinica-dental-sur",
    service: "Alarmas",
    provider: "SEGURMA",
    mainProduct: "Avanzada 2",
    status: "Activo",
    providerContractReference: "SEG-445821",
    products: [
      { id: "prod-avanzada-2", name: "Avanzada 2", quantity: 1, commissionMode: "Contrato", details: "Producto principal" },
      { id: "prod-pirca", name: "PIRCA", quantity: 2, commissionMode: "Producto" },
      { id: "prod-pir", name: "PIR", quantity: 3, commissionMode: "Producto" },
      { id: "prod-camara", name: "Cámara", quantity: 1, commissionMode: "Producto" },
      { id: "prod-mando", name: "Mando", quantity: 1, commissionMode: "Producto" },
    ],
    commercial: "Equipo Empresas",
    backoffice: "BackOffice Central",
    activationDate: "2025-06-10",
    renewalDate: "2027-06-10",
    createdAt: "2025-06-02T10:00:00.000Z",
    updatedAt: "2026-07-30T08:42:00.000Z",
  },
];

export function loadContracts(): OneContract[] {
  if (!canUseStorage()) return sampleContracts;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleContracts));
      return sampleContracts;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : sampleContracts;
  } catch {
    return sampleContracts;
  }
}

export function saveContracts(items: OneContract[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function getClientContracts(clientId: string) {
  return loadContracts().filter((item) => item.clientId === clientId);
}

export function getContract(contractId: string) {
  return loadContracts().find((item) => item.id === contractId) ?? null;
}

export function getClientServiceContracts(clientId: string, service: string) {
  return getClientContracts(clientId).filter((item) => item.service.toLowerCase() === decodeURIComponent(service).toLowerCase());
}

export function findContractByCups(cups: string, excludeId?: string) {
  const normalized = normalize(cups);
  if (!normalized) return null;
  return loadContracts().find((item) => item.id !== excludeId && normalize(item.cups) === normalized) ?? null;
}

export function createContract(draft: ContractDraft) {
  if (draft.service === "Energía" && draft.cups) {
    const existing = findContractByCups(draft.cups);
    if (existing) {
      return { ok: false as const, reason: "CUPS_DUPLICADO" as const, contract: existing };
    }
  }

  const contracts = loadContracts();
  const nextNumber = contracts.reduce((max, item) => {
    const value = Number(item.reference.replace(/\D/g, ""));
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0) + 1;
  const now = new Date().toISOString();
  const contract: OneContract = {
    ...draft,
    id: `ctr-${Date.now()}`,
    reference: `ONE-CTR-${String(nextNumber).padStart(6, "0")}`,
    activationDate: draft.activationDate || today(),
    renewalDate: draft.renewalDate || addMonths(draft.activationDate || today(), 12),
    createdAt: now,
    updatedAt: now,
  };
  saveContracts([contract, ...contracts]);
  return { ok: true as const, contract };
}

export const SERVICE_PRESENTATION: Record<string, { icon: string; label: string }> = {
  Energía: { icon: "⚡", label: "contratos" },
  Telefonía: { icon: "📱", label: "contratos" },
  Alarmas: { icon: "🚨", label: "contratos" },
  Seguros: { icon: "🛡️", label: "pólizas" },
  TPV: { icon: "💳", label: "contratos" },
  Certificados: { icon: "📄", label: "certificados" },
  Asesoramiento: { icon: "⚖️", label: "servicios" },
};
