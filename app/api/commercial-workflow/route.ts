import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type OneUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  active?: boolean | null;
};

async function requireOneUser(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!token) {
    return {
      error: NextResponse.json(
        { ok: false, error: "Sesión no encontrada." },
        { status: 401 }
      ),
      oneUser: null as OneUser | null,
    };
  }

  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return {
      error: NextResponse.json(
        { ok: false, error: "Sesión no válida." },
        { status: 401 }
      ),
      oneUser: null as OneUser | null,
    };
  }

  const { data: oneUser, error } = await supabaseAdmin
    .from("one_users")
    .select("id,name,email,role,active")
    .eq("auth_user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    return {
      error: NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      ),
      oneUser: null as OneUser | null,
    };
  }

  if (!oneUser) {
    return {
      error: NextResponse.json(
        { ok: false, error: "Usuario ONE no vinculado o inactivo." },
        { status: 403 }
      ),
      oneUser: null as OneUser | null,
    };
  }

  return { error: null, oneUser: oneUser as OneUser };
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireOneUser(request);
    if (authResult.error) return authResult.error;

    const oneUser = authResult.oneUser!;
    const body = await request.json();
    const requestedIds = Array.isArray(body?.opportunityIds)
      ? body.opportunityIds.map(String).filter(Boolean)
      : [];

    if (!requestedIds.length) {
      return NextResponse.json({
        ok: true,
        allowedOpportunityIds: [],
        workflow: [],
        tickets: [],
        products: [],
      });
    }

    let workflowQuery = supabaseAdmin
      .from("opportunity_workflow")
      .select("*")
      .in("opportunity_id", requestedIds);

    // Regla central: un Comercial SOLO puede leer oportunidades asignadas a él.
    // Administrador y BackOffice conservan visión global operativa.
    if (oneUser.role === "Comercial") {
      workflowQuery = workflowQuery.eq("commercial_user_id", oneUser.id);
    }

    const workflowResult = await workflowQuery;

    if (workflowResult.error) {
      return NextResponse.json(
        { ok: false, error: workflowResult.error.message },
        { status: 500 }
      );
    }

    const workflow = workflowResult.data || [];
    const allowedOpportunityIds = workflow
      .map((row: any) => String(row.opportunity_id || ""))
      .filter(Boolean);

    if (!allowedOpportunityIds.length) {
      return NextResponse.json({
        ok: true,
        allowedOpportunityIds: [],
        workflow: [],
        tickets: [],
        products: [],
      });
    }

    const [ticketsResult, productsResult] = await Promise.all([
      supabaseAdmin
        .from("opportunity_tickets")
        .select("*")
        .in("opportunity_id", allowedOpportunityIds)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("opportunity_products")
        .select("*")
        .in("opportunity_id", allowedOpportunityIds),
    ]);

    const errors = [ticketsResult.error, productsResult.error].filter(Boolean);

    if (errors.length) {
      return NextResponse.json(
        { ok: false, error: errors.map((x) => x?.message).join(" | ") },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      allowedOpportunityIds,
      workflow,
      tickets: ticketsResult.data || [],
      products: productsResult.data || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "No se pudo cargar la bandeja comercial",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireOneUser(request);
    if (authResult.error) return authResult.error;

    const oneUser = authResult.oneUser!;

    if (oneUser.role !== "Comercial") {
      return NextResponse.json(
        { ok: false, error: "Esta acción corresponde al perfil Comercial." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const opportunityId = String(body?.opportunityId || "").trim();
    const requestedStatus = String(body?.status || "draft");

    if (!opportunityId) {
      return NextResponse.json(
        { ok: false, error: "Falta opportunityId." },
        { status: 400 }
      );
    }

    const status = requestedStatus === "sent_backoffice" ? "sent_backoffice" : "draft";
    const now = new Date().toISOString();

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("opportunity_workflow")
      .select("*")
      .eq("opportunity_id", opportunityId)
      .maybeSingle();

    if (existingError) throw existingError;

    // Nunca permitimos que un comercial se apropie de una oportunidad de otro.
    if (
      existing?.commercial_user_id &&
      existing.commercial_user_id !== oneUser.id
    ) {
      return NextResponse.json(
        { ok: false, error: "Esta oportunidad pertenece a otro comercial." },
        { status: 403 }
      );
    }

    let workflowResult;

    if (existing) {
      workflowResult = await supabaseAdmin
        .from("opportunity_workflow")
        .update({
          commercial_user_id: oneUser.id,
          status,
          review_status:
            existing.review_status === "correction_requested"
              ? existing.review_status
              : "pending",
          commercial_editable: true,
          updated_at: now,
        })
        .eq("opportunity_id", opportunityId)
        .select("*")
        .single();
    } else {
      workflowResult = await supabaseAdmin
        .from("opportunity_workflow")
        .insert({
          opportunity_id: opportunityId,
          commercial_user_id: oneUser.id,
          status,
          review_status: "pending",
          commercial_editable: true,
          updated_at: now,
        })
        .select("*")
        .single();
    }

    if (workflowResult.error) throw workflowResult.error;

    return NextResponse.json({
      ok: true,
      workflow: workflowResult.data,
      commercial: {
        id: oneUser.id,
        name: oneUser.name,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "No se pudo registrar la oportunidad comercial.",
      },
      { status: 500 }
    );
  }
}
