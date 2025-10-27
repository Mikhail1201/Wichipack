import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { action, email, password, token } = req.body;

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // ===============================
    // 🔹 LOGIN
    // ===============================
    if (action === "login") {
      if (!email || !password)
        return res.status(400).json({ error: "Faltan credenciales" });

      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (authError) return res.status(401).json({ error: authError.message });

      const user = authData.user;
      const { data: usuarioData, error: dbError } = await supabase
        .from("usuarios")
        .select("idusuario, idrol")
        .eq("email", user.email)
        .single();

      if (dbError || !usuarioData)
        return res.status(404).json({ error: "Usuario no encontrado" });

      return res.status(200).json({
        success: true,
        idrol: usuarioData.idrol,
        idusuario: usuarioData.idusuario,
        access_token: authData.session?.access_token ?? null,
      });
    }

    // ===============================
    // 🔹 CHECK SESSION
    // ===============================
    if (action === "check") {
      if (!token) return res.status(401).json({ error: "Token no proporcionado" });

      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user)
        return res.status(401).json({ error: "Sesión inválida o expirada" });

      const { data: usuarioData, error: dbError } = await supabase
        .from("usuarios")
        .select("idusuario, idrol")
        .eq("email", user.email)
        .single();

      if (dbError || !usuarioData)
        return res.status(404).json({ error: "Usuario no encontrado" });

      return res.status(200).json({
        success: true,
        email: user.email,
        idrol: usuarioData.idrol,
        idusuario: usuarioData.idusuario,
      });
    }

    // ===============================
    // 🔹 GET USER BY EMAIL
    // ===============================
    if (action === "getUserByEmail") {
      if (!email)
        return res.status(400).json({ error: "Falta el parámetro email" });

      const { data, error } = await supabaseAdmin
        .from("usuarios")
        .select("idusuario, nombre, idrol, email")
        .eq("email", email)
        .single();

      if (error || !data)
        return res.status(404).json({ error: "Usuario no encontrado" });

      return res.status(200).json(data);
    }

    // ===============================
    // 🔹 LOGOUT
    // ===============================
    if (action === "logout") {
      const { error } = await supabase.auth.signOut();
      if (error)
        return res.status(400).json({ error: "No se pudo cerrar la sesión" });

      return res
        .status(200)
        .json({ success: true, message: "Sesión cerrada correctamente" });
    }

    // ===============================
    // 🚫 Acción inválida
    // ===============================
    return res.status(400).json({ error: "Acción no reconocida" });
  } catch (err) {
    console.error("Error en /api/auth.js:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}
