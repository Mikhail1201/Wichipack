import { createClient } from "@supabase/supabase-js";

async function getSupabaseConfig() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Faltan variables de entorno de Supabase.");
  }

  return { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY };
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Método no permitido" });
    }

    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = await getSupabaseConfig();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 🔹 Obtener todos los productos de la tabla patinetas
    const { data, error } = await supabase
      .from("patinetas")
      .select("idpatineta, modelo, numero_serie, fecha_compra, idestado, ultima_revision, observaciones");

    if (error) throw error;

    return res.status(200).json(data);
  } catch (error) {
    console.error("Error al obtener productos:", error.message);
    return res.status(500).json({ error: "Error al obtener productos." });
  }
}
