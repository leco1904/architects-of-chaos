import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isMisconfigured = !supabaseUrl || !supabaseAnonKey;

if (isMisconfigured) {
  console.warn(
    '[Supabase] Fehlende Env-Variablen (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).\n' +
    'App läuft im Offline-Modus. Cloud-Save deaktiviert.'
  );
}

// Wenn Env-Variablen fehlen: Mock-Client der nie crasht
// → App zeigt trotzdem den Auth-Screen (oder fällt auf Guest-Modus zurück)
const mockClient = {
  auth: {
    getSession:          () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange:   () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword:  () => Promise.resolve({ error: { message: 'Supabase nicht konfiguriert.' } }),
    signUp:              () => Promise.resolve({ error: { message: 'Supabase nicht konfiguriert.' } }),
    signOut:             () => Promise.resolve({}),
    getUser:             () => Promise.resolve({ data: { user: null } }),
  },
  from: () => ({
    select:  () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
    insert:  () => Promise.resolve({ error: null }),
    update:  () => ({ eq: () => Promise.resolve({ error: null }) }),
  }),
};

export const supabase = isMisconfigured
  ? mockClient
  : createClient(supabaseUrl, supabaseAnonKey);