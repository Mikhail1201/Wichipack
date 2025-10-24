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
      SUPABASE_SERVICE_ROLE_KEY:
        SUPABASE_SERVICE_ROLE_KEY || local.SUPABASE_SERVICE_ROLE_KEY,
    };
  } catch (err) {
    throw new Error("No se encontró configuración de Supabase");
  }
}

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = await getSupabaseConfig();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { idcliente, cedula, nombre, apellido, telefono, email, direccion } = req.body;

    if (!idcliente) {
      return res.status(400).json({ error: "El campo idcliente es obligatorio" });
    }

    // 🔄 Actualizar cliente
    const { data, error } = await supabase
      .from("clientes")
      .update({
        cedula,
        nombre,
        apellido,
        telefono,
        email,
        direccion,
      })
      .eq("idcliente", idcliente)
      .select();

    if (error) {
      console.error("Error al actualizar cliente:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("✅ Cliente actualizado correctamente:", data);
    res.status(200).json({ message: "Cliente actualizado exitosamente", cliente: data });
  } catch (error) {
    console.error("Error en updateClient.js:", error);
    res.status(500).json({ error: error.message });
  }
}
