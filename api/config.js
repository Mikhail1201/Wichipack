export default async function handler(req, res) {
  try {
    let SUPABASE_URL = process.env.SUPABASE_URL;
    let SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
    let SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const localConfig = await import("../../supabaseConfig.js");
        SUPABASE_URL = SUPABASE_URL || localConfig.SUPABASE_URL;
        SUPABASE_ANON_KEY = SUPABASE_ANON_KEY || localConfig.SUPABASE_ANON_KEY;
        SUPABASE_SERVICE_ROLE_KEY = SUPABASE_SERVICE_ROLE_KEY || localConfig.SUPABASE_SERVICE_ROLE_KEY;
      } catch {
        return res.status(500).json({ error: "No se encontró configuración de Supabase" });
      }
    }

    res.status(200).json({ SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY });
  } catch (error) {
    console.error("Error en /api/config:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}
