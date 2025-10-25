import { createClient } from "@supabase/supabase-js";

async function getSupabaseConfig() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    return { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY };
  }

  try {
    const local = await import("../supabaseConfig.js");
    return {
      SUPABASE_URL: SUPABASE_URL || local.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_ROLE_KEY || local.SUPABASE_SERVICE_ROLE_KEY,
    };
  } catch (err) {
    throw new Error("Faltan variables de entorno de Supabase y no existe supabaseConfig.js");
  }
}

export async function PUT(req) {
  try {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = await getSupabaseConfig();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    console.log("Request body received in updateProduct:", body);

    // Normalizar idpatineta y validarlo correctamente
    const idpatinetaRaw = body.idpatineta ?? body.idPatineta ?? body.id;
    const idpatineta = idpatinetaRaw == null ? null : Number(idpatinetaRaw);
    if (idpatineta === null || Number.isNaN(idpatineta)) {
      return new Response(JSON.stringify({ success: false, error: "idpatineta inválido o ausente" }), { status: 400 });
    }

    // Campos opcionales
    const modelo = Object.prototype.hasOwnProperty.call(body, "modelo") ? body.modelo : undefined;
    const numero_serie = Object.prototype.hasOwnProperty.call(body, "numero_serie") ? body.numero_serie : undefined;
    const fecha_compra = Object.prototype.hasOwnProperty.call(body, "fecha_compra") ? body.fecha_compra : undefined;
    const ultima_revision = Object.prototype.hasOwnProperty.call(body, "ultima_revision") ? body.ultima_revision : undefined;
    const observaciones = Object.prototype.hasOwnProperty.call(body, "observaciones") ? body.observaciones : undefined;

    // Detectar si cliente envió idestado explícitamente (incluir null si quiere limpiar)
    const hasIdestado =
      Object.prototype.hasOwnProperty.call(body, "idestado") ||
      Object.prototype.hasOwnProperty.call(body, "idEstado") ||
      Object.prototype.hasOwnProperty.call(body, "id_estado");

    let idestadoValue;
    if (hasIdestado) {
      const raw = body.idestado ?? body.idEstado ?? body.id_estado;
      if (raw === null || raw === "") {
        idestadoValue = null;
      } else {
        idestadoValue = Number(raw);
        if (Number.isNaN(idestadoValue)) {
          return new Response(JSON.stringify({ success: false, error: "idestado no es un número válido" }), { status: 400 });
        }
      }
    }

    // Construir objeto updates sólo con campos presentes
    const updates = {};
    if (modelo !== undefined) updates.modelo = modelo;
    if (numero_serie !== undefined) updates.numero_serie = numero_serie;
    if (fecha_compra !== undefined) updates.fecha_compra = fecha_compra;
    if (ultima_revision !== undefined) updates.ultima_revision = ultima_revision;
    if (observaciones !== undefined) updates.observaciones = observaciones;
    if (hasIdestado) updates.idestado = idestadoValue;

    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({ success: false, error: "No hay campos para actualizar" }), { status: 400 });
    }

    const { data, error } = await supabase
      .from("patinetas")
      .update(updates)
      .eq("idpatineta", idpatineta)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Supabase update error:", error);
      return new Response(JSON.stringify({ success: false, error: error.message || error }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, product: data }), { status: 200 });
  } catch (error) {
    console.error("Unhandled error in updateProduct:", error);
    return new Response(JSON.stringify({ success: false, error: error.message || String(error) }), { status: 500 });
  }
}
