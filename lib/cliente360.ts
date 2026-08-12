import type { ClientRecord } from "@/lib/clientes";
import { getClientContracts, SERVICE_PRESENTATION, type OneContract } from "@/lib/contratos";

export type ClientServiceSummary = {
  service: string;
  icon: string;
  count: number;
  countLabel: string;
  activeCount: number;
  productsCount: number;
  contracts: OneContract[];
};

export const ONE_SERVICE_CATALOG = [
  { name: "Energía", icon: "⚡" },
  { name: "Telefonía", icon: "📱" },
  { name: "Alarmas", icon: "🚨" },
  { name: "Seguros", icon: "🛡️" },
  { name: "Asesoramiento", icon: "🤝" },
  { name: "Inmobiliaria", icon: "🏠" },
  { name: "IA", icon: "✨" },
] as const;

export function getClientServiceSummaries(client: ClientRecord): ClientServiceSummary[] {
  const contracts = getClientContracts(client.id);
  const services = new Set([...client.services, ...contracts.map((item) => item.service)]);

  return Array.from(services).map((service) => {
    const serviceContracts = contracts.filter((item) => item.service === service);
    const presentation = SERVICE_PRESENTATION[service] ?? { icon: "📦", label: "contratos" };
    return {
      service,
      icon: presentation.icon,
      count: serviceContracts.length,
      countLabel: presentation.label,
      activeCount: serviceContracts.filter((item) => item.status === "Activo").length,
      productsCount: serviceContracts.reduce((sum, item) => sum + item.products.reduce((acc, product) => acc + product.quantity, 0), 0),
      contracts: serviceContracts,
    };
  });
}

export function clientCommercialPotential(activeServices: string[]) {
  const active = new Set(activeServices);
  return ONE_SERVICE_CATALOG.filter((item) => !active.has(item.name));
}
