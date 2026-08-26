import fs from "node:fs";

const file = "app/(private)/dashboard/page.tsx";
let t = fs.readFileSync(file, "utf8");

const importLine = 'import AdminDashboard from "@/components/dashboard/AdminDashboard";';
const importAnchor = 'import { supabaseBrowser } from "@/lib/supabase-browser";';

if (!t.includes(importLine)) {
  if (!t.includes(importAnchor)) throw new Error("No encuentro el import de supabase-browser.");
  t = t.replace(importAnchor, importAnchor + "\n" + importLine);
}

const returnAnchor = '  return (\n    <>';
const adminReturn = '  if (userRole === "Administrador") {\n    return <AdminDashboard userName={userName} />;\n  }\n\n';

if (!t.includes('return <AdminDashboard userName={userName} />')) {
  if (!t.includes(returnAnchor)) throw new Error("No encuentro el return principal del dashboard.");
  t = t.replace(returnAnchor, adminReturn + returnAnchor);
}

fs.writeFileSync(file, t);
console.log("✅ Mi Día de Administrador conectado.");
