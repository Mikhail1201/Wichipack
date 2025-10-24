import { createClient } from "@supabase/supabase-js";
import { getUsersData } from "./getUsers.js"; // importamos tu handler existente

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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = await getSupabaseConfig();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { username, email, idrol, password } = req.body;
    if (!username || !email || !password || !idrol) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    // 1️⃣ Obtener todos los usuarios
    const usuarios = await getUsersData();
    const lastId = usuarios.length ? usuarios[usuarios.length - 1].idusuario : 0;
    const newId = lastId + 1;

    // 2️⃣ Crear usuario en autenticación (Supabase Auth)
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error("Error al crear usuario en Auth:", authError);
      return res.status(500).json({ error: authError.message });
    }

    // 3️⃣ Insertar en la tabla "usuarios"
    const { data: dbUser, error: dbError } = await supabase
      .from("usuarios")
      .insert([
        {
          idusuario: newId,
          username,
          email,
          idrol,
        },
      ])
      .select();

    if (dbError) {
      console.error("Error al insertar en la base de datos:", dbError);
      return res.status(500).json({ error: dbError.message });
    }

    console.log("✅ Usuario creado correctamente:", dbUser);
    res.status(200).json({ message: "Usuario creado exitosamente", user: dbUser });
  } catch (error) {
    console.error("Error en createUser.js:", error);
    res.status(500).json({ error: error.message });
  }
}
