import { redirect } from "next/navigation";

type LegacyPageProps = {
  searchParams: Promise<{ cliente?: string }>;
};

export default async function LegacyNewEnergyContractPage({
  searchParams,
}: LegacyPageProps) {
  const { cliente } = await searchParams;
  const query = cliente ? `?cliente=${encodeURIComponent(cliente)}` : "";
  redirect(`/oportunidades/nuevo/energia${query}`);
}
