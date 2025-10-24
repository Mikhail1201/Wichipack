export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    // === 1️⃣ Cargar configuración ===
    let SUPABASE_URL = process.env.SUPABASE_URL;
    let SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
    let SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Necesaria para auth admin

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      const localConfig = await import("../../supabaseConfig.js");
      SUPABASE_URL = SUPABASE_URL || localConfig.SUPABASE_URL;
      SUPABASE_ANON_KEY = SUPABASE_ANON_KEY || localConfig.SUPABASE_ANON_KEY;
      SUPABASE_SERVICE_ROLE_KEY = SUPABASE_SERVICE_ROLE_KEY || localConfig.SUPABASE_SERVICE_ROLE_KEY;
    }

    // === 2️⃣ Extraer datos del body ===
    const { idusuario, username, email, idrol, password } = await req.json();

    if (!idusuario || !username || !email || !idrol || !password) {
      return res.status(400).json({ error: "Faltan campos requeridos" });
    }

    // === 3️⃣ Crear usuario en autenticación ===
    const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        email,
        password,
        user_metadata: { username, idrol },
      }),
    });

    const authData = await authResponse.json();

    if (!authResponse.ok) {
      console.error("Error al crear usuario en auth:", authData);
      return res.status(authResponse.status).json({ error: authData });
    }

    const authUserId = authData.user?.id || authData.id;

    // === 4️⃣ Insertar usuario en la tabla "usuarios" ===
    const dbResponse = await fetch(`${SUPABASE_URL}/rest/v1/usuarios`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify([
        {
          idusuario: idusuario || authUserId,
          username,
          email,
          idrol,
        },
      ]),
    });

    const dbData = await dbResponse.json();

    if (!dbResponse.ok) {
      console.error("Error al insertar usuario en la tabla:", dbData);
      return res.status(dbResponse.status).json({ error: dbData });
    }

    // === 5️⃣ Respuesta final ===
    res.status(200).json({
      message: "Usuario creado exitosamente",
      authUser: authData,
      dbUser: dbData,
    });
  } catch (error) {
    console.error("Error en createUser.js:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}
