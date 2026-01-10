import { JSDOM } from 'jsdom';

// Simple in-memory cache: `${endpoint}:${date}` -> { data, timestamp }
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

export function isValidDate(dateStr: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

export function getTodayDate(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function cacheKey(endpoint: string, date: string) {
  return `${endpoint}:${date}`;
}

export async function fetchWithCache(endpoint: string, date: string, url: string, headers?: Record<string, string>) {
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

export async function fetchGameDataFromHtml(url: string) {
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

export function buildDateHandler(options: {
  endpoint: string;
  buildUrl: (date: string) => string;
  headers?: Record<string, string>;
}) {
  const { endpoint, buildUrl, headers } = options;
  return async (date: string) => {
    if (!isValidDate(date)) {
      const error = new Error('Invalid date format. Use YYYY-MM-DD.') as Error & { status?: number };
      error.status = 400;
      throw error;
    }
    return fetchWithCache(endpoint, date, buildUrl(date), headers);
  };
}
