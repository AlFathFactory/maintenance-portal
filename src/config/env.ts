const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';

export const env = {
  supabaseUrl: url,
  supabasePublishableKey: publishableKey,
  isDemo: !url || !publishableKey || url.includes('YOUR_PROJECT'),
} as const;
