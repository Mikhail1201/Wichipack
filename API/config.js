import fs from "fs";
import path from "path";

export default function handler(req, res) {
  try {
    // 1️⃣ Intentar leer las variables de entorno
    let SUPABASE_URL = process.env.SUPABASE_URL;
    let SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

    // 2️⃣ Si no existen, leer desde supabaseConfig.js local
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      const configPath = path.join(process.cwd(), "supabaseConfig.js");

      if (fs.existsSync(configPath)) {
        const configModule = require(configPath);
        SUPABASE_URL = SUPABASE_URL || configModule.SUPABASE_URL;
        SUPABASE_ANON_KEY = SUPABASE_ANON_KEY || configModule.SUPABASE_ANON_KEY;
        console.log("⚙️ Usando configuración local desde supabaseConfig.js");
      } else {
        console.error("❌ No se encontró supabaseConfig.js ni variables de entorno.");
        return res.status(500).json({ error: "No se encontró configuración de Supabase" });
      }
    }

    // 3️⃣ Devolver las claves al frontend
    return res.status(200).json({
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
    });

  } catch (error) {
    console.error("Error en /api/config.js:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}
