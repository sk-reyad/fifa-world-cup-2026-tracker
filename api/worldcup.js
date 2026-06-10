const DEFAULT_BASE = 'https://worldcup26.ir';
const DEFAULT_TIMEOUT_MS = 10000;

function asArray(payload, keys = []) {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.result)) return payload.result;
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
  return ['true', '1', 'yes', 'finished', 'ft'].includes(text);
}

function stageFromType(type) {
  const t = String(type || '').trim().toLowerCase();
  const map = {
    group: 'Group Stage',
    r32: 'Round of 32',
    r16: 'Round of 16',
    qf: 'Quarterfinals',
    sf: 'Semifinals',
    third: 'Third Place Play-off',
    final: 'Final',
  };
  return map[t] || (t ? t.toUpperCase() : 'World Cup');
}

function statusFromGame(game) {
  if (boolish(game.finished)) return 'finished';
  const elapsed = String(game.time_elapsed || game.status || '').trim().toLowerCase();
  if (!elapsed || elapsed === 'notstarted' || elapsed === 'not_started' || elapsed === 'scheduled') return 'scheduled';
  if (elapsed.includes('half') || elapsed.includes('live') || elapsed.includes('1st') || elapsed.includes('2nd') || /^\d+$/.test(elapsed)) return 'live';
  return elapsed;
}

function offsetForStadium(stadium = {}) {
  const id = String(stadium.id || stadium.stadium_id || '');
  const city = String(stadium.city_en || stadium.city || '').toLowerCase();
  const country = String(stadium.country_en || '').toLowerCase();

  // June/July 2026 tournament offsets. Mexico venues do not use DST; US/Canada do.
  if (country.includes('mexico') || ['1', '2', '3'].includes(id) || city.includes('mexico') || city.includes('guadalajara') || city.includes('monterrey')) return '-06:00';
  if (city.includes('vancouver') || city.includes('los angeles') || city.includes('inglewood') || city.includes('seattle') || city.includes('san francisco') || city.includes('santa clara')) return '-07:00';
  if (city.includes('dallas') || city.includes('arlington') || city.includes('houston') || city.includes('kansas')) return '-05:00';
  if (city.includes('toronto') || city.includes('east rutherford') || city.includes('new york') || city.includes('miami') || city.includes('atlanta') || city.includes('philadelphia') || city.includes('boston') || city.includes('foxborough')) return '-04:00';
  return '-05:00';
}

