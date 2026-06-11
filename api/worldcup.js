const fs = require('fs');
const path = require('path');

const DEFAULT_BASE = 'https://worldcup26.ir';
const RAW_BASE = 'https://raw.githubusercontent.com/rezarahiminia/worldcup2026/refs/heads/main';
const DEFAULT_TIMEOUT_MS = 6500;
const BACKUP_DELAY_MS = 1800;

const RAW_FILES = {
  games: 'football.matches.json',
  teams: 'football.teams.json',
  stadiums: 'football.stadiums.json',
  groups: 'football.matchtables.json',
};

function asArray(payload, keys = []) {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.results)) return payload.results;
  if (payload && typeof payload === 'object') {
    const values = Object.values(payload);
    if (values.length && values.every((item) => item && typeof item === 'object')) return values;
  }
  return [];
}

function asNumber(value) {
  if (value === null || value === undefined || value === '' || value === 'null') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clean(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text || text.toLowerCase() === 'null' || text.toLowerCase() === 'undefined') return null;
  return text;
}

function boolish(value) {
  const text = String(value ?? '').trim().toLowerCase();
  return ['true', '1', 'yes', 'finished', 'ft', 'fulltime', 'full-time'].includes(text);
}

function stageFromType(type) {
  const t = String(type || '').trim().toLowerCase();
  const map = {
    group: 'Group Stage',
    groups: 'Group Stage',
    group_stage: 'Group Stage',
    r32: 'Round of 32',
    round32: 'Round of 32',
    'round of 32': 'Round of 32',
    r16: 'Round of 16',
    round16: 'Round of 16',
    'round of 16': 'Round of 16',
    qf: 'Quarterfinals',
    quarterfinal: 'Quarterfinals',
    quarterfinals: 'Quarterfinals',
    sf: 'Semifinals',
    semifinal: 'Semifinals',
    semifinals: 'Semifinals',
    third: 'Third Place Play-off',
    'third-place': 'Third Place Play-off',
    '3rd': 'Third Place Play-off',
    final: 'Final',
  };
  return map[t] || (t ? t.toUpperCase() : 'World Cup');
}

