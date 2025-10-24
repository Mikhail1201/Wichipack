import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Cerrar sesión
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json({ error: "No se pudo cerrar la sesión" });
    }

    return res.status(200).json({ success: true, message: "Sesión cerrada correctamente" });
  } catch (err) {
    console.error("Error en /api/logout.js:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}
