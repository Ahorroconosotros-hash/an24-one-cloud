export function normalizeCompact(value: unknown) {
  return String(value ?? "").toUpperCase().replace(/\s+/g, "").trim();
}

export function normalizeCups(value: unknown) {
  return normalizeCompact(value);
}

export function isValidSpanishCups(value: unknown) {
  const cups = normalizeCups(value);
  return /^ES[A-Z0-9]{18,20}$/.test(cups);
}

export function normalizeIban(value: unknown) {
  return normalizeCompact(value);
}

export function isValidIban(value: unknown) {
  const iban = normalizeIban(value);
  if (!/^[A-Z]{2}[0-9A-Z]{13,32}$/.test(iban)) return false;
  if (iban.startsWith("ES") && !/^ES\d{22}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const chunk = /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char;
    for (const digit of chunk) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

export function isValidSpanishPhone(value: unknown) {
  const phone = String(value ?? "").replace(/[^0-9]/g, "");
  const normalized = phone.startsWith("34") && phone.length === 11 ? phone.slice(2) : phone;
  return /^[6789]\d{8}$/.test(normalized);
}

export function isValidEmail(value: unknown) {
  const email = String(value ?? "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isRealPastDate(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
  const d = new Date(`${raw}T00:00:00`);
  return !Number.isNaN(d.getTime()) && d.getTime() < Date.now();
}

export const ENERGY_REQUIRED_DOCUMENTS = ["DNI / NIE", "Factura", "Titularidad bancaria"] as const;

export function documentTypeMatches(actual: unknown, required: string) {
  const a = String(actual ?? "").trim().toLocaleLowerCase("es");
  const r = required.toLocaleLowerCase("es");
  if (r === "dni / nie") return a === "dni / nie" || a === "cif" || a === "dni / cif";
  return a === r;
}

export function energyValidation(data: any, documents: any[] = [], requireVerified = false) {
  const missing: string[] = [];
  const invalid: string[] = [];

  const taxId = String(data?.tax_id || data?.taxId || "").trim();
  const birthDate = String(data?.birth_date || data?.birthDate || "").trim();
  const phone = String(data?.phone || data?.mobile || "").trim();
  const email = String(data?.email || "").trim();
  const address = String(data?.supply_address || data?.address || "").trim();
  const cups = normalizeCups(data?.cups);
  const iban = normalizeIban(data?.iban);

  if (!taxId) missing.push("DNI/NIE/CIF");
  if (!birthDate) missing.push("Fecha de nacimiento"); else if (!isRealPastDate(birthDate)) invalid.push("Fecha de nacimiento");
  if (!phone) missing.push("Teléfono"); else if (!isValidSpanishPhone(phone)) invalid.push("Teléfono");
  if (!email) missing.push("Email"); else if (!isValidEmail(email)) invalid.push("Email");
  if (!address) missing.push("Dirección de suministro");
  if (!cups) missing.push("CUPS"); else if (!isValidSpanishCups(cups)) invalid.push("CUPS");
  if (!iban) missing.push("IBAN"); else if (!isValidIban(iban)) invalid.push("IBAN");

  const missingDocuments = ENERGY_REQUIRED_DOCUMENTS.filter(req => !documents.some(doc => documentTypeMatches(doc?.type, req)));
  const unverifiedDocuments = requireVerified ? ENERGY_REQUIRED_DOCUMENTS.filter(req => !documents.some(doc => documentTypeMatches(doc?.type, req) && doc?.verification_status === "Verificado")) : [];

  return { ok: missing.length === 0 && invalid.length === 0 && missingDocuments.length === 0 && unverifiedDocuments.length === 0, missing, invalid, missingDocuments, unverifiedDocuments, cups, iban };
}





export const ALARM_BASE_DOCUMENTS = ["SEPA firmado", "Titularidad bancaria"] as const;

export function getAlarmRequiredDocuments(data:any) {
  const company = String(data?.customer_type || data?.client_type || "").toLocaleLowerCase("es").includes("empresa");
  const hasCurrent = String(data?.has_current_alarm || "").toLocaleLowerCase("es") === "si";
  const docs:string[] = company
    ? ["CIF", "Escrituras", "DNI representante", ...ALARM_BASE_DOCUMENTS]
    : ["DNI / NIE", ...ALARM_BASE_DOCUMENTS];
  if (hasCurrent) docs.push("Factura anterior");
  return docs;
}

export function alarmValidation(data:any, documents:any[]=[], requireVerified=false){
  const missing:string[]=[]; const invalid:string[]=[];
  const taxId=String(data?.tax_id||data?.taxId||"").trim();
  const phone=String(data?.phone||data?.mobile||"").trim();
  const email=String(data?.email||"").trim();
  const address=String(data?.installation_address||data?.supply_address||data?.address||"").trim();
  const iban=normalizeIban(data?.iban);
  const propertyType=String(data?.property_type||"").trim();
  const installationContact=String(data?.installation_contact||"").trim();
  const hasCurrentAlarm=String(data?.has_current_alarm||"").trim();
  const currentCompany=String(data?.current_alarm_company||"").trim();
  const manageCancellation=String(data?.manage_previous_alarm_cancellation||"").trim();

  if(!taxId) missing.push("DNI/NIE/CIF");
  if(!phone) missing.push("Teléfono"); else if(!isValidSpanishPhone(phone)) invalid.push("Teléfono");
  if(!email) missing.push("Email"); else if(!isValidEmail(email)) invalid.push("Email");
  if(!address) missing.push("Domicilio de instalación");
  if(!iban) missing.push("IBAN"); else if(!isValidIban(iban)) invalid.push("IBAN");
  if(!propertyType) missing.push("Tipo de inmueble");
  if(!installationContact) missing.push("Contacto de instalación");
  if(!["si","no"].includes(hasCurrentAlarm.toLocaleLowerCase("es"))) missing.push("¿Tiene alarma actualmente?");
  if(hasCurrentAlarm.toLocaleLowerCase("es")==="si"){
    if(!currentCompany) missing.push("Compañía de alarma actual");
    if(!["si","no"].includes(manageCancellation.toLocaleLowerCase("es"))) missing.push("¿Gestionamos la baja?");
  }

  const requiredDocuments=getAlarmRequiredDocuments(data);
  const missingDocuments=requiredDocuments.filter(req=>!documents.some(doc=>documentTypeMatches(doc?.type,req)));
  const unverifiedDocuments=requireVerified
    ? requiredDocuments.filter(req=>!documents.some(doc=>documentTypeMatches(doc?.type,req)&&doc?.verification_status==="Verificado"))
    : [];

  return {
    ok:missing.length===0&&invalid.length===0&&missingDocuments.length===0&&unverifiedDocuments.length===0,
    missing,invalid,missingDocuments,unverifiedDocuments,iban,requiredDocuments
  };
}
