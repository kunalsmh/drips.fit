import { json } from "@sveltejs/kit";
import { createClient } from "@supabase/supabase-js";
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from "$env/static/public";

const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

export async function POST({ request }) {
  const updates = await request.json();

  const { error } = await supabase
    .from('drips')
    .upsert(updates, { onConflict: 'id' });

  if (error) {
    console.error('Error updating positions:', error.message);
    return json({ success: false }, { status: 500 });
  }

  return json({ success: true });
}