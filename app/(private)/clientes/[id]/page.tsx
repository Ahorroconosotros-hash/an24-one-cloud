import Client360 from "./Client360";

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Client360 id={id} />;
}
