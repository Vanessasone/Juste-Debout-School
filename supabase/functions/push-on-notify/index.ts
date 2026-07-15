// ============================================================================
// EDGE FUNCTION — push-on-notify (Juste Debout School)
// Déclenchée par un Database Webhook à l'INSERT sur public.jds_notifications :
// récupère les jetons Expo et envoie la notification via l'API push Expo.
//
// Déploiement (une fois) :
//   supabase functions deploy push-on-notify --no-verify-jwt
// Puis Database → Webhooks → New : table jds_notifications, event INSERT,
//   type "Supabase Edge Functions" → push-on-notify.
// Les variables SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY sont fournies par la
// plateforme.
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const row = payload.record ?? payload;
    const title: string = row?.title ?? 'Juste Debout School';
    const body: string = row?.body ?? '';

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: tokens } = await supabase.from('jds_push_tokens').select('token');
    const messages = (tokens ?? []).map((t: { token: string }) => ({
      to: t.token,
      sound: 'default',
      title,
      body,
    }));

    for (let i = 0; i < messages.length; i += 100) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages.slice(i, i + 100)),
      });
    }

    return new Response(JSON.stringify({ sent: messages.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
