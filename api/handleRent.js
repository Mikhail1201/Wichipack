import { createClient } from "@supabase/supabase-js";

// 🔧 Configuración centralizada (idéntica a handleClient)
async function getSupabaseConfig() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    return { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY };
  }

  try {
    const local = await import("../supabaseConfig.js");
    return {
      SUPABASE_URL: SUPABASE_URL || local.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY:
        SUPABASE_SERVICE_ROLE_KEY || local.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_ANON_KEY: SUPABASE_ANON_KEY || local.SUPABASE_ANON_KEY,
    };
  } catch (err) {
    throw new Error("No se encontró configuración de Supabase");
  }
}

// 📦 Obtener todos los alquileres
async function getRentsData(supabase) {
  const { data, error } = await supabase
    .from("alquileres")
    .select("*")
    .order("idalquiler", { ascending: true });

  if (error) {
    console.error("Error al obtener alquileres:", error);
    throw new Error("Error al obtener alquileres");
  }
  return data;
}

// 🧩 Controlador principal
export default async function handler(req, res) {
  const method = req.method.toUpperCase();

  try {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = await getSupabaseConfig();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    switch (method) {
      // 📘 OBTENER TODOS LOS ALQUILERES
      case "GET": {
        const alquileres = await getRentsData(supabase);
        return res.status(200).json(alquileres);
      }

      // 🟢 CREAR ALQUILER
      case "POST": {
        const {
          fecha_hora_inicio,
          fecha_hora_fin,
          precio,
          idestado,
          idcliente,
          idpatineta,
          horas_alquiladas,
        } = req.body;

        if (!fecha_hora_inicio || !precio || !idcliente || !idpatineta) {
          return res.status(400).json({ error: "Faltan datos obligatorios" });
        }

        // Obtener último ID
        const alquileres = await getRentsData(supabase);
        const lastId = alquileres.length ? alquileres[alquileres.length - 1].idalquiler : 0;
        const newId = lastId + 1;
        const created_at = new Date().toISOString();

        const { data, error } = await supabase
          .from("alquileres")
          .insert([
            {
              idalquiler: newId,
              fecha_hora_inicio,
              fecha_hora_fin: fecha_hora_fin || null,
              precio,
              idestado: idestado || null,
              idcliente,
              idpatineta,
              horas_alquiladas: horas_alquiladas || null,
              created_at,
            },
          ])
          .select();

        if (error) throw error;

        console.log("✅ Alquiler creado:", data);
        return res
          .status(200)
          .json({ message: "Alquiler creado exitosamente", alquiler: data });
      }

      // 🟡 ACTUALIZAR ALQUILER
      case "PUT": {
        const {
          idalquiler,
          fecha_hora_inicio,
          fecha_hora_fin,
          precio,
          idestado,
          idcliente,
          idpatineta,
          horas_alquiladas,
        } = req.body;

        if (!idalquiler) {
          return res.status(400).json({ error: "El campo idalquiler es obligatorio" });
        }

        const { data, error } = await supabase
          .from("alquileres")
          .update({
            fecha_hora_inicio,
            fecha_hora_fin,
            precio,
            idestado,
            idcliente,
            idpatineta,
            horas_alquiladas,
          })
          .eq("idalquiler", idalquiler)
          .select();

        if (error) throw error;

        console.log("✅ Alquiler actualizado:", data);
        return res
          .status(200)
          .json({ message: "Alquiler actualizado exitosamente", alquiler: data });
      }

      // 🔴 ELIMINAR ALQUILER
      case "DELETE": {
        const id = req.query.id || req.body.idalquiler;
        if (!id) {
          return res.status(400).json({ error: "Falta el parámetro idalquiler" });
        }

        const { data, error } = await supabase
          .from("alquileres")
          .delete()
          .eq("idalquiler", id)
          .select();

        if (error) throw error;

        console.log("✅ Alquiler eliminado:", data);
        return res
          .status(200)
          .json({ message: "Alquiler eliminado exitosamente", eliminado: data });
      }

      // 🚫 MÉTODO NO PERMITIDO
      default:
        return res.status(405).json({ error: `Método ${method} no permitido` });
    }
  } catch (error) {
    console.error("❌ Error en handleRent:", error);
    return res.status(500).json({ error: error.message });
  }
}
