import type { PageLoad } from './$types';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';

const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

export const load: PageLoad = async ({ params }) => {
  const coords = params.coords?.split(',').map(Number);
  const [x, y] = coords.length === 2 ? coords : [null, null];

  const { data } = await supabase.from('drips').select('*');

  return {
    images: data ?? [],
    focus: x !== null && y !== null ? { x, y } : null
  };
};
