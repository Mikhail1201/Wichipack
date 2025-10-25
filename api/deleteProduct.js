import { createClient } from "@supabase/supabase-js";

async function getSupabaseConfig() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Faltan las variables de entorno de Supabase.");
  }

  return { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY };
}

export async function DELETE(req) {
  try {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = await getSupabaseConfig();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { idpatineta } = await req.json();

    const { error } = await supabase.from("patinetas").delete().eq("idpatineta", idpatineta);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, message: "Patineta eliminada correctamente." }), { status: 200 });
  } catch (error) {
    console.error("Error eliminando patineta:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
}