function kickoffFromLocalDate(localDate, stadium) {
  const text = clean(localDate);
  if (!text) return null;
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
    'turkiye': 'Türkiye',
    'turkey': 'Türkiye',
    'ivory coast': 'Côte d’Ivoire',
    "cote d'ivoire": 'Côte d’Ivoire',
    'côte d’ivoire': 'Côte d’Ivoire',
    'dr congo': 'DR Congo',
    'congo dr': 'DR Congo',
    'cd congo dr': 'DR Congo',
    'congo, dr': 'DR Congo',
    'congo democratic republic': 'DR Congo',
    'curacao': 'Curaçao',
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
    const name = normalizeName(team.name_en || team.name || team.team_name || team.name_fa);
    const entry = {
      id,
      name,
      group: clean(team.groups || team.group),
      fifaCode: clean(team.fifa_code),
      flagUrl: clean(team.flag),
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
      stadium: clean(stadium.name_en || stadium.name || stadium.fifa_name),
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

function normalizeGame(game, teamMaps, stadiumMap) {
  const stadium = stadiumMap.get(String(game.stadium_id || '')) || {};
  const homeId = clean(game.home_team_id);
  const awayId = clean(game.away_team_id);
  const homeTeamRecord = homeId && homeId !== '0' ? teamMaps.byId.get(String(homeId)) : null;
  const awayTeamRecord = awayId && awayId !== '0' ? teamMaps.byId.get(String(awayId)) : null;

  const homeTeam = normalizeName(
    homeTeamRecord?.name || game.home_team_name_en || game.home_team_name || game.home_team_label || game.home_label
  );
  const awayTeam = normalizeName(
    awayTeamRecord?.name || game.away_team_name_en || game.away_team_name || game.away_team_label || game.away_label
  );
  const status = statusFromGame(game);
  const showScore = shouldShowScore(status);
  const matchNumber = asNumber(game.id || game.match_id || game.matchNumber);

  return {
    apiFixtureId: clean(game._id || game.id),
    matchNumber,
    homeTeam,
    awayTeam,
    homeTeamConfirmed: Boolean(homeTeamRecord || (homeId && homeId !== '0')),
    awayTeamConfirmed: Boolean(awayTeamRecord || (awayId && awayId !== '0')),
    homeScore: showScore ? asNumber(game.home_score) : null,
    awayScore: showScore ? asNumber(game.away_score) : null,
    status,
    kickoff: kickoffFromLocalDate(game.local_date, stadium),
    stadium: stadium.stadium || clean(game.stadium_name),
    city: stadium.city || clean(game.city),
    country: stadium.country || clean(game.country),
    stage: stageFromType(game.type),
    group: /^[A-L]$/i.test(String(game.group || '')) ? String(game.group).toUpperCase() : null,
    type: clean(game.type),
    timeElapsed: clean(game.time_elapsed),
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
  return groups.map((group) => ({
    group: clean(group.group || group.name || group.id),
    teams: (group.teams || []).map((row) => {
      const team = teamMaps.byId.get(String(row.team_id || row.id || ''));
      return {
        teamId: clean(row.team_id || row.id),
        team: team?.name || clean(row.team_name || row.name),
        played: asNumber(row.played || row.p || row.mp) || 0,
        win: asNumber(row.win || row.w) || 0,
        draw: asNumber(row.draw || row.d) || 0,
        loss: asNumber(row.loss || row.l) || 0,
        gf: asNumber(row.gf) || 0,
        ga: asNumber(row.ga) || 0,
        gd: asNumber(row.gd) || ((asNumber(row.gf) || 0) - (asNumber(row.ga) || 0)),
        points: asNumber(row.pts || row.points) || 0,
      };
    }),
  }));
}

async function fetchJSON(endpoint, base, token) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const headers = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${base}${endpoint}`, { headers, signal: controller.signal });
    const text = await response.text();
    let json;
    try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
    if (!response.ok) {
      const message = json?.message || json?.error || `worldcup26.ir returned ${response.status}`;
      throw new Error(message);
    }
    return json;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const base = process.env.WORLDCUP26_API_BASE || DEFAULT_BASE;
  const token = process.env.WORLDCUP26_API_TOKEN || '';
  const errors = [];

  const [gamesResult, teamsResult, stadiumsResult, groupsResult, healthResult] = await Promise.allSettled([
    fetchJSON('/get/games', base, token),
    fetchJSON('/get/teams', base, token),
    fetchJSON('/get/stadiums', base, token),
    fetchJSON('/get/groups', base, token),
    fetchJSON('/health', base, token),
  ]);

  if (gamesResult.status === 'rejected') errors.push(`games: ${gamesResult.reason.message}`);
  if (teamsResult.status === 'rejected') errors.push(`teams: ${teamsResult.reason.message}`);
  if (stadiumsResult.status === 'rejected') errors.push(`stadiums: ${stadiumsResult.reason.message}`);
  if (groupsResult.status === 'rejected') errors.push(`groups: ${groupsResult.reason.message}`);
  if (healthResult.status === 'rejected') errors.push(`health: ${healthResult.reason.message}`);

  const games = gamesResult.status === 'fulfilled' ? asArray(gamesResult.value, ['games', 'matches', 'fixtures']) : [];
  const teams = teamsResult.status === 'fulfilled' ? asArray(teamsResult.value, ['teams']) : [];
  const stadiums = stadiumsResult.status === 'fulfilled' ? asArray(stadiumsResult.value, ['stadiums']) : [];
  const groups = groupsResult.status === 'fulfilled' ? asArray(groupsResult.value, ['groups', 'tables', 'standings']) : [];

  const teamMaps = buildTeamMaps(teams);
  const stadiumMap = buildStadiumMap(stadiums);
  const fixtures = games
    .map((game) => normalizeGame(game, teamMaps, stadiumMap))
    .filter((fixture) => fixture.matchNumber && fixture.homeTeam && fixture.awayTeam)
    .sort((a, b) => a.matchNumber - b.matchNumber);

  return res.status(200).json({
    ok: fixtures.length > 0,
    mode: 'worldcup26',
    provider: 'worldcup26.ir free API',
    requiresApiKey: false,
    base,
    fixtures,
    standings: normalizeStandingGroups(groups, teamMaps),
    teams: teams.map((team) => ({
      id: clean(team.id || team.team_id),
      name: normalizeName(team.name_en || team.name),
      group: clean(team.groups || team.group),
      fifaCode: clean(team.fifa_code),
      flagUrl: clean(team.flag),
    })),
    stadiums: [...stadiumMap.values()],
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
