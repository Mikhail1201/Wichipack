import { createClient } from "@supabase/supabase-js";

// 🔧 Configuración centralizada
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

// 📦 Obtener incidencias (reutilizable)
async function getIncidencesData(supabase) {
  const { data, error } = await supabase
    .from("incidencias")
    .select("*")
    .order("idincidencia", { ascending: true });

  if (error) {
    console.error("Error al obtener incidencias:", error);
    throw new Error("Error al obtener incidencias");
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
      // 📘 OBTENER TODAS LAS INCIDENCIAS
      case "GET": {
        const incidencias = await getIncidencesData(supabase);
        return res.status(200).json(incidencias);
      }

      // 🟢 CREAR INCIDENCIA
      case "POST": {
        const {
          descripcion,
          fecha_reporte,
          fecha_resolucion,
          idestado,
          idpatineta,
          idusuario,
          tipo,
          prioridad,
          costo_reparacion,
        } = req.body;

        if (!descripcion || !idpatineta || !idusuario) {
          return res.status(400).json({
            error: "Faltan datos obligatorios: descripcion, idpatineta, idusuario",
          });
        }

        const incidencias = await getIncidencesData(supabase);
        const lastId = incidencias.length
          ? incidencias[incidencias.length - 1].idincidencia
          : 0;
        const newId = lastId + 1;

        const { data, error } = await supabase
          .from("incidencias")
          .insert([
            {
              idincidencia: newId,
              descripcion,
              fecha_reporte: fecha_reporte || new Date().toISOString(),
              fecha_resolucion: fecha_resolucion || null,
              idestado: idestado || null,
              idpatineta,
              idusuario,
              tipo: tipo || null,
              prioridad: prioridad || "media",
              costo_reparacion: costo_reparacion || 0,
            },
          ])
          .select();

        if (error) throw error;

        console.log("✅ Incidencia creada:", data);
        return res
          .status(200)
          .json({ message: "Incidencia creada exitosamente", incidencia: data });
      }

      // 🟡 ACTUALIZAR INCIDENCIA
      case "PUT": {
        const {
          idincidencia,
          descripcion,
          fecha_reporte,
          fecha_resolucion,
          idestado,
          idpatineta,
          idusuario,
          tipo,
          prioridad,
          costo_reparacion,
        } = req.body;

        if (!idincidencia) {
          return res.status(400).json({ error: "El campo idincidencia es obligatorio" });
        }

        const { data, error } = await supabase
          .from("incidencias")
          .update({
            descripcion,
            fecha_reporte,
            fecha_resolucion,
            idestado,
            idpatineta,
            idusuario,
            tipo,
            prioridad,
            costo_reparacion,
          })
          .eq("idincidencia", idincidencia)
          .select();

        if (error) throw error;

        console.log("✅ Incidencia actualizada:", data);
        return res
          .status(200)
          .json({ message: "Incidencia actualizada exitosamente", incidencia: data });
      }

      // 🔴 ELIMINAR INCIDENCIA
      case "DELETE": {
        const id = req.query.id || req.body.idincidencia;
        if (!id) {
          return res.status(400).json({ error: "Falta el parámetro idincidencia" });
        }

        const { data, error } = await supabase
          .from("incidencias")
          .delete()
          .eq("idincidencia", id)
          .select();

        if (error) throw error;

        console.log("✅ Incidencia eliminada:", data);
        return res
          .status(200)
          .json({ message: "Incidencia eliminada exitosamente", eliminada: data });
      }

      // 🚫 MÉTODO NO PERMITIDO
      default:
        return res.status(405).json({ error: `Método ${method} no permitido` });
    }
  } catch (error) {
    console.error("❌ Error en handleIncidence:", error);
    return res.status(500).json({ error: error.message });
  }
}
