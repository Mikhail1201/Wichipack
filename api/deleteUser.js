import { createClient } from "@supabase/supabase-js";
import { getUsersData } from "./getUsers.js"; // usamos el mismo handler

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
 * Elimina un usuario tanto de la tabla "usuarios"
 * como del sistema de autenticación de Supabase.
 *
 * @param {number|string} idusuario - ID del usuario a eliminar.
 * @returns {Promise<Object>} Resultado de la operación.
 */
export async function deleteUser(idusuario) {
  try {
    if (!idusuario) {
      throw new Error("Debe proporcionarse el ID del usuario a eliminar.");
    }

    // 1️⃣ Configuración de Supabase
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = await getSupabaseConfig();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 2️⃣ Buscar usuario usando getUsersData()
    const usuarios = await getUsersData();
    const existingUser = usuarios.find(
      (u) => u.idusuario === idusuario || u.id === idusuario
    );

    if (!existingUser) {
      throw new Error("Usuario no encontrado en la base de datos.");
    }

    // 3️⃣ Eliminar usuario de Supabase Auth (si tiene email)
    if (existingUser.email) {
      const { data: authData, error: authError } = await supabase.auth.admin.deleteUser(
        existingUser.auth_id ?? existingUser.id_auth ?? existingUser.id // si tienes un campo de auth_id
      );

      if (authError) {
        console.warn("No se pudo eliminar de Auth:", authError.message);
        // No lanzamos error crítico porque puede existir solo en la tabla
      }
    }

    // 4️⃣ Eliminar usuario de la tabla "usuarios"
    const { error: dbError } = await supabase
      .from("usuarios")
      .delete()
      .eq("idusuario", existingUser.idusuario);

    if (dbError) {
      console.error("Error al eliminar usuario de la BD:", dbError);
      throw new Error(dbError.message);
    }

    console.log("✅ Usuario eliminado correctamente:", existingUser.username);
    return { success: true, message: "Usuario eliminado correctamente." };
  } catch (error) {
    console.error("Error en deleteUser.js:", error);
    return { success: false, error: error.message };
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { idusuario } = req.body;
    const result = await deleteUser(idusuario);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    return res.status(200).json({ success: true, message: result.message });
  } catch (err) {
    console.error("Error en deleteUser handler:", err);
    return res.status(500).json({ success: false, error: err.message || "Error interno" });
  }
}
