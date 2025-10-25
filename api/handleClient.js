import { createClient } from "@supabase/supabase-js";

// 🔧 Configuración centralizada
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

// 📦 Obtener clientes (reutilizable)
async function getClientsData(supabase) {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("idcliente", { ascending: true });

  if (error) {
    console.error("Error al obtener clientes:", error);
    throw new Error("Error al obtener clientes");
  }
  return data;
}

// 🧩 Controlador principal
export default async function handler(req, res) {
  const method = req.method.toUpperCase();

  try {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = await getSupabaseConfig();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    switch (method) {
      // 📘 OBTENER TODOS LOS CLIENTES
      case "GET": {
        const clientes = await getClientsData(supabase);
        return res.status(200).json(clientes);
      }

      // 🟢 CREAR CLIENTE
      case "POST": {
        const { cedula, nombre, apellido, telefono, email, direccion } = req.body;

        if (!cedula || !nombre || !apellido || !telefono || !email || !direccion) {
          return res.status(400).json({ error: "Faltan datos obligatorios" });
        }

        // Obtener último ID
        const clientes = await getClientsData(supabase);
        const lastId = clientes.length ? clientes[clientes.length - 1].idcliente : 0;
        const newId = lastId + 1;
        const fecha_registro = new Date().toISOString();

        const { data, error } = await supabase
          .from("clientes")
          .insert([
            {
              idcliente: newId,
              cedula,
              nombre,
              apellido,
              telefono,
              email,
              direccion,
              fecha_registro,
            },
          ])
          .select();

        if (error) throw error;

        console.log("✅ Cliente creado:", data);
        return res
          .status(200)
          .json({ message: "Cliente creado exitosamente", cliente: data });
      }

      // 🟡 ACTUALIZAR CLIENTE
      case "PUT": {
        const { idcliente, cedula, nombre, apellido, telefono, email, direccion } = req.body;

        if (!idcliente) {
          return res.status(400).json({ error: "El campo idcliente es obligatorio" });
        }

        const { data, error } = await supabase
          .from("clientes")
          .update({
            cedula,
            nombre,
            apellido,
            telefono,
            email,
            direccion,
          })
          .eq("idcliente", idcliente)
          .select();

        if (error) throw error;

        console.log("✅ Cliente actualizado:", data);
        return res
          .status(200)
          .json({ message: "Cliente actualizado exitosamente", cliente: data });
      }

      // 🔴 ELIMINAR CLIENTE
      case "DELETE": {
        const id = req.query.id || req.body.idcliente;
        if (!id) {
          return res.status(400).json({ error: "Falta el parámetro idcliente" });
        }

        const { data, error } = await supabase
          .from("clientes")
          .delete()
          .eq("idcliente", id)
          .select();

        if (error) throw error;

        console.log("✅ Cliente eliminado:", data);
        return res
          .status(200)
          .json({ message: "Cliente eliminado exitosamente", eliminado: data });
      }

      // 🚫 MÉTODO NO PERMITIDO
      default:
        return res.status(405).json({ error: `Método ${method} no permitido` });
    }
  } catch (error) {
    console.error("❌ Error en handleClient:", error);
    return res.status(500).json({ error: error.message });
  }
}
