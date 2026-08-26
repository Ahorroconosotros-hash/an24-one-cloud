import fs from "node:fs";

const file = "app/(private)/dashboard/page.tsx";
let t = fs.readFileSync(file, "utf8");

t = t.replace(
  'import AdminDashboard from "@/components/dashboard/AdminDashboard";',
  'import { AdminDashboard } from "@/components/dashboard/AdminDashboard";'
);

if (!t.includes('import { AdminDashboard } from "@/components/dashboard/AdminDashboard";')) {
  throw new Error("No se pudo confirmar el import de AdminDashboard.");
}

if (!t.includes('return <AdminDashboard userName={userName} />')) {
  throw new Error("Mi Día todavía no está conectado a AdminDashboard.");
}

fs.writeFileSync(file, t);
console.log("✅ AdminDashboard instalado y conectado correctamente.");
