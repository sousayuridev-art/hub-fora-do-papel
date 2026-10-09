import { createClient } from "@supabase/supabase-js";

/**
 * Cliente único do Supabase.
 * A segurança mora no banco (RLS por tenant): o frontend nunca filtra por tenant_id.
 * A chave anônima é pública por definição; chaves de serviço nunca entram aqui.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigurado = Boolean(url && anonKey);

if (!supabaseConfigurado && typeof window !== "undefined") {
  console.error(
    "Supabase sem configuração: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (veja .env.example).",
  );
}

export const supabase = createClient(url ?? "http://127.0.0.1:54321", anonKey ?? "chave-ausente", {
  auth: {
    // A sessão só existe no navegador; no servidor (SSR) o cliente não guarda nada.
    persistSession: typeof window !== "undefined",
    autoRefreshToken: typeof window !== "undefined",
    detectSessionInUrl: typeof window !== "undefined",
    flowType: "pkce",
  },
});
