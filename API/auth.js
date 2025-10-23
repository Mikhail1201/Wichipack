import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { email, password } = req.body;

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Autenticación
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      return res.status(401).json({ error: authError.message });
    }

    const user = authData.user;

    // Buscar rol en la tabla usuarios
    const { data: usuarioData, error: dbError } = await supabase
      .from("usuarios")
      .select("idrol")
      .eq("email", user.email)
      .single();

    if (dbError || !usuarioData) {
      return res.status(404).json({ error: "Usuario no encontrado en la base de datos" });
    }

    const { idrol } = usuarioData;
    return res.status(200).json({ success: true, idrol });
  } catch (err) {
    console.error("Error en /api/auth.js:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}
