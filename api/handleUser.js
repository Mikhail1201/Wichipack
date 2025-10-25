import { createClient } from "@supabase/supabase-js";

// 🧩 Configuración de Supabase
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
  } catch {
    throw new Error("No se encontró configuración de Supabase");
  }
}

// 🔹 Obtener instancia del cliente Supabase
async function getClient() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = await getSupabaseConfig();
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// 🔹 Validar UUID (para Auth)
function isUuid(str) {
  return (
    !!str &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      String(str)
    )
  );
}

// 🚀 Handler principal
export default async function handler(req, res) {
  const supabase = await getClient();
  const method = req.method.toUpperCase();

  try {
    switch (method) {
      // 📋 Obtener todos los usuarios
      case "GET": {
        const { data, error } = await supabase
          .from("usuarios")
          .select("*")
          .order("idusuario", { ascending: true });

        if (error) throw error;
        return res.status(200).json({ usuarios: data });
      }

      // ➕ Crear nuevo usuario
      case "POST": {
        const { username, email, idrol, password } = req.body;

        if (!username || !email || !password || !idrol) {
          return res.status(400).json({
            error: "Faltan campos obligatorios (username, email, password, idrol)",
          });
        }

        // Obtener el último ID
        const { data: users, error: getError } = await supabase
          .from("usuarios")
          .select("idusuario")
          .order("idusuario", { ascending: false })
          .limit(1);

        if (getError) throw getError;
        const nextId = users?.[0]?.idusuario ? users[0].idusuario + 1 : 1;

        // Crear usuario en Auth
        const { data: authData, error: authError } =
          await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
          });

        if (authError) throw authError;

        // Insertar en tabla
        const { data: dbData, error: dbError } = await supabase
          .from("usuarios")
          .insert([
            {
              idusuario: nextId,
              username,
              email,
              idrol,
            },
          ])
          .select();

        if (dbError) throw dbError;

        return res.status(200).json({
          success: true,
          message: "Usuario creado correctamente.",
          user: dbData,
        });
      }

      // ✏️ Actualizar usuario
      case "PUT": {
        const { idusuario, username, idrol, password, email } = req.body;

        if (!idusuario && !email) {
          return res.status(400).json({
            error: "Debe proporcionar idusuario o email para identificar al usuario.",
          });
        }

        // Buscar usuario existente
        const { data: existing, error: findErr } = await supabase
          .from("usuarios")
          .select("*")
          .eq("idusuario", idusuario)
          .maybeSingle();

        if (findErr) throw findErr;
        if (!existing) return res.status(404).json({ error: "Usuario no encontrado." });

        // Actualizar contraseña si se envió
        if (password) {
          let authId = existing.idusuario;
          if (!isUuid(authId)) {
            const { data: list } = await supabase.auth.admin.listUsers();
            const found = list.users.find(
              (u) => u.email && u.email.toLowerCase() === email.toLowerCase()
            );
            if (found) authId = found.id;
          }
          if (isUuid(authId)) {
            const { error: passErr } = await supabase.auth.admin.updateUserById(
              authId,
              { password }
            );
            if (passErr) throw passErr;
          }
        }

        // Actualizar tabla usuarios
        const updates = {};
        if (username) updates.username = username;
        if (idrol) updates.idrol = idrol;

        const { data: updated, error: updErr } = await supabase
          .from("usuarios")
          .update(updates)
          .eq("idusuario", idusuario)
          .select()
          .maybeSingle();

        if (updErr) throw updErr;
        return res.status(200).json({ success: true, user: updated });
      }

      // ❌ Eliminar usuario
      case "DELETE": {
        const { idusuario } = req.body;
        if (!idusuario)
          return res.status(400).json({ error: "Falta idusuario para eliminar." });

        // Buscar usuario
        const { data: existing, error: findErr } = await supabase
          .from("usuarios")
          .select("*")
          .eq("idusuario", idusuario)
          .maybeSingle();

        if (findErr) throw findErr;
        if (!existing) return res.status(404).json({ error: "Usuario no encontrado." });

        // Buscar en Auth y eliminar
        let authId = existing.idusuario;
        if (!isUuid(authId) && existing.email) {
          const { data: list } = await supabase.auth.admin.listUsers();
          const found = list.users.find(
            (u) => u.email && u.email.toLowerCase() === existing.email.toLowerCase()
          );
          if (found) authId = found.id;
        }
        if (isUuid(authId)) {
          await supabase.auth.admin.deleteUser(authId);
        }

        // Eliminar de tabla
        const { error: delErr } = await supabase
          .from("usuarios")
          .delete()
          .eq("idusuario", idusuario);

        if (delErr) throw delErr;
        return res.status(200).json({ success: true, message: "Usuario eliminado." });
      }

      default:
        return res.status(405).json({ error: "Método no permitido" });
    }
  } catch (error) {
    console.error("Error en handleUser:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
