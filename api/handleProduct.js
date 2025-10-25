import { createClient } from "@supabase/supabase-js";

// 🧩 Utilidad para obtener la configuración de Supabase
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
    throw new Error("No se encontró configuración de Supabase.");
  }
}

// 🧠 Crear instancia de Supabase
async function getSupabaseClient() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = await getSupabaseConfig();
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// 🚀 Manejador principal de métodos HTTP
export default async function handler(req, res) {
  try {
    const supabase = await getSupabaseClient();
    const method = req.method.toUpperCase();

    switch (method) {
      // 📦 Obtener productos
      case "GET": {
        const { data, error } = await supabase
          .from("patinetas")
          .select("idpatineta, modelo, numero_serie, fecha_compra, idestado, ultima_revision, observaciones")
          .order("idpatineta", { ascending: true });

        if (error) throw error;
        return res.status(200).json(data);
      }

      // ➕ Crear producto
      case "POST": {
        const { modelo, numero_serie, fecha_compra, idestado, ultima_revision, observaciones } = req.body;

        if (!modelo || !numero_serie || !fecha_compra) {
          return res.status(400).json({ error: "Faltan campos obligatorios (modelo, numero_serie, fecha_compra)" });
        }

        // Obtener último ID
        const { data: last, error: getError } = await supabase
          .from("patinetas")
          .select("idpatineta")
          .order("idpatineta", { ascending: false })
          .limit(1);

        if (getError) throw getError;
        const nextId = last?.[0]?.idpatineta ? last[0].idpatineta + 1 : 1;

        const { data, error } = await supabase.from("patinetas").insert([
          {
            idpatineta: nextId,
            modelo,
            numero_serie,
            fecha_compra,
            idestado,
            ultima_revision,
            observaciones,
          },
        ]);

        if (error) throw error;
        return res.status(200).json({ success: true, message: "Patineta creada exitosamente.", producto: data });
      }

      // ✏️ Actualizar producto
      case "PUT": {
        const body = req.body || {};
        const idpatineta = Number(body.idpatineta ?? body.idPatineta ?? body.id);

        if (!idpatineta || Number.isNaN(idpatineta)) {
          return res.status(400).json({ error: "idpatineta inválido o ausente" });
        }

        const updates = {};
        const allowedFields = ["modelo", "numero_serie", "fecha_compra", "idestado", "ultima_revision", "observaciones"];

        for (const field of allowedFields) {
          if (Object.prototype.hasOwnProperty.call(body, field)) {
            updates[field] = body[field];
          }
        }

        if (Object.keys(updates).length === 0) {
          return res.status(400).json({ error: "No hay campos para actualizar." });
        }

        const { data, error } = await supabase
          .from("patinetas")
          .update(updates)
          .eq("idpatineta", idpatineta)
          .select()
          .maybeSingle();

        if (error) throw error;
        return res.status(200).json({ success: true, message: "Patineta actualizada exitosamente.", producto: data });
      }

      // ❌ Eliminar producto
      case "DELETE": {
        const idpatineta = req.body?.idpatineta || req.query?.idpatineta;

        if (!idpatineta) {
          return res.status(400).json({ error: "Falta el parámetro idpatineta" });
        }

        const { data, error } = await supabase.from("patinetas").delete().eq("idpatineta", idpatineta).select();

        if (error) throw error;
        return res.status(200).json({ success: true, message: "Patineta eliminada correctamente.", eliminado: data });
      }

      default:
        return res.status(405).json({ error: "Método no permitido" });
    }
  } catch (error) {
    console.error("Error en handleProduct:", error);
    return res.status(500).json({ error: error.message });
  }
}
