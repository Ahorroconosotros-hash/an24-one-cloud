import { supabaseBrowser } from "@/lib/supabase-browser";

export type OneRole = "Administrador" | "BackOffice" | "Comercial";

export type CurrentOneUser = {
  id: string;
  auth_user_id?: string | null;
  name: string;
  email: string;
  role: OneRole;
  active?: boolean;
  can_create_clients?: boolean;
  can_edit_clients?: boolean;
  can_assign_clients?: boolean;
};

export async function getCurrentOneUser(): Promise<CurrentOneUser> {
  const { data: { session } } = await supabaseBrowser.auth.getSession();
  if (!session?.access_token) throw new Error("Sesión no encontrada.");

  const response = await fetch("/api/current-one-user", {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok || !data?.ok || !data?.user) {
    throw new Error(data?.error || "No se pudo identificar el usuario de ONE.");
  }
  return data.user as CurrentOneUser;
}

export function canSeeClient(user: CurrentOneUser, commercialName: string) {
  if (user.role === "Administrador" || user.role === "BackOffice") return true;
  return user.role === "Comercial" && commercialName.trim().toLocaleLowerCase("es") === user.name.trim().toLocaleLowerCase("es");
}
