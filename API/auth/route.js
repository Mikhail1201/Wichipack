import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../../supabaseConfig.js";

// Usa el global creado por el CDN y evita shadowing del nombre "supabase"
const supabaseClient = globalThis.supabase?.createClient
  ? globalThis.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

if (!supabaseClient) {
  throw new Error("Supabase no está disponible. Asegúrate de incluir el script CDN antes de este módulo.");
}

export async function signIn(email, password) {
  const { data: authData, error: authError } =
    await supabaseClient.auth.signInWithPassword({ email, password });

  if (authError) {
    return { error: authError };
  }

  const user = authData.user;

  const { data: usuarioData, error: dbError } = await supabaseClient
    .from("usuarios")
    .select("idrol")
    .eq("email", user.email)
    .single();

  if (dbError) {
    return { error: dbError };
  }

  const idrol = usuarioData.idrol;

  switch (idrol) {
    case 1:
      window.location.href = "/mainpage/admin.html";
      break;
    case 2:
      window.location.href = "/mainpage/mantenimiento.html";
      break;
    case 3:
      window.location.href = "/mainpage/recepcionista.html";
      break;
    default:
      return { error: new Error("Rol desconocido, contacta al administrador.") };
  }

  return { error: null };
}