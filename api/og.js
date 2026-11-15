// Vista previa de links (WhatsApp, Facebook, Telegram…): esos bots no ejecutan JS, así que
// vercel.json les desvía /e/:slug aquí y les servimos los meta tags del evento ya resueltos.
const SITE = 'https://eventos.gdgtarija.com';
const DEFAULT_TITLE = 'GDG Tarija — Plataforma de Eventos';
const DEFAULT_DESCRIPTION =
  'Regístrate a talleres, conferencias y consulta tus certificados oficiales de asistencia de Google Developer Groups Tarija.';
const DEFAULT_IMAGE =
  'https://res.cloudinary.com/dopkch3x9/image/upload/v1779579233/GDG_Bevy_DefaultEventBanner_VKOwYjb_c913np.webp';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESCAPES[c]);

const formatDate = new Intl.DateTimeFormat('es-BO', {
  timeZone: 'America/La_Paz',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
}).format;

async function getEvent(slug) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key || !slug) return null;
  // RLS solo deja leer eventos publicados con la key pública.
  const res = await fetch(
    `${url}/rest/v1/events?select=title,slug,description,banner_url,date_start,location_name&slug=eq.${encodeURIComponent(slug)}&limit=1`,
    { headers: { apikey: key } },
  );
  if (!res.ok) return null;
  const [event] = await res.json();
  return event ?? null;
}

function describe(event) {
  const head = [formatDate(new Date(event.date_start)), event.location_name]
    .filter(Boolean)
    .join(' · ');
  const body = (event.description || '').replace(/\s+/g, ' ').trim();
  const text = body ? `${head} — ${body}` : head;
  return text.length > 200 ? `${text.slice(0, 199).trimEnd()}…` : text;
}

module.exports = async (req, res) => {
  const slug = String(req.query.slug || '');
  const event = await getEvent(slug).catch(() => null);
  const title = event ? `${event.title} | GDG Tarija` : DEFAULT_TITLE;
  const description = event ? describe(event) : DEFAULT_DESCRIPTION;
  const image = (event && event.banner_url) || DEFAULT_IMAGE;
  const url = event ? `${SITE}/e/${encodeURIComponent(event.slug)}` : SITE;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${esc(url)}" />
<meta property="og:site_name" content="GDG Tarija" />
<meta property="og:locale" content="es_BO" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${esc(url)}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:image" content="${esc(image)}" />
<meta property="og:image:alt" content="${esc(title)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${esc(image)}" />
</head>
<body>
<h1>${esc(title)}</h1>
<p>${esc(description)}</p>
<p><a href="${esc(url)}">${esc(url)}</a></p>
</body>
</html>`);
};