function statusFromGame(game) {
  if (boolish(game.finished)) return 'finished';
  const raw = clean(game.status || game.match_status || game.state || game.time_elapsed || game.minute || game.elapsed);
  const elapsed = String(raw || '').trim().toLowerCase();
  if (!elapsed || elapsed === 'notstarted' || elapsed === 'not_started' || elapsed === 'scheduled' || elapsed === 'pending') return 'scheduled';
  if (elapsed === 'ht' || elapsed.includes('half')) return 'live';
  if (elapsed === 'ft' || elapsed.includes('finished') || elapsed.includes('full')) return 'finished';
  if (elapsed.includes('live') || elapsed.includes('1st') || elapsed.includes('2nd') || elapsed.includes('extra') || /^\d+\+?\d*'?$/i.test(elapsed)) return 'live';
  return elapsed;
}

function offsetForStadium(stadium = {}) {
  const id = String(stadium.id || stadium.stadium_id || '');
  const city = String(stadium.city_en || stadium.city || '').toLowerCase();
  const country = String(stadium.country_en || stadium.country || '').toLowerCase();

  if (country.includes('mexico') || ['1', '2', '3'].includes(id) || city.includes('mexico') || city.includes('guadalajara') || city.includes('monterrey')) return '-06:00';
  if (city.includes('vancouver') || city.includes('los angeles') || city.includes('inglewood') || city.includes('seattle') || city.includes('san francisco') || city.includes('santa clara')) return '-07:00';
  if (city.includes('dallas') || city.includes('arlington') || city.includes('houston') || city.includes('kansas')) return '-05:00';
  if (city.includes('toronto') || city.includes('east rutherford') || city.includes('new york') || city.includes('miami') || city.includes('atlanta') || city.includes('philadelphia') || city.includes('boston') || city.includes('foxborough')) return '-04:00';
  return '-05:00';
}

function kickoffFromLocalDate(localDate, stadium) {
  const text = clean(localDate);
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) return text;
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
  if (!match) return text;
  const [, mm, dd, yyyy, hh, min] = match;
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T${hh.padStart(2, '0')}:${min}:00${offsetForStadium(stadium)}`;
}

function normalizeName(name) {
  const aliases = {
    'czech republic': 'Czechia',
    'cz republic': 'Czechia',
    'czechia': 'Czechia',
    'usa': 'USA',
    'united states': 'USA',
    'usmnt': 'USA',
    'korea republic': 'South Korea',
    'south korea': 'South Korea',
    'turkiye': 'Turkey',
    'turkey': 'Turkey',
    'ivory coast': 'Ivory Coast',
    "cote d'ivoire": 'Ivory Coast',
    'côte d’ivoire': 'Ivory Coast',
    'côte d ivoire': 'Ivory Coast',
    'dr congo': 'DR Congo',
    'congo dr': 'DR Congo',
    'cd congo dr': 'DR Congo',
    'congo, dr': 'DR Congo',
    'congo democratic republic': 'DR Congo',
    'curacao': 'Curacao',
    'curaçao': 'Curacao',
    'cape verde': 'Cape Verde',
    'cabo verde': 'Cape Verde',
  };
  const raw = clean(name);
  if (!raw) return null;
  const key = raw.toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9']+/g, ' ').trim();
  return aliases[key] || raw;
}

function buildTeamMaps(teams) {
  const byId = new Map();
  const byName = new Map();
  teams.forEach((team) => {
    const id = clean(team.id || team.team_id || team._id);
    const name = normalizeName(team.name_en || team.name || team.team_name || team.name_fa || team.country || team.country_en);
    const entry = {
      id,
      name,
      group: clean(team.groups || team.group || team.group_name),
      fifaCode: clean(team.fifa_code || team.code),
      flagUrl: clean(team.flag || team.flag_url),
    };
    if (id) byId.set(String(id), entry);
    if (name) byName.set(name.toLowerCase(), entry);
  });
  return { byId, byName };
}

function buildStadiumMap(stadiums) {
  const byId = new Map();
  stadiums.forEach((stadium) => {
    const id = clean(stadium.id || stadium.stadium_id || stadium._id);
    const entry = {
      id,
      stadium: clean(stadium.name_en || stadium.stadium || stadium.name || stadium.fifa_name),
      city: clean(stadium.city_en || stadium.city),
      country: clean(stadium.country_en || stadium.country),
      capacity: asNumber(stadium.capacity),
    };
    if (id) byId.set(String(id), entry);
  });
  return byId;
}

function shouldShowScore(status) {
  return ['live', 'finished', 'ft', 'aet', 'pen_finished'].includes(String(status || '').toLowerCase());
}

function firstClean(...values) {
  for (const value of values) {
    const text = clean(value);
    if (text) return text;
  }
  return null;
}

function normalizeGame(game, teamMaps, stadiumMap) {
  const stadium = stadiumMap.get(String(game.stadium_id || game.stadiumId || game.venue_id || '')) || {};
  const homeId = clean(game.home_team_id || game.homeTeamId || game.home_id);
  const awayId = clean(game.away_team_id || game.awayTeamId || game.away_id);
  const homeTeamRecord = homeId && homeId !== '0' ? teamMaps.byId.get(String(homeId)) : null;
  const awayTeamRecord = awayId && awayId !== '0' ? teamMaps.byId.get(String(awayId)) : null;

  const homeTeam = normalizeName(
    homeTeamRecord?.name || game.home_team_name_en || game.home_team_name || game.home_team || game.homeTeam || game.home_team_label || game.home_label
  );
  const awayTeam = normalizeName(
    awayTeamRecord?.name || game.away_team_name_en || game.away_team_name || game.away_team || game.awayTeam || game.away_team_label || game.away_label
  );
  const status = statusFromGame(game);
  const showScore = shouldShowScore(status);
  const matchNumber = asNumber(game.matchNumber || game.match_number || game.id || game.match_id);
  const kickoff = kickoffFromLocalDate(firstClean(game.local_date, game.date, game.kickoff, game.match_date), stadium);

  return {
    id: matchNumber ? `m${matchNumber}` : clean(game._id || game.id || game.match_id),
    apiFixtureId: clean(game._id || game.id || game.match_id),
    matchNumber,
    homeTeam,
    awayTeam,
    homeTeamConfirmed: Boolean(homeTeamRecord || (homeId && homeId !== '0')),
    awayTeamConfirmed: Boolean(awayTeamRecord || (awayId && awayId !== '0')),
    homeScore: showScore ? asNumber(game.home_score || game.homeScore || game.home_goals) : null,
    awayScore: showScore ? asNumber(game.away_score || game.awayScore || game.away_goals) : null,
    homePenalty: asNumber(game.home_penalty || game.home_penalty_score || game.home_penalties || game.home_penalties_score || game.homePenalty),
    awayPenalty: asNumber(game.away_penalty || game.away_penalty_score || game.away_penalties || game.away_penalties_score || game.awayPenalty),
    status,
    kickoff,
    stadium: stadium.stadium || clean(game.stadium_name || game.stadium),
    city: stadium.city || clean(game.city),
    country: stadium.country || clean(game.country),
    stage: stageFromType(game.type || game.stage || game.round),
    group: /^[A-L]$/i.test(String(game.group || game.group_name || '')) ? String(game.group || game.group_name).toUpperCase() : null,
    type: clean(game.type || game.stage || game.round),
    timeElapsed: clean(game.time_elapsed || game.minute || game.elapsed || game.status),
    homeScorers: clean(game.home_scorers),
    awayScorers: clean(game.away_scorers),
    raw: {
      id: game.id,
      stadium_id: game.stadium_id,
      local_date: game.local_date,
      finished: game.finished,
      time_elapsed: game.time_elapsed,
    },
  };
}

function normalizeStandingGroups(groups, teamMaps) {
  if (!Array.isArray(groups)) return [];
  return groups.map((group) => ({
    group: clean(group.group || group.name || group.id || group.group_name),
    teams: asArray(group.teams || group.table || group.standings || group.rows).map((row) => {
      const team = teamMaps.byId.get(String(row.team_id || row.id || ''));
      return {
        teamId: clean(row.team_id || row.id),
        team: team?.name || normalizeName(row.team_name || row.name || row.team),
        played: asNumber(row.played || row.p || row.mp) || 0,
        win: asNumber(row.win || row.w) || 0,
        draw: asNumber(row.draw || row.d) || 0,
        loss: asNumber(row.loss || row.l) || 0,
        gf: asNumber(row.gf || row.goals_for) || 0,
        ga: asNumber(row.ga || row.goals_against) || 0,
        gd: asNumber(row.gd || row.goal_difference) || ((asNumber(row.gf || row.goals_for) || 0) - (asNumber(row.ga || row.goals_against) || 0)),
        points: asNumber(row.pts || row.points) || 0,
      };
    }),
  })).filter((group) => group.group);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(error) {
  if (!error) return 'unknown error';
  const cause = error.cause ? ` (${error.cause.code || error.cause.message || String(error.cause)})` : '';
  return `${error.message || String(error)}${cause}`;
}

async function fetchJSONUrl(url, token, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = {
      Accept: 'application/json,text/plain,*/*',
      'User-Agent': 'FIFA-WC-2026-Tracker/1.0 (+https://fifa-world-cup-2026-tracker.vercel.app)',
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(url, { headers, signal: controller.signal, cache: 'no-store' });
    const text = await response.text();
    let json;
    try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
    if (!response.ok) {
      const message = json?.message || json?.error || `returned ${response.status}`;
      throw new Error(message);
    }
    return json;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPrimaryResource(name, endpoints, base, token) {
  let lastError;
  for (const endpoint of endpoints) {
    try {
      const json = await fetchJSONUrl(`${base}${endpoint}`, token);
      return { json, source: 'worldcup26-live', endpoint };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error(`${name} primary endpoint failed`);
}

async function fetchRawResource(name, token) {
  const file = RAW_FILES[name];
  if (!file) throw new Error(`${name} has no repository backup`);
  const json = await fetchJSONUrl(`${RAW_BASE}/${file}`, token, DEFAULT_TIMEOUT_MS);
  return { json, source: 'worldcup26-repository', endpoint: `${RAW_BASE}/${file}` };
}

function readLocalFallback() {
  const candidates = [
    path.join(process.cwd(), 'assets/js/data-fallback.js'),
    path.join(process.cwd(), '..', 'assets/js/data-fallback.js'),
    path.join(__dirname, '..', 'assets/js/data-fallback.js'),
  ];
  for (const file of candidates) {
    try {
      if (!fs.existsSync(file)) continue;
      const text = fs.readFileSync(file, 'utf8');
      const match = text.match(/window\.WC_FALLBACK_DATA\s*=\s*([\s\S]*);\s*$/);
      if (!match) continue;
      return JSON.parse(match[1]);
    } catch {}
  }
  return null;
}

function localTeamsFromFallback(local) {
  if (!local?.groups) return [];
  return Object.entries(local.groups).flatMap(([group, teams]) => (teams || []).map((name, index) => ({
    id: `${group}${index + 1}`,
    name,
    group,
  })));
}

function localStadiumsFromFallback(local) {
  if (!local?.stadiums) return [];
  return Object.entries(local.stadiums).map(([key, venue], index) => ({
    id: String(index + 1),
    stadium: venue.stadium || key,
    city: venue.city,
    country: venue.country,
  }));
}

async function fetchResource(name, endpoints, base, token, keys, localFallback) {
  const errors = [];
  const primary = fetchPrimaryResource(name, endpoints, base, token);
  const backup = wait(BACKUP_DELAY_MS).then(() => fetchRawResource(name, token));

  try {
    const result = await Promise.any([primary, backup]);
    const data = asArray(result.json, keys);
    if (data.length) return { data, source: result.source, endpoint: result.endpoint, errors };
    errors.push(`${name}: ${result.source} returned empty array`);
  } catch (error) {
    errors.push(`${name}: ${errorMessage(error)}`);
  }

  try {
    const result = await fetchRawResource(name, token);
    const data = asArray(result.json, keys);
    if (data.length) return { data, source: result.source, endpoint: result.endpoint, errors };
    errors.push(`${name}: repository backup returned empty array`);
  } catch (error) {
    errors.push(`${name} repository: ${errorMessage(error)}`);
  }

  if (Array.isArray(localFallback) && localFallback.length) {
    return { data: localFallback, source: 'bundled-fallback', endpoint: 'assets/js/data-fallback.js', errors };
  }

  return { data: [], source: 'unavailable', endpoint: null, errors };
}

function responseCache(res) {
  res.setHeader('Cache-Control', 's-maxage=45, stale-while-revalidate=120');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  responseCache(res);

  const base = process.env.WORLDCUP26_API_BASE || DEFAULT_BASE;
  const token = process.env.WORLDCUP26_API_TOKEN || '';
  const local = readLocalFallback();

  const [gamesResource, teamsResource, stadiumsResource, groupsResource, healthResult] = await Promise.allSettled([
    fetchResource('games', ['/get/games', '/get/games/'], base, token, ['games', 'matches', 'fixtures'], local?.fixtures || []),
    fetchResource('teams', ['/get/teams', '/get/teams/'], base, token, ['teams'], localTeamsFromFallback(local)),
    fetchResource('stadiums', ['/get/stadiums', '/get/stadiums/'], base, token, ['stadiums'], localStadiumsFromFallback(local)),
    fetchResource('groups', ['/get/groups', '/get/groups/'], base, token, ['groups', 'tables', 'standings'], []),
    fetchJSONUrl(`${base}/health`, token, 3500),
  ]);

  const errors = [];
  const sources = {};

  function unwrap(name, result) {
    if (result.status === 'rejected') {
      errors.push(`${name}: ${errorMessage(result.reason)}`);
      return [];
    }
    sources[name] = result.value.source;
    if (result.value.errors?.length) errors.push(...result.value.errors);
    return result.value.data;
  }

  const games = unwrap('games', gamesResource);
  const teams = unwrap('teams', teamsResource);
  const stadiums = unwrap('stadiums', stadiumsResource);
  const groups = unwrap('groups', groupsResource);
  if (healthResult.status === 'rejected') errors.push(`health: ${errorMessage(healthResult.reason)}`);

  const teamMaps = buildTeamMaps(teams);
  const stadiumMap = buildStadiumMap(stadiums);

  let fixtures = games
    .map((game) => {
      if (game.homeTeam && game.awayTeam && game.kickoff) {
        return {
          ...game,
          apiFixtureId: game.apiFixtureId || game.id,
          matchNumber: asNumber(game.matchNumber) || asNumber(String(game.id || '').replace(/\D+/g, '')),
          homeTeam: normalizeName(game.homeTeam),
          awayTeam: normalizeName(game.awayTeam),
          status: game.status || 'scheduled',
        };
      }
      return normalizeGame(game, teamMaps, stadiumMap);
    })
    .filter((fixture) => fixture.matchNumber && fixture.homeTeam && fixture.awayTeam)
    .sort((a, b) => a.matchNumber - b.matchNumber);

  if (!fixtures.length && local?.fixtures?.length) {
    sources.games = 'bundled-fallback';
    fixtures = local.fixtures.map((fixture) => ({
      ...fixture,
      apiFixtureId: fixture.apiFixtureId || fixture.id,
      matchNumber: asNumber(fixture.matchNumber) || asNumber(String(fixture.id || '').replace(/\D+/g, '')),
    }));
  }

  const normalizedTeams = teams.map((team) => ({
    id: clean(team.id || team.team_id),
    name: normalizeName(team.name_en || team.name || team.team_name || team.country),
    group: clean(team.groups || team.group || team.group_name),
    fifaCode: clean(team.fifa_code || team.code),
    flagUrl: clean(team.flag || team.flag_url),
  })).filter((team) => team.name);

  return res.status(200).json({
    ok: fixtures.length > 0,
    mode: 'worldcup26',
    provider: 'worldcup26.ir free API',
    requiresApiKey: false,
    base,
    fixtures,
    standings: normalizeStandingGroups(groups, teamMaps),
    teams: normalizedTeams,
    stadiums: [...stadiumMap.values()],
    sources,
    errors,
    debugCounts: {
      games: games.length,
      teams: teams.length,
      stadiums: stadiums.length,
      groups: groups.length,
      fixtures: fixtures.length,
    },
    health: healthResult.status === 'fulfilled' ? healthResult.value : null,
    fetchedAt: new Date().toISOString(),
  });
};
