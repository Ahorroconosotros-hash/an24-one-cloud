import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ cliente?: string }>;
};

export default async function NuevoContratoPage({ searchParams }: Props) {
  const { cliente } = await searchParams;
  const query = cliente ? `?cliente=${encodeURIComponent(cliente)}` : "";

  // ONE: + Contrato siempre significa contratación directa.
  // Las ofertas/presupuestos se gestionan desde su propio módulo.
  redirect(`/operaciones/nueva${query}`);
}
