// core/supabaseClient.js
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Carica variabili d'ambiente dalla root del progetto
dotenv.config({ path: "./.env" });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.info("✅ Supabase inizializzato");
} else {
  console.warn("⚠️ Supabase non configurato: controlla il file .env");
}

export default supabase;
