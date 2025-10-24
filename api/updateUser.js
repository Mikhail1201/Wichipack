import { createClient } from "@supabase/supabase-js";
import { getUsersData } from "./getUsers.js"; // reutilizamos la función existente

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

/**
 * Actualiza un usuario existente en la tabla "usuarios"
 * y opcionalmente su contraseña en Supabase Auth.
 * 
 * @param {Object} payload - Datos a actualizar.
 * @param {number} payload.idusuario - ID del usuario.
 * @param {string} payload.username - Nuevo nombre.
 * @param {number} [payload.rol] - Nuevo rol (opcional).
 * @param {string} [payload.password] - Nueva contraseña (opcional).
 * @returns {Promise<Object>} - Resultado de la actualización.
 */
export async function updateUser(payload) {
  try {
    const { idusuario, username, rol, password } = payload;

    if (!idusuario && !payload.email) {
      throw new Error("Debe proporcionar idusuario o email para identificar al usuario.");
    }
    if (!username) {
      throw new Error("El campo username es obligatorio.");
    }

    // 1️⃣ Obtener configuración y cliente Supabase
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = await getSupabaseConfig();
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Configuración de Supabase no disponible.");
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 2️⃣ Obtener usuario existente en la tabla 'usuarios'
    const { data: existingRows, error: selErr } = await supabase
      .from("usuarios")
      .select("*")
      .eq("idusuario", idusuario || payload.id)
      .limit(1)
      .maybeSingle();

    let existingUser = existingRows || null;

    // Si no se encontró por idusuario, intentar buscar por email en la tabla usuarios
    if (!existingUser && payload.email) {
      const { data: byEmailRows, error: byEmailErr } = await supabase
        .from("usuarios")
        .select("*")
        .eq("email", payload.email)
        .limit(1)
        .maybeSingle();

      if (byEmailErr) throw byEmailErr;
      existingUser = byEmailRows || null;
    }

    if (!existingUser) {
      throw new Error("Usuario no encontrado en la tabla 'usuarios'.");
    }

    // 3️⃣ Actualizar contraseña en Supabase Auth (si aplica)
    if (password) {
      // buscamos el UID de Auth:
      // Preferimos existingUser.idusuario si ya contiene el UID de Auth
      let authId = existingUser.idusuario ?? null;
      // Si authId parece no ser el UID (por ejemplo es numérico), intentamos localizar por email usando la API admin
      if (!authId || String(authId).match(/^\d+$/)) {
        const targetEmail = payload.email || existingUser.email;
        if (!targetEmail) {
          throw new Error("No se puede actualizar la contraseña: no hay email disponible para buscar el usuario en Auth.");
        }

        // listar usuarios admin y buscar por email (petición paginada; asumimos pequeña cantidad)
        const { data: listData, error: listErr } = await supabase.auth.admin.listUsers();
        if (listErr) {
          console.error("Error listando usuarios admin:", listErr);
          throw new Error(listErr.message || "Error listando usuarios en Auth");
        }

        const authUser = (listData && listData.users) ? listData.users.find(u => u.email === targetEmail) : null;
        if (!authUser) {
          throw new Error("No se encontró usuario en Auth con el email proporcionado.");
        }
        authId = authUser.id;
      }

      // Finalmente actualizar contraseña por Id
      const { data: updatedAuthUser, error: passError } =
        await supabase.auth.admin.updateUserById(authId, { password });

      if (passError) {
        console.error("Error al actualizar contraseña en Auth:", passError);
        throw new Error(passError.message || "Error actualizando contraseña en Auth");
      }
    }

    // 4️⃣ Actualizar datos en la tabla 'usuarios'
    const updates = { username };
    // mapear "rol" del payload al nombre real de la columna "idrol"
    const newIdrol = payload.rol ?? payload.idrol ?? null;
    if (newIdrol !== null && newIdrol !== undefined && String(newIdrol) !== '') {
      updates.idrol = Number(newIdrol);
    }

    const { data: updatedRows, error: updateErr } = await supabase
      .from("usuarios")
      .update(updates)
      .eq("idusuario", existingUser.idusuario)
      .select()
      .maybeSingle();

    if (updateErr) {
      console.error("Error actualizando tabla usuarios:", updateErr);
      throw updateErr;
    }

    return { success: true, user: updatedRows || existingUser };
  } catch (error) {
    console.error("Error en updateUser.js:", error);
    return { success: false, error: error.message || String(error) };
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const payload = req.body;
    const result = await updateUser(payload);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    return res.status(200).json({ success: true, user: result.user });
  } catch (err) {
    console.error("Error en updateUser handler:", err);
    return res.status(500).json({ success: false, error: err.message || "Error interno" });
  }
}
