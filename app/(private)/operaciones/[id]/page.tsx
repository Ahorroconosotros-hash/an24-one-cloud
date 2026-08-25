import { redirect } from "next/navigation";

type Props={params:Promise<{id:string}>};
export default async function OperacionLegacyDetail({params}:Props){
  const {id}=await params;
  redirect(`/contratos/${encodeURIComponent(id)}`);
}
