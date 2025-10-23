
async function initSupabase() {
    // Llama a la API que devuelve las claves correctas
    const response = await fetch("/api/config");
    const config = await response.json();

    if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
        alert("No se pudieron obtener las claves de Supabase.");
        return null;
    }

    const supabaseClient = supabase.createClient(
        config.SUPABASE_URL,
        config.SUPABASE_ANON_KEY
    );
    return supabaseClient;
}

export async function signIn(email, password) {
    const supabaseClient = await initSupabase();
    if (!supabaseClient) {
        return { error: new Error("No se pudo inicializar Supabase.") };
    }

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