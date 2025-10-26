import { createClient } from "@supabase/supabase-js";

// 🧩 Configuración de Supabase idéntica a tus otros handlers
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

export default async function handler(req, res) {
  const method = req.method.toUpperCase();

  try {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = await getSupabaseConfig();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    switch (method) {
      // 📘 OBTENER TODAS LAS TARIFAS
      case "GET": {
        const { data, error } = await supabase
          .from("tarifas")
          .select("*")
          .order("idtarifa", { ascending: true });

        if (error) throw error;
        return res.status(200).json(data);
      }

      // 🟢 CREAR NUEVA TARIFA
      case "POST": {
        const { nombre, tipo, valor, fecha_inicio, fecha_fin, activa } = req.body;

        if (!nombre || !tipo || !valor || !fecha_inicio) {
          return res.status(400).json({ error: "Faltan datos obligatorios (nombre, tipo, valor, fecha_inicio)" });
        }

        // Obtener el último idtarifa para autoincrementarlo manualmente
        const { data: last, error: lastErr } = await supabase
          .from("tarifas")
          .select("idtarifa")
          .order("idtarifa", { ascending: false })
          .limit(1);

        if (lastErr) throw lastErr;
        const newId = last?.[0]?.idtarifa ? last[0].idtarifa + 1 : 1;

        const { data, error } = await supabase
          .from("tarifas")
          .insert([
            {
              idtarifa: newId,
              nombre,
              tipo,
              valor,
              fecha_inicio,
              fecha_fin: fecha_fin || null,
              activa: activa ?? true,
            },
          ])
          .select();

        if (error) throw error;
        console.log("✅ Tarifa creada:", data);
        return res.status(200).json({ message: "Tarifa creada exitosamente", tarifa: data });
      }

      // 🟡 ACTUALIZAR TARIFA
      case "PUT": {
        const { idtarifa, nombre, tipo, valor, fecha_inicio, fecha_fin, activa } = req.body;

        if (!idtarifa) {
          return res.status(400).json({ error: "El campo idtarifa es obligatorio" });
        }

        const { data, error } = await supabase
          .from("tarifas")
          .update({
            nombre,
            tipo,
            valor,
            fecha_inicio,
            fecha_fin: fecha_fin || null,
            activa: activa ?? true,
          })
          .eq("idtarifa", idtarifa)
          .select();

        if (error) throw error;
        console.log("✅ Tarifa actualizada:", data);
        return res.status(200).json({ message: "Tarifa actualizada exitosamente", tarifa: data });
      }

      // 🔴 ELIMINAR TARIFA
      case "DELETE": {
        const id = req.query.id || req.body.idtarifa;
        if (!id) {
          return res.status(400).json({ error: "Falta el parámetro idtarifa" });
        }

        const { data, error } = await supabase
          .from("tarifas")
          .delete()
          .eq("idtarifa", id)
          .select();

        if (error) throw error;
        console.log("✅ Tarifa eliminada:", data);
        return res.status(200).json({ message: "Tarifa eliminada exitosamente", eliminado: data });
      }

      // 🚫 MÉTODO NO PERMITIDO
      default:
        return res.status(405).json({ error: `Método ${method} no permitido` });
    }
  } catch (error) {
    console.error("❌ Error en handleFee:", error);
    return res.status(500).json({ error: error.message });
  }
}
