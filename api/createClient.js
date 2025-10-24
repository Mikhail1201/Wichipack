import { createClient } from "@supabase/supabase-js";
import { getClientsData } from "./getClients.js";

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

    const { cedula, nombre, apellido, telefono, email, direccion } = req.body;

    if (!cedula || !nombre || !apellido || !telefono || !email || !direccion) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    // 🔍 Obtener clientes existentes
    const clientes = await getClientsData();
    const lastId = clientes.length ? clientes[clientes.length - 1].idcliente : 0;
    const newId = lastId + 1;

    // 📅 Fecha actual
    const fecha_registro = new Date().toISOString();

    // 🗄️ Insertar cliente
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

    if (error) {
      console.error("Error al insertar cliente:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("✅ Cliente creado correctamente:", data);
    res.status(200).json({ message: "Cliente creado exitosamente", cliente: data });
  } catch (error) {
    console.error("Error en createClient.js:", error);
    res.status(500).json({ error: error.message });
  }
}
