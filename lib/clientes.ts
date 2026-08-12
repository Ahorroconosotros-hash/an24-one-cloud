export type ClientType = "Particular" | "Autónomo" | "Empresa";
export type ClientStatus = "Prospecto" | "Cliente" | "Oportunidad" | "Inactivo";

export type ClientContact = {
  id: string;
  name: string;
  dni: string;
  role: string;
  phone: string;
  email: string;
  main: boolean;
};

export type ClientRecord = {
  id: string;
  reference: string;
  type: ClientType;
  status: ClientStatus;
  name: string;
  taxId: string;
  birthDate: string;
  incorporationDate: string;
  iban: string;
  phone: string;
  mobile: string;
  email: string;
  address: string;
  postalCode: string;
  city: string;
  province: string;
  sector: string;
  commercial: string;
  services: string[];
  notes: string;
  contacts: ClientContact[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type ClientDraft = Omit<ClientRecord, "id" | "reference" | "createdAt" | "updatedAt" | "deletedAt">;

const STORAGE_KEY = "one_clients_v1";

const defaults: ClientRecord[] = [
  {
    id: "clinica-dental-sur",
    reference: "ONE-1042",
    type: "Empresa",
    status: "Cliente",
    name: "Clínica Dental Sur",
    taxId: "B11876543",
    birthDate: "",
    incorporationDate: "2012-03-14",
    iban: "ES9121000418450200051332",
    phone: "956 123 456",
    mobile: "600 123 456",
    email: "maria@clinicadentalsur.es",
    address: "Av. Europa 24",
    postalCode: "11405",
    city: "Jerez de la Frontera",
    province: "Cádiz",
    sector: "Salud",
    commercial: "Equipo Empresas",
    services: ["Energía", "Telefonía", "Alarmas"],
    notes: "Cliente estratégico. Revisar renovación energética.",
    contacts: [
      {
        id: "contact-maria",
        name: "María Gómez Ortega",
        dni: "31678945P",
        role: "Gerente",
        phone: "600 123 456",
        email: "maria@clinicadentalsur.es",
        main: true,
      },
    ],
    createdAt: "2023-03-01T10:00:00.000Z",
    updatedAt: "2026-07-30T08:42:00.000Z",
    deletedAt: null,
  },
  {
    id: "restaurante-albores",
    reference: "ONE-1043",
    type: "Empresa",
    status: "Cliente",
    name: "Restaurante Albores",
    taxId: "B72123456",
    birthDate: "",
    incorporationDate: "2018-06-21",
    iban: "ES7620770024003102575766",
    phone: "956 456 789",
    mobile: "610 555 214",
    email: "administracion@albores.es",
    address: "Calle Consistorio 12",
    postalCode: "11403",
    city: "Jerez de la Frontera",
    province: "Cádiz",
    sector: "Hostelería",
    commercial: "Equipo Comercios",
    services: ["TPV", "Alarmas"],
    notes: "",
    contacts: [
      {
        id: "contact-juan",
        name: "Juan Manuel Pérez",
        dni: "31765432R",
        role: "Administrador",
        phone: "610 555 214",
        email: "juan@albores.es",
        main: true,
      },
    ],
    createdAt: "2024-01-12T09:00:00.000Z",
    updatedAt: "2026-07-29T12:20:00.000Z",
    deletedAt: null,
  },
  {
    id: "antonio-ruiz",
    reference: "ONE-1044",
    type: "Particular",
    status: "Oportunidad",
    name: "Antonio Ruiz Gómez",
    taxId: "31654321S",
    birthDate: "1984-11-09",
    incorporationDate: "",
    iban: "ES9820385778983000760236",
    phone: "",
    mobile: "644 210 987",
    email: "antonio.ruiz@email.es",
    address: "Calle Larga 88",
    postalCode: "11402",
    city: "Jerez de la Frontera",
    province: "Cádiz",
    sector: "",
    commercial: "Jesús Martínez",
    services: ["Energía"],
    notes: "Pendiente de aceptar propuesta.",
    contacts: [],
    createdAt: "2026-07-18T10:00:00.000Z",
    updatedAt: "2026-07-18T10:00:00.000Z",
    deletedAt: null,
  },
];

function canUseStorage() {
  return typeof window !== "undefined";
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, "").replace(/[-./]/g, "");
}

export function loadClients(): ClientRecord[] {
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

export function saveClients(clients: ClientRecord[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}

export function getClient(id: string) {
  return loadClients().find((client) => client.id === id) ?? null;
}

export function createClient(draft: ClientDraft) {
  const clients = loadClients();
  const normalizedTaxId = normalize(draft.taxId || "");
  const duplicateTaxId = clients.find(
    (client) => !client.deletedAt && normalizedTaxId && normalize(client.taxId) === normalizedTaxId
  );
  if (duplicateTaxId) {
    throw new Error(`El DNI/NIE/CIF ya existe en ${duplicateTaxId.reference}: ${duplicateTaxId.name}.`);
  }
  const now = new Date().toISOString();
  const nextNumber =
    clients.reduce((max, client) => {
      const value = Number(client.reference.replace(/\D/g, ""));
      return Number.isFinite(value) ? Math.max(max, value) : max;
    }, 1041) + 1;

  const baseSlug =
    draft.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "cliente";

  const client: ClientRecord = {
    ...draft,
    id: `${baseSlug}-${Date.now().toString().slice(-5)}`,
    reference: `ONE-${nextNumber}`,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  saveClients([client, ...clients]);
  return client;
}

export function updateClient(id: string, draft: ClientDraft) {
  const clients = loadClients();
  const normalizedTaxId = normalize(draft.taxId || "");
  const duplicateTaxId = clients.find(
    (client) => client.id !== id && !client.deletedAt && normalizedTaxId && normalize(client.taxId) === normalizedTaxId
  );
  if (duplicateTaxId) {
    throw new Error(`El DNI/NIE/CIF ya existe en ${duplicateTaxId.reference}: ${duplicateTaxId.name}.`);
  }
  const updated = clients.map((client) =>
    client.id === id
      ? { ...client, ...draft, updatedAt: new Date().toISOString() }
      : client
  );
  saveClients(updated);
  return updated.find((client) => client.id === id) ?? null;
}

export function trashClient(id: string) {
  const clients = loadClients().map((client) =>
    client.id === id
      ? { ...client, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      : client
  );
  saveClients(clients);
}

export function restoreClient(id: string) {
  const clients = loadClients().map((client) =>
    client.id === id
      ? { ...client, deletedAt: null, updatedAt: new Date().toISOString() }
      : client
  );
  saveClients(clients);
}

export function permanentlyDeleteClient(id: string) {
  saveClients(loadClients().filter((client) => client.id !== id));
}

export function duplicateClient(id: string) {
  const clients = loadClients();
  const source = clients.find((client) => client.id === id);
  if (!source) return null;

  const copy = createClient({
    type: source.type,
    status: "Oportunidad",
    name: `${source.name} (copia)`,
    taxId: "",
    birthDate: source.birthDate,
    incorporationDate: source.incorporationDate,
    iban: "",
    phone: source.phone,
    mobile: source.mobile,
    email: "",
    address: source.address,
    postalCode: source.postalCode,
    city: source.city,
    province: source.province,
    sector: source.sector,
    commercial: source.commercial,
    services: [...source.services],
    notes: `Ficha duplicada desde ${source.reference}. Revisa DNI/CIF, email e IBAN.`,
    contacts: source.contacts.map((contact) => ({
      ...contact,
      id: `${contact.id}-${Date.now()}`,
      dni: "",
      email: "",
    })),
  });

  return copy;
}

export function findDuplicateClients(
  draft: Pick<ClientDraft, "taxId" | "phone" | "mobile" | "email" | "iban">,
  excludeId?: string
) {
  const taxId = normalize(draft.taxId || "");
  const phone = normalize(draft.mobile || draft.phone || "");
  const email = normalize(draft.email || "");
  const iban = normalize(draft.iban || "");

  return loadClients().filter((client) => {
    if (client.id === excludeId || client.deletedAt) return false;
    return (
      (taxId && normalize(client.taxId) === taxId) ||
      (phone && [client.phone, client.mobile].some((value) => normalize(value) === phone)) ||
      (email && normalize(client.email) === email) ||
      (iban && normalize(client.iban) === iban)
    );
  });
}

export function emptyClientDraft(): ClientDraft {
  return {
    type: "Particular",
    status: "Cliente",
    name: "",
    taxId: "",
    birthDate: "",
    incorporationDate: "",
    iban: "",
    phone: "",
    mobile: "",
    email: "",
    address: "",
    postalCode: "",
    city: "",
    province: "",
    sector: "",
    commercial: "",
    services: [],
    notes: "",
    contacts: [],
  };
}
