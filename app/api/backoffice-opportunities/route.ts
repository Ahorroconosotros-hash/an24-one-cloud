import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

async function ensureWorkflow(opportunityId: string) {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("opportunity_workflow")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing;

  const { data, error } = await supabaseAdmin
    .from("opportunity_workflow")
    .insert({
      opportunity_id: opportunityId,
      status: "sent_backoffice",
      review_status: "pending",
      commercial_editable: true,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function POST(request: NextRequest) {
  try {
    // BackOffice ya no depende del localStorage de un navegador. La bandeja
    // nace de Supabase y, por tanto, es la misma para todos los perfiles.
    const { data: workflow, error: workflowError } = await supabaseAdmin
      .from("opportunity_workflow")
      .select("*")
      .or("status.neq.draft,review_status.eq.correction_requested")
      .order("updated_at", { ascending: false });

    if (workflowError) throw workflowError;

    const opportunityIds = (workflow || [])
      .map((row: any) => String(row.opportunity_id || ""))
      .filter(Boolean);

    const [opportunitiesResult, ticketsResult, productsResult, usersResult] =
      await Promise.all([
        opportunityIds.length
          ? supabaseAdmin
              .from("opportunities")
              .select("id,client_id,title,service,stage,review_status,commercial_editable,estimated_value,notes,payload,product_id,provider_id,commercial_user_id,submitted_at,created_at,updated_at")
              .in("id", opportunityIds)
          : Promise.resolve({ data: [], error: null } as any),
        opportunityIds.length
          ? supabaseAdmin
              .from("opportunity_tickets")
              .select("*")
              .in("opportunity_id", opportunityIds)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null } as any),
        opportunityIds.length
          ? supabaseAdmin
              .from("opportunity_products")
              .select("*")
              .in("opportunity_id", opportunityIds)
          : Promise.resolve({ data: [], error: null } as any),
        supabaseAdmin
          .from("one_users")
          .select("id,name,email,role,active")
          .eq("active", true),
      ]);

    const errors = [
      opportunitiesResult.error,
      ticketsResult.error,
      productsResult.error,
      usersResult.error,
    ].filter(Boolean);
    if (errors.length) throw new Error(errors.map((e: any) => e?.message).join(" | "));

    const opportunities = opportunitiesResult.data || [];
    const clientIds = [...new Set(opportunities.map((o: any) => o.client_id).filter(Boolean))];
    const { data: clients, error: clientsError } = clientIds.length
      ? await supabaseAdmin.from("one_clients").select("id,name,reference").in("id", clientIds)
      : ({ data: [], error: null } as any);
    if (clientsError) throw clientsError;
    const clientById = new Map<string, any>(
  (clients || []).map((c: any) => [String(c.id), c])
);

    const normalized = opportunities.map((op: any) => ({
      id: op.id,
      clientId: op.client_id,
      clientName: clientById.get(String(op.client_id))?.name || "Cliente",
      service: op.service,
      status: op.stage,
      createdAt: op.created_at,
      updatedAt: op.updated_at,
      operator: op.payload?.operator || op.payload?.provider || "",
      productName: op.payload?.productName || op.payload?.product || op.title || "",
      title: op.title,
      estimatedValue: op.estimated_value,
      payload: op.payload || {},
      providerId: op.provider_id,
      productId: op.product_id,
      commercialUserId: op.commercial_user_id,
    }));

    return NextResponse.json({
      ok: true,
      opportunities: normalized,
      workflow: workflow || [],
      tickets: ticketsResult.data || [],
      products: productsResult.data || [],
      users: usersResult.data || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "No se pudo cargar BackOffice." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    const opportunityId = String(body.opportunityId || "").trim();
    const action = String(body.action || "").trim();

    if (!opportunityId) {
      return NextResponse.json(
        { ok: false, error: "Falta opportunityId." },
        { status: 400 }
      );
    }

    const current = await ensureWorkflow(opportunityId);

    const now = new Date().toISOString();
    let patch: Record<string, any> = { updated_at: now };
    let historyTitle = "";
    let historyDescription = "";

    if (action === "assign") {
      patch.commercial_user_id = body.commercialUserId || null;

      // Un solo mundo: la asignación de una oferta actualiza también al cliente
      // central. Así la cartera del comercial, la oferta y la tramitación quedan
      // ligadas al mismo responsable.
      const clientId = String(body.clientId || "").trim();
      const clientName = String(body.clientName || "").trim();
      let commercialName: string | null = null;
      if (body.commercialUserId) {
        const { data: commercial } = await supabaseAdmin
          .from("one_users")
          .select("id,name")
          .eq("id", body.commercialUserId)
          .maybeSingle();
        commercialName = commercial?.name || null;
      }
      if (clientId && clientName) {
        const { data: existingClient } = await supabaseAdmin
          .from("one_clients")
          .select("*")
          .eq("id", clientId)
          .maybeSingle();
        const previousData = existingClient?.data || {};
        const { error: clientError } = await supabaseAdmin.from("one_clients").upsert({
          id: clientId,
          reference: existingClient?.reference || previousData.reference || null,
          name: clientName,
          tax_id: existingClient?.tax_id || previousData.taxId || null,
          client_type: existingClient?.client_type || previousData.type || "Particular",
          status: existingClient?.status || previousData.status || "Cliente",
          commercial_user_id: body.commercialUserId || null,
          commercial_name: commercialName,
          data: { ...previousData, id: clientId, name: clientName, commercial: commercialName || "Sin asignar" },
          updated_at: now,
        }, { onConflict: "id" });
        if (clientError) throw clientError;
      }

      historyTitle = "Comercial asignado";
      historyDescription = body.commercialUserId
        ? `BackOffice asignó la oferta y el cliente a ${commercialName || "un comercial"}.`
        : "BackOffice dejó la oferta y el cliente sin comercial asignado.";
    } else if (action === "start_review") {
      patch.status = "in_review";
      patch.review_status = "pending";
      patch.commercial_editable = true;
      historyTitle = "Revisión iniciada";
    } else if (action === "validate") {
      patch.status = "validated";
      patch.review_status = "validated";
      patch.commercial_editable = false;
      patch.validated_at = now;
      historyTitle = "Oportunidad validada";
    } else if (action === "processing") {
      patch.status = "processing";
      patch.review_status = "validated";
      patch.commercial_editable = false;
      historyTitle = "Oportunidad en tramitación";
    } else if (action === "complete_processing" || action === "activate") {
      // TRAMITADA = nace el contrato. La activación ya pertenece al contrato,
      // no a la oferta/tramitación.
      const { data: opportunity, error: opportunityError } = await supabaseAdmin
        .from("opportunities")
        .select("*")
        .eq("id", opportunityId)
        .maybeSingle();
      if (opportunityError) throw opportunityError;
      if (!opportunity) throw new Error("Oferta no encontrada.");

      const commercialUserId = current.commercial_user_id || opportunity.commercial_user_id || null;
      let commercialName: string | null = null;
      if (commercialUserId) {
        const { data: commercial } = await supabaseAdmin
          .from("one_users")
          .select("id,name")
          .eq("id", commercialUserId)
          .maybeSingle();
        commercialName = commercial?.name || null;
      }

      const { data: productLink } = await supabaseAdmin
        .from("opportunity_products")
        .select("*")
        .eq("opportunity_id", opportunityId)
        .maybeSingle();

      const contractId = `ctr-${opportunityId}`;
      const reference = `ONE-CTR-${String(opportunityId).replace(/[^a-zA-Z0-9]/g, "").slice(-10).toUpperCase()}`;
      const provider = productLink?.provider_name_snapshot || opportunity.payload?.provider || opportunity.payload?.operator || null;
      const serviceName = opportunity.service || productLink?.product_type_snapshot || "Servicio";

      const { data: contract, error: contractError } = await supabaseAdmin
        .from("one_contracts")
        .upsert({
          id: contractId,
          reference,
          opportunity_id: opportunityId,
          client_id: opportunity.client_id,
          service_name: serviceName,
          provider,
          status: "Pendiente de activación",
          monthly_value: opportunity.estimated_value ?? null,
          commercial_user_id: commercialUserId,
          commercial_name: commercialName,
          original_commercial_user_id: commercialUserId,
          original_commercial_name: commercialName,
          data: {
            source: "offer_to_contract",
            offer_id: opportunityId,
            offer_title: opportunity.title,
            offer_payload: opportunity.payload || {},
            product_snapshot: productLink || null,
          },
          updated_at: now,
        }, { onConflict: "opportunity_id" })
        .select("*")
        .single();
      if (contractError) throw contractError;

      patch.status = "contracted";
      patch.review_status = "validated";
      patch.commercial_editable = false;
      patch.activated_at = null;
      historyTitle = "Tramitación completada";
      historyDescription = `Contrato ${contract.reference || contract.id} creado · Pendiente de activación.`;

      try {
        await supabaseAdmin.from("one_client_timeline").insert({
          client_id: opportunity.client_id,
          type: "contract_created",
          title: "Contrato creado",
          detail: `${serviceName} · ${contract.reference || contract.id} · Pendiente de activación`,
          actor_name: "BackOffice",
          created_at: now,
        });
      } catch {}
    } else if (action === "return_draft") {
      const title = String(body.title || "").trim();
      const description = String(body.description || "").trim();

      if (!title || !description) {
        return NextResponse.json(
          {
            ok: false,
            error: "Motivo y comentario son obligatorios.",
          },
          { status: 400 }
        );
      }

      patch.status = "draft";
      patch.review_status = "correction_requested";
      patch.commercial_editable = true;
      patch.validated_at = null;

      const { error: closeError } = await supabaseAdmin
        .from("opportunity_tickets")
        .update({
          status: "resolved",
          resolved_at: now,
          updated_at: now,
        })
        .eq("opportunity_id", opportunityId)
        .eq("status", "open");

      if (closeError) throw closeError;

      const { error: ticketError } = await supabaseAdmin
        .from("opportunity_tickets")
        .insert({
          opportunity_id: opportunityId,
          title,
          description,
          status: "open",
          created_by_role: "BackOffice",
          created_at: now,
          updated_at: now,
        });

      if (ticketError) throw ticketError;

      historyTitle = "Devuelta a borrador";
      historyDescription = `${title}: ${description}`;
    } else {
      return NextResponse.json(
        { ok: false, error: "Acción no válida." },
        { status: 400 }
      );
    }

    const { data: workflow, error: workflowError } = await supabaseAdmin
      .from("opportunity_workflow")
      .update(patch)
      .eq("opportunity_id", opportunityId)
      .select("*")
      .single();

    if (workflowError) throw workflowError;

    const { error: historyError } = await supabaseAdmin
      .from("opportunity_history")
      .insert({
        opportunity_id: opportunityId,
        event_type: action,
        from_status: current.status,
        to_status: workflow.status,
        title: historyTitle,
        description: historyDescription || null,
        user_role: "BackOffice",
        created_at: now,
      });

    if (historyError) throw historyError;

    return NextResponse.json({
      ok: true,
      workflow,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "No se pudo actualizar la oportunidad en BackOffice.",
      },
      { status: 500 }
    );
  }
}
