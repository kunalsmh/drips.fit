import { createClient } from "@supabase/supabase-js";
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from "$env/static/public";
import type { PageServerLoad } from './$types';

const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

export const load: PageServerLoad = async () => {
  const { data, error } = await supabase
    .from('drips')
    .select('id, url, username, x, y');

  if (error) {
    console.error('Error fetching data from drips table:', error.message);
    return { images: [] };
  }

  const images = (data ?? []).map(item => ({
    id: item.id,
    url: item.url,
    name: item.username,
    x: item.x,
    y: item.y
  }));

  return {
    images
  };
};