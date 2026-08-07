/**
 * Wide-open CORS, on purpose.
 *
 * The point of this prototype is that other Impact Lab teams can pull our
 * GeoJSON into the shared common operating picture without asking us for
 * anything. A key or an origin allowlist would defeat that. Nothing here is
 * private: it is all public council and agency data with attribution attached.
 */
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export function preflight(req: Request): Response | null {
  return req.method === 'OPTIONS'
    ? new Response('ok', { headers: CORS_HEADERS })
    : null;
}

export function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
      ...(init.headers ?? {}),
    },
  });
}

/**
 * Said in three places — here, the footer of the app, and the README — because
 * the organisers asked for it to be said and a downstream consumer of this feed
 * will only ever see this one.
 */
export const DISCLAIMER =
  'Prototype built at the Impact Lab with Wellington City Council Emergency ' +
  'Management, 8 August 2026. Hazard-planning and public feed data, not an ' +
  'operational emergency source. In an emergency, call 111.';

/** Identifies us honestly to council servers. */
export const USER_AGENT =
  'ImpactLabWgtn-Team1/0.1 (hackathon prototype; https://github.com/claudecommunity-nz)';
