import express from 'express';
import { JSDOM } from 'jsdom';

const app = express();
const port = process.env.ACTOR_WEB_SERVER_PORT || 3000;

// Simple in-memory cache: `${endpoint}:${date}` -> { data, timestamp }
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

function isValidDate(dateStr: string) {
  // Expect YYYY-MM-DD
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

function getTodayDate(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function cacheKey(endpoint: string, date: string) {
  return `${endpoint}:${date}`;
}

async function fetchWithCache(endpoint: string, date: string, url: string, headers?: Record<string, string>) {
  const key = cacheKey(endpoint, date);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const response = await fetch(url, { headers: { 'User-Agent': 'nyt-games-api/0.1', ...(headers || {}) } });
  if (!response.ok) {
    const error = new Error(`Upstream error ${response.status}`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  const data = await response.json();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}

function createDateEndpointHandler(options: {
  endpoint: string; // e.g., 'wordle'
  buildUrl: (date: string) => string;
  headers?: Record<string, string>;
}) {
  const { endpoint, buildUrl, headers } = options;
  return async (req: express.Request, res: express.Response) => {
    const { date } = req.params as { date: string };
    if (!isValidDate(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }
    try {
      const data = await fetchWithCache(endpoint, date, buildUrl(date), headers);
      return res.json(data);
    } catch (err: any) {
      const status = (err && err.status) || 500;
      const message = status === 500 ? `Failed to fetch ${endpoint} data` : `Upstream error ${status}`;
      console.error(`${endpoint} fetch error:`, err);
      return res.status(status).json({ error: message });
    }
  };
}

app.get('/', (req, res) => {
  if (req.headers['x-apify-container-server-readiness-probe']) {
    res.end('yes\n');
  } else {
    res.end('no\n');
  }
});

app.get('/wordle/:date', createDateEndpointHandler({
  endpoint: 'wordle',
  buildUrl: (date) => `https://www.nytimes.com/svc/wordle/v2/${date}.json`
}));

// Wordle without date -> uses today's date
app.get('/wordle', async (_req, res) => {
  const today = getTodayDate();
  try {
    const data = await fetchWithCache('wordle', today, `https://www.nytimes.com/svc/wordle/v2/${today}.json`);
    return res.json(data);
  } catch (err: any) {
    const status = (err && err.status) || 500;
    const message = status === 500 ? 'Failed to fetch wordle data' : `Upstream error ${status}`;
    console.error('wordle(today) fetch error:', err);
    return res.status(status).json({ error: message });
  }
});

app.get('/pips/:date', createDateEndpointHandler({
  endpoint: 'pips',
  buildUrl: (date) => `https://www.nytimes.com/svc/pips/v1/${date}.json`
}));

// Pips without date -> today's date
app.get('/pips', async (_req, res) => {
  const today = getTodayDate();
  try {
    const data = await fetchWithCache('pips', today, `https://www.nytimes.com/svc/pips/v1/${today}.json`);
    return res.json(data);
  } catch (err: any) {
    const status = (err && err.status) || 500;
    const message = status === 500 ? 'Failed to fetch pips data' : `Upstream error ${status}`;
    console.error('pips(today) fetch error:', err);
    return res.status(status).json({ error: message });
  }
});

app.get('/connections/:date', createDateEndpointHandler({
  endpoint: 'connections',
  buildUrl: (date) => `https://www.nytimes.com/svc/connections/v2/${date}.json`
}));

// Connections without date -> today's date
app.get('/connections', async (_req, res) => {
  const today = getTodayDate();
  try {
    const data = await fetchWithCache('connections', today, `https://www.nytimes.com/svc/connections/v2/${today}.json`);
    return res.json(data);
  } catch (err: any) {
    const status = (err && err.status) || 500;
    const message = status === 500 ? 'Failed to fetch connections data' : `Upstream error ${status}`;
    console.error('connections(today) fetch error:', err);
    return res.status(status).json({ error: message });
  }
});

app.get('/mini/:date', createDateEndpointHandler({
  endpoint: 'mini',
  buildUrl: (date) => `https://www.nytimes.com/svc/crosswords/v6/puzzle/mini/${date}.json`,
  headers: {
    Referer: `https://www.nytimes.com/crosswords/game/mini/2025/11/30`,
    'X-Games-Auth-Bypass': 'true'
  }
}));

// Mini without date -> today's date
app.get('/mini', async (_req, res) => {
  const today = getTodayDate();
  try {
    const data = await fetchWithCache(
      'mini',
      today,
      `https://www.nytimes.com/svc/crosswords/v6/puzzle/mini/${today}.json`,
      {
        Referer: `https://www.nytimes.com/crosswords/game/mini/${today.replace(/-/g, '/')}`,
        'X-Games-Auth-Bypass': 'true'
      }
    );
    return res.json(data);
  } catch (err: any) {
    const status = (err && err.status) || 500;
    const message = status === 500 ? 'Failed to fetch mini crossword data' : `Upstream error ${status}`;
    console.error('mini(today) fetch error:', err);
    return res.status(status).json({ error: message });
  }
});

// Helper to fetch NYT puzzles HTML and extract window.gameData
async function fetchGameDataFromHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'nyt-games-api/0.1'
    }
  });
  if (!response.ok) {
    const error = new Error(`Upstream error ${response.status}`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  const html = await response.text();
  const dom = new JSDOM(html, { url, runScripts: 'dangerously' });
  const gameData = (dom.window as any).gameData;
  if (gameData === undefined) {
    throw new Error('gameData not found in page');
  }
  return gameData;
}

// Letterboxed endpoint (no date)
app.get('/letterboxed', async (_req, res) => {
  try {
    const data = await fetchGameDataFromHtml('https://www.nytimes.com/puzzles/letter-boxed');
    return res.json(data);
  } catch (err: any) {
    const status = (err && err.status) || 500;
    const message = status === 500 ? 'Failed to fetch Letterboxed data' : `Upstream error ${status}`;
    console.error('letterboxed fetch error:', err);
    return res.status(status).json({ error: message });
  }
});

// Spelling Bee endpoint with date (passes to target URL)
app.get('/spelling-bee/:date', async (req, res) => {
  const { date } = req.params as { date: string };
  if (!isValidDate(date)) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
  }
  const url = `https://www.nytimes.com/puzzles/spelling-bee/${date}`;
  try {
    const data = await fetchGameDataFromHtml(url);
    return res.json(data.today);
  } catch (err: any) {
    const status = (err && err.status) || 500;
    const message = status === 500 ? 'Failed to fetch Spelling Bee data' : `Upstream error ${status}`;
    console.error('spelling-bee(date) fetch error:', err);
    return res.status(status).json({ error: message });
  }
});

// Spelling Bee without date -> today's date
app.get('/spelling-bee', async (_req, res) => {
  const today = getTodayDate();
  const url = `https://www.nytimes.com/puzzles/spelling-bee/${today}`;
  try {
    const data = await fetchGameDataFromHtml(url);
    return res.json(data.today);
  } catch (err: any) {
    const status = (err && err.status) || 500;
    const message = status === 500 ? 'Failed to fetch Spelling Bee data' : `Upstream error ${status}`;
    console.error('spelling-bee(today) fetch error:', err);
    return res.status(status).json({ error: message });
  }
});

app.listen(port, () => {
  console.log(`NYT Games API server listening on http://localhost:${port}`);
});
