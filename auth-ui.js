import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

function updateAdminLinks(session) {
  const signedIn = Boolean(session?.user);
  document.querySelectorAll('[data-admin-only]').forEach((element) => {
    element.hidden = !signedIn;
  });
  document.querySelectorAll('[data-public-only]').forEach((element) => {
    element.hidden = signedIn;
  });
}

const { data: { session } } = await supabase.auth.getSession();
updateAdminLinks(session);
supabase.auth.onAuthStateChange((_event, nextSession) => updateAdminLinks(nextSession));
