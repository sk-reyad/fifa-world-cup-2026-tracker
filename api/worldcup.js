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
  if (typeof value === 'object') {
    if (value.$oid) return clean(value.$oid);
    if (value.id) return clean(value.id);
    if (value._id) return clean(value._id);
    return null;
  }
  const text = String(value).trim();
  if (!text || text.toLowerCase() === 'null' || text.toLowerCase() === 'undefined') return null;
  return text;
}

function firstValue(source, keys = []) {
  for (const key of keys) {
    if (source && Object.prototype.hasOwnProperty.call(source, key)) return source[key];
  }
  return undefined;
}

function nestedValue(source, paths = []) {
  for (const path of paths) {
    const value = path.split('.').reduce((obj, key) => (obj && Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : undefined), source);
    if (value !== undefined) return value;
  }
  return undefined;
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
  if (boolish(firstValue(game, ['finished', 'is_finished', 'completed', 'isCompleted']))) return 'finished';
  const elapsed = String(firstValue(game, ['time_elapsed', 'timeElapsed', 'elapsed', 'minute']) || firstValue(game, ['status', 'match_status', 'state']) || '').trim().toLowerCase();
  if (!elapsed || elapsed === 'notstarted' || elapsed === 'not_started' || elapsed === 'not-started' || elapsed === 'scheduled') return 'scheduled';
  if (elapsed === 'ht' || elapsed.includes('half')) return 'half_time';
  if (elapsed === 'ft' || elapsed.includes('full')) return 'finished';
  if (elapsed.includes('live') || elapsed.includes('start') || elapsed.includes('progress') || elapsed.includes('1st') || elapsed.includes('2nd') || /^\d+(\+\d+)?$/.test(elapsed)) return 'live';
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
    'turkiye': 'Turkey',
    'turkey': 'Turkey',
    'ivory coast': 'Ivory Coast',
    "cote d'ivoire": 'Ivory Coast',
    'côte d’ivoire': 'Ivory Coast',
    'dr congo': 'DR Congo',
    'congo dr': 'DR Congo',
    'cd congo dr': 'DR Congo',
    'congo, dr': 'DR Congo',
    'congo democratic republic': 'DR Congo',
    'curacao': 'Curacao',
    'curaçao': 'Curacao',
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

function scorePairFromGame(game) {
  const homeScore = asNumber(firstValue(game, [
    'home_score', 'homeScore', 'home_goals', 'homeGoals', 'homeTeamScore', 'home_team_score',
    'team1Score', 'team_1_score', 'score_home', 'goals_home'
  ]) ?? nestedValue(game, ['score.home', 'score.fulltime.home', 'goals.home', 'result.home']));
  const awayScore = asNumber(firstValue(game, [
    'away_score', 'awayScore', 'away_goals', 'awayGoals', 'awayTeamScore', 'away_team_score',
    'team2Score', 'team_2_score', 'score_away', 'goals_away'
  ]) ?? nestedValue(game, ['score.away', 'score.fulltime.away', 'goals.away', 'result.away']));
  return { homeScore, awayScore };
}

function shouldShowScore(status, game) {
  const normalized = String(status || '').toLowerCase();
  if (['live', 'half_time', 'finished', 'ft', 'aet', 'pen_finished'].includes(normalized)) return true;
  const { homeScore, awayScore } = scorePairFromGame(game);
  return Number.isFinite(homeScore) && Number.isFinite(awayScore) && (homeScore !== 0 || awayScore !== 0);
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
  const showScore = shouldShowScore(status, game);
  const scorePair = scorePairFromGame(game);
  const matchNumber = asNumber(game.id || game.match_id || game.matchNumber);

  return {
    apiFixtureId: clean(game._id || game.id),
    matchNumber,
    homeTeam,
    awayTeam,
    homeTeamConfirmed: Boolean(homeTeamRecord || (homeId && homeId !== '0')),
    awayTeamConfirmed: Boolean(awayTeamRecord || (awayId && awayId !== '0')),
    homeScore: showScore ? scorePair.homeScore : null,
    awayScore: showScore ? scorePair.awayScore : null,
    homePenalty: asNumber(game.home_penalty || game.home_penalty_score || game.home_penalties || game.home_penalties_score),
    awayPenalty: asNumber(game.away_penalty || game.away_penalty_score || game.away_penalties || game.away_penalties_score),
    status,
    kickoff: kickoffFromLocalDate(game.local_date, stadium),
    stadium: stadium.stadium || clean(game.stadium_name),
    city: stadium.city || clean(game.city),
    country: stadium.country || clean(game.country),
    stage: stageFromType(game.type),
    group: /^[A-L]$/i.test(String(game.group || '')) ? String(game.group).toUpperCase() : null,
    type: clean(game.type),
    timeElapsed: clean(firstValue(game, ['time_elapsed', 'timeElapsed', 'elapsed', 'minute'])),
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

function canonicalTeamName(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/the/g, '')
    .replace(/bosnia herzegovina/g, 'bosnia and herzegovina')
    .replace(/united states/g, 'usa')
    .replace(/cote d ivoire/g, 'ivory coast')
    .replace(/dr congo|congo dr|democratic republic of congo|democratic republic of the congo/g, 'dr congo')
    .trim();
}

function statusFromApiFootball(status = {}) {
  const short = String(status.short || '').trim().toUpperCase();
  const long = String(status.long || '').trim().toLowerCase();
  if (['NS', 'TBD'].includes(short) || long.includes('not started')) return 'scheduled';
  if (['1H', '2H', 'ET', 'P', 'BT', 'LIVE'].includes(short) || long.includes('in play') || long.includes('extra time') || long.includes('penalty')) return 'live';
  if (['HT'].includes(short) || long.includes('halftime') || long.includes('half-time')) return 'half_time';
  if (['FT', 'AET', 'PEN'].includes(short) || long.includes('match finished')) return short === 'AET' ? 'aet' : short === 'PEN' ? 'pen_finished' : 'finished';
  if (['SUSP', 'INT'].includes(short)) return 'live';
  return short || long || 'scheduled';
}

function timeFromApiFootball(status = {}) {
  const short = String(status.short || '').trim().toUpperCase();
  const elapsed = asNumber(status.elapsed);
  const extra = asNumber(status.extra);
  if (short === 'HT') return 'Half-Time';
  if (short === 'FT') return 'Full-time';
  if (short === 'AET') return 'Full-time';
  if (short === 'PEN') return 'Penalties';
  if (Number.isFinite(elapsed)) return extra ? `${elapsed}+${extra}` : String(elapsed);
  return clean(status.long || status.short);
}

function normalizeApiFootballFixture(item) {
  const fixture = item.fixture || {};
  const teams = item.teams || {};
  const goals = item.goals || {};
  const score = item.score || {};
  const venue = fixture.venue || {};
  const status = fixture.status || {};
  return {
    apiFixtureId: clean(fixture.id),
    matchNumber: asNumber(item.matchNumber || fixture.matchNumber || fixture.roundNumber),
    homeTeam: normalizeName(teams.home?.name),
    awayTeam: normalizeName(teams.away?.name),
    homeTeamConfirmed: true,
    awayTeamConfirmed: true,
    homeScore: asNumber(goals.home ?? score.fulltime?.home ?? score.halftime?.home),
    awayScore: asNumber(goals.away ?? score.fulltime?.away ?? score.halftime?.away),
    homePenalty: asNumber(score.penalty?.home),
    awayPenalty: asNumber(score.penalty?.away),
    status: statusFromApiFootball(status),
    kickoff: clean(fixture.date),
    stadium: clean(venue.name),
    city: clean(venue.city),
    country: null,
    stage: clean(item.league?.round) || null,
    group: null,
    type: null,
    timeElapsed: timeFromApiFootball(status),
    homeScorers: null,
    awayScorers: null,
    raw: {
      source: 'api-football',
      fixtureId: fixture.id,
      status: status.short || status.long,
      elapsed: status.elapsed,
      extra: status.extra,
    },
  };
}

async function fetchApiFootballLiveFixtures() {
  const key = process.env.APISPORTS_KEY || process.env.API_FOOTBALL_KEY || '';
  if (!key) return [];
  const base = process.env.APISPORTS_BASE || 'https://v3.football.api-sports.io';
  const league = process.env.APISPORTS_WC_LEAGUE || '1';
  const season = process.env.APISPORTS_WC_SEASON || '2026';
  const endpoint = `/fixtures?league=${encodeURIComponent(league)}&season=${encodeURIComponent(season)}&live=all`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(`${base}${endpoint}`, {
      headers: { Accept: 'application/json', 'x-apisports-key': key },
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.message || payload?.errors?.requests || `API-Football returned ${response.status}`);
    return asArray(payload, ['response']).map(normalizeApiFootballFixture).filter((fixture) => fixture.homeTeam && fixture.awayTeam);
  } finally {
    clearTimeout(timeout);
  }
}

function mergeLiveOverlay(fixtures, overlayFixtures = []) {
  let merged = 0;
  overlayFixtures.forEach((live) => {
    const liveHome = canonicalTeamName(live.homeTeam);
    const liveAway = canonicalTeamName(live.awayTeam);
    const target = fixtures.find((fixture) => live.matchNumber && Number(fixture.matchNumber) === Number(live.matchNumber))
      || fixtures.find((fixture) => canonicalTeamName(fixture.homeTeam) === liveHome && canonicalTeamName(fixture.awayTeam) === liveAway)
      || fixtures.find((fixture) => canonicalTeamName(fixture.homeTeam) === liveAway && canonicalTeamName(fixture.awayTeam) === liveHome);
    if (!target) return;
    const sameDirection = canonicalTeamName(target.homeTeam) === liveHome;
    target.status = live.status || target.status;
    target.timeElapsed = live.timeElapsed || target.timeElapsed;
    target.apiFixtureId = live.apiFixtureId || target.apiFixtureId;
    if (Number.isFinite(live.homeScore) && Number.isFinite(live.awayScore)) {
      target.homeScore = sameDirection ? live.homeScore : live.awayScore;
      target.awayScore = sameDirection ? live.awayScore : live.homeScore;
    }
    if (Number.isFinite(live.homePenalty) && Number.isFinite(live.awayPenalty)) {
      target.homePenalty = sameDirection ? live.homePenalty : live.awayPenalty;
      target.awayPenalty = sameDirection ? live.awayPenalty : live.homePenalty;
    }
    if (live.kickoff) target.kickoff = live.kickoff;
    if (live.stadium) target.stadium = live.stadium;
    if (live.city) target.city = live.city;
    target.liveOverlaySource = 'api-football';
    merged += 1;
  });
  return merged;
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

  const [gamesResult, teamsResult, stadiumsResult, groupsResult, healthResult, apiFootballResult] = await Promise.allSettled([
    fetchJSON('/get/games', base, token),
    fetchJSON('/get/teams', base, token),
    fetchJSON('/get/stadiums', base, token),
    fetchJSON('/get/groups', base, token),
    fetchJSON('/health', base, token),
    fetchApiFootballLiveFixtures(),
  ]);

  if (gamesResult.status === 'rejected') errors.push(`games: ${gamesResult.reason.message}`);
  if (teamsResult.status === 'rejected') errors.push(`teams: ${teamsResult.reason.message}`);
  if (stadiumsResult.status === 'rejected') errors.push(`stadiums: ${stadiumsResult.reason.message}`);
  if (groupsResult.status === 'rejected') errors.push(`groups: ${groupsResult.reason.message}`);
  if (healthResult.status === 'rejected') errors.push(`health: ${healthResult.reason.message}`);
  if (apiFootballResult.status === 'rejected') errors.push(`api-football live overlay: ${apiFootballResult.reason.message}`);

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

  const apiFootballFixtures = apiFootballResult.status === 'fulfilled' ? apiFootballResult.value : [];
  const liveOverlayMerged = mergeLiveOverlay(fixtures, apiFootballFixtures);
  const liveOverlayEnabled = Boolean(process.env.APISPORTS_KEY || process.env.API_FOOTBALL_KEY);

  return res.status(200).json({
    ok: fixtures.length > 0,
    mode: 'worldcup26',
    provider: liveOverlayEnabled ? `worldcup26.ir free API + API-Football live overlay${liveOverlayMerged ? ` (${liveOverlayMerged} live matches)` : ''}` : 'worldcup26.ir free API',
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
      apiFootballLive: apiFootballFixtures.length,
      liveOverlayMerged,
    },
    health: healthResult.status === 'fulfilled' ? healthResult.value : null,
    fetchedAt: new Date().toISOString(),
  });
};
