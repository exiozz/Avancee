// On Stride — alerte par e-mail quand quelqu'un reçoit un message dans son Inbox.
// Facultatif : sans cette fonction, la messagerie marche quand même (le message attend dans l'app).
// Installation et réglages : voir LISEZ-MOI.md, « Alerte par e-mail ».
//
// Secrets à définir dans Supabase (Edge Functions > Secrets) :
//   RESEND_API_KEY  clé du service d'envoi Resend (https://resend.com)
//   MAIL_FROM       expéditeur, sur un domaine validé chez Resend, ex. « On Stride <notif@tondomaine.fr> »
//   APP_URL         adresse du site, ex. https://onstride.vercel.app
// SUPABASE_URL, SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY sont fournis par Supabase.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const esc = (s: string) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const MAX_PER_HOUR = 30; // alertes par personne et par heure

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const key = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('MAIL_FROM');
  const url = Deno.env.get('SUPABASE_URL')!;
  if (!key || !from) return json({ sent: false, reason: 'not_configured' });

  // qui appelle ?
  const auth = req.headers.get('Authorization') ?? '';
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: who } = await asUser.auth.getUser();
  const user = who?.user;
  if (!user) return json({ error: 'auth' }, 401);

  let id = '';
  try { id = String((await req.json())?.id ?? ''); } catch { /* corps vide */ }
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'id' }, 400);

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: msg } = await admin.from('messages').select('id,from_id,from_email,from_name,to_email,subject,notified_at').eq('id', id).maybeSingle();
  // on ne prévient que pour ses propres messages, une seule fois
  if (!msg || msg.from_id !== user.id) return json({ error: 'not_found' }, 404);
  if (msg.notified_at) return json({ sent: false, reason: 'already' });

  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await admin.from('messages').select('id', { count: 'exact', head: true }).eq('from_id', user.id).gt('notified_at', since);
  if ((count ?? 0) >= MAX_PER_HOUR) return json({ sent: false, reason: 'rate' });

  // on réserve l'envoi avant de l'exécuter : deux appels en même temps n'envoient qu'un e-mail
  const { data: lock } = await admin.from('messages').update({ notified_at: new Date().toISOString() }).eq('id', id).is('notified_at', null).select('id');
  if (!lock?.length) return json({ sent: false, reason: 'already' });

  const app = (Deno.env.get('APP_URL') ?? '').replace(/\/+$/, '');
  const name = msg.from_name || msg.from_email;
  const subject = msg.subject || '(sans objet)';
  const text = `${name} (${msg.from_email}) t'a écrit sur On Stride.\n\nObjet : ${subject}\n\n` +
    (app ? `Pour lire le message et répondre, connecte-toi avec cette adresse : ${app}\n` : `Connecte-toi à On Stride avec cette adresse pour le lire.\n`);
  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.55;color:#14171F">
<p><strong>${esc(name)}</strong> (${esc(msg.from_email)}) t’a écrit sur On Stride.</p>
<p style="margin:16px 0;padding:12px 14px;background:#F4F5F8;border-radius:10px">Objet : <strong>${esc(subject)}</strong></p>
${app ? `<p><a href="${esc(app)}" style="display:inline-block;padding:10px 16px;background:#2F5BEA;color:#fff;border-radius:9px;text-decoration:none;font-weight:600">Lire le message</a></p>` : ''}
<p style="color:#667085;font-size:13px">Connecte-toi avec l’adresse ${esc(msg.to_email)} pour le retrouver dans ton Inbox.</p></div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [msg.to_email], subject: `${name} t'a écrit sur On Stride`, text, html }),
  });
  if (!res.ok) {
    await admin.from('messages').update({ notified_at: null }).eq('id', id); // l'envoi a échoué : on pourra réessayer
    return json({ sent: false, reason: 'provider', status: res.status }, 502);
  }
  return json({ sent: true });
});
