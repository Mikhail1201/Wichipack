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
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = await getSupabaseConfig();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const id = req.query.id || req.body.idcliente;

    if (!id) {
      return res.status(400).json({ error: "Falta el parámetro idcliente" });
    }

    // 🗑️ Eliminar cliente
    const { data, error } = await supabase
      .from("clientes")
      .delete()
      .eq("idcliente", id)
      .select();

    if (error) {
      console.error("Error al eliminar cliente:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("✅ Cliente eliminado correctamente:", data);
    res.status(200).json({ message: "Cliente eliminado exitosamente", eliminado: data });
  } catch (error) {
    console.error("Error en deleteClient.js:", error);
    res.status(500).json({ error: error.message });
  }
}
