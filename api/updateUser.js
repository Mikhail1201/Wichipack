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

    if (!idusuario || !username) {
      throw new Error("Faltan datos obligatorios: idusuario o username.");
    }

    // 1️⃣ Obtener configuración y cliente Supabase
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = await getSupabaseConfig();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 2️⃣ Verificar si el usuario existe usando getUsersData()
    const usuarios = await getUsersData();
    const existingUser = usuarios.find(
      (u) => u.idusuario === idusuario || u.id === idusuario
    );

    if (!existingUser) {
      throw new Error("Usuario no encontrado en la base de datos.");
    }

    // 3️⃣ Actualizar contraseña en Supabase Auth (si aplica)
    if (password && existingUser.email) {
      const { error: passError } = await supabase.auth.admin.updateUserByEmail(
        existingUser.email,
        { password }
      );

      if (passError) {
        console.error("Error al actualizar contraseña en Auth:", passError);
        throw new Error(passError.message);
      }
    }

    // 4️⃣ Actualizar registro en tabla "usuarios"
    const { data: updatedUser, error: dbError } = await supabase
      .from("usuarios")
      .update({
        username,
        idrol: rol ?? existingUser.idrol,
      })
      .eq("idusuario", existingUser.idusuario)
      .select();

    if (dbError) {
      console.error("Error al actualizar usuario en BD:", dbError);
      throw new Error(dbError.message);
    }

    console.log("✅ Usuario actualizado correctamente:", updatedUser);
    return { success: true, user: updatedUser[0] };
  } catch (error) {
    console.error("Error en updateUser.js:", error);
    return { success: false, error: error.message };
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
