import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  // ✅ Aceptamos POST en lugar de GET
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 🟢 Obtener token del cliente (lo puedes guardar al hacer login)
    const { token } = req.body;
    if (!token) {
      return res.status(401).json({ error: "Token no proporcionado" });
    }

    // Obtener usuario desde el token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: "Sesión inválida o expirada" });
    }

    // Buscar rol en la tabla usuarios
    const { data: usuarioData, error: dbError } = await supabase
      .from("usuarios")
      .select("idrol")
      .eq("email", user.email)
      .single();

    if (dbError || !usuarioData) {
      return res.status(404).json({ error: "Usuario no encontrado en la base de datos" });
    }

    return res.status(200).json({
      success: true,
      email: user.email,
      idrol: usuarioData.idrol,
    });
  } catch (err) {
    console.error("Error en /api/checkSession.js:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}
