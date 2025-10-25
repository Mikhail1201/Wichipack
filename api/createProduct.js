import { createClient } from "@supabase/supabase-js";

async function getSupabaseConfig() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Faltan las variables de entorno de Supabase.");
  }

  return { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY };
}

export async function POST(req) {
  try {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = await getSupabaseConfig();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { modelo, numero_serie, fecha_compra, idestado, ultima_revision, observaciones } = await req.json();

    // Verificar el último idpatineta
    const { data: patinetas, error: getError } = await supabase
      .from("patinetas")
      .select("idpatineta")
      .order("idpatineta", { ascending: false })
      .limit(1);

    if (getError) throw getError;

    const nextId = patinetas.length > 0 ? patinetas[0].idpatineta + 1 : 1;

    // Insertar nuevo producto
    const { error: insertError } = await supabase.from("patinetas").insert([
      {
        idpatineta: nextId,
        modelo,
        numero_serie,
        fecha_compra,
        idestado,
        ultima_revision,
        observaciones,
      },
    ]);

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true, message: "Patineta creada exitosamente." }), { status: 200 });
  } catch (error) {
    console.error("Error creando patineta:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
}
