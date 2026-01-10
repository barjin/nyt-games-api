import { Actor } from 'apify';
// Importing the server starts it (server.ts binds and listens on ACTOR_WEB_SERVER_PORT)
import './server.js';

function pathForGame(game: string, date?: string): string {
  switch (game) {
    case 'wordle': return date ? `/wordle/${date}` : `/wordle`;
    case 'pips': return date ? `/pips/${date}` : `/pips`;
    case 'connections': return date ? `/connections/${date}` : `/connections`;
    case 'mini': return date ? `/mini/${date}` : `/mini`;
    case 'letterboxed': return `/letterboxed`;
    case 'spelling-bee': return date ? `/spelling-bee/${date}` : `/spelling-bee`;
    default: throw new Error(`Unsupported game: ${game}`);
  }
}

(async () => {
  await Actor.init();

  const origin = Actor.config.get('metaOrigin');
  const port = Number(process.env.ACTOR_WEB_SERVER_PORT || 3000);

  if (origin === 'STANDBY') {
    // In standby, keep the server running and let the platform probe readiness.
    console.log(`Standby mode: server running on port ${port}`);
  } else {
    // Regular mode: read input and query the local server, then store to dataset
    const input = (await Actor.getInput()) as { game?: string; absoluteDate?: string } | null;
    const game = (input?.game ?? 'wordle');
    const date = input?.absoluteDate;

    const url = `http://127.0.0.1:${port}${pathForGame(game, date ?? undefined)}`;
    console.log(`Fetching: ${url}`);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Server responded with status ${resp.status}`);
    const data = await resp.json();
    await Actor.pushData({ game, date: date ?? null, data });
    await Actor.exit();
  }

})();
