const DEFAULT_BASE = 'https://api.sportmonks.com/v3/football';
const DEFAULT_SEASON_ID = '26618';
const DEFAULT_LEAGUE_ID = '732';

function asNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pickName(entity) {
  return entity?.name || entity?.display_name || entity?.common_name || entity?.short_code || null;
}

function pickParticipant(fixture, side) {
  const participants = fixture.participants || fixture.teams || [];
  const direct = participants.find((p) => String(p?.meta?.location || p?.location || p?.type || '').toLowerCase() === side);
  if (direct) return direct;
  if (side === 'home') return participants[0] || null;
  return participants[1] || null;
}

function scoreFromScores(fixture, participantId) {
  const scores = fixture.scores || [];
  const preferred = scores
    .filter((item) => !participantId || item.participant_id === participantId || item.team_id === participantId)
    .sort((a, b) => {
      const aDesc = String(a.description || a.type?.name || '').toLowerCase();
      const bDesc = String(b.description || b.type?.name || '').toLowerCase();
      const rank = (v) => v.includes('current') ? 4 : v.includes('full') ? 3 : v.includes('2nd') ? 2 : v.includes('1st') ? 1 : 0;
      return rank(bDesc) - rank(aDesc);
    })[0];

  const score = preferred?.score;
  return asNumber(score?.goals ?? score?.goal ?? score?.total ?? score ?? preferred?.goals ?? preferred?.value);
}

function normalizeStatus(fixture) {
  const state = String(fixture.state?.name || fixture.state?.short_name || fixture.state?.developer_name || fixture.status || '').toLowerCase();
  if (['ft', 'finished', 'ended', 'aet', 'after extra time'].some((v) => state.includes(v))) return 'finished';
  if (['live', '1st', '2nd', 'half', 'ht', 'inplay', 'in play'].some((v) => state.includes(v))) return 'live';
  return 'scheduled';
}

function normalizeFixture(fixture) {
  const home = pickParticipant(fixture, 'home');
  const away = pickParticipant(fixture, 'away');
  const homeScore = scoreFromScores(fixture, home?.id) ?? asNumber(fixture.scores?.localteam_score ?? fixture.localteam_score ?? fixture.home_score);
  const awayScore = scoreFromScores(fixture, away?.id) ?? asNumber(fixture.scores?.visitorteam_score ?? fixture.visitorteam_score ?? fixture.away_score);
  const venue = fixture.venue || fixture.venue_data || {};
  const nameParts = String(fixture.name || '').split(/\s+vs\s+/i);

  return {
    apiFixtureId: fixture.id,
    homeTeam: pickName(home) || fixture.home_name || fixture.localteam_name || nameParts[0] || null,
    awayTeam: pickName(away) || fixture.away_name || fixture.visitorteam_name || nameParts[1] || null,
    homeScore,
    awayScore,
    status: normalizeStatus(fixture),
    kickoff: fixture.starting_at || fixture.date_time || fixture.kickoff || null,
    timestamp: fixture.starting_at_timestamp || null,
    stadium: venue.name || fixture.venue_name || null,
    city: venue.city_name || venue.city || null,
    country: venue.country?.name || venue.country_name || null,
    stage: fixture.stage?.name || null,
    round: fixture.round?.name || null,
    group: fixture.group?.name || null,
    matchDetails: fixture.details || null,
    rawState: fixture.state || fixture.status || null,
  };
}

function collectFixtures(value, bucket = []) {
  if (!value) return bucket;

  if (Array.isArray(value)) {
    value.forEach((item) => collectFixtures(item, bucket));
    return bucket;
  }

  if (typeof value !== 'object') return bucket;

  if (
    value.id &&
    (value.starting_at || value.starting_at_timestamp || value.name) &&
    (value.league_id || value.season_id || value.participants || value.venue_id)
  ) {
    bucket.push(value);
  }

  ['fixtures', 'rounds', 'stages', 'groups', 'data'].forEach((key) => {
    if (value[key]) collectFixtures(value[key], bucket);
  });

  return bucket;
}

async function sportFetch(endpoint, token, base, params = {}) {
  const url = new URL(`${base}${endpoint}`);
  url.searchParams.set('api_token', token);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });

  const text = await response.text();
  let json;

  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    const message = json?.message || json?.error || `Sportmonks returned ${response.status}`;
    throw new Error(message);
  }

  return json;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const token = process.env.SPORTMONKS_API_TOKEN;
  const base = process.env.SPORTMONKS_API_BASE || DEFAULT_BASE;
  const seasonId = process.env.SPORTMONKS_SEASON_ID || DEFAULT_SEASON_ID;
  const leagueId = process.env.SPORTMONKS_LEAGUE_ID || DEFAULT_LEAGUE_ID;

  if (!token) {
    return res.status(200).json({
      ok: false,
      mode: 'fallback',
      message: 'SPORTMONKS_API_TOKEN is not configured. The website will use fallback schedule data.',
      fixtures: [],
      standings: [],
      seasonId,
      leagueId,
    });
  }

  const fixtureInclude = 'participants;scores;state;venue;stage;round;group';
  const standingsInclude = 'participant;group';
  const liveInclude = fixtureInclude;

  const tournamentStartDate = '2026-06-11';
  const tournamentEndDate = '2026-07-20';

  const [seasonResult, scheduleResult, standingsResult, liveResult] = await Promise.allSettled([
    sportFetch(`/fixtures/between/${tournamentStartDate}/${tournamentEndDate}`, token, base, {
      include: fixtureInclude,
      filters: `fixtureLeagues:${leagueId}`,
      per_page: 200,
    }),

    // Important: schedule endpoint does not accept nested includes like fixtures.participants.
    // So we request the schedule directly and let collectFixtures() read the nested schedule response.
    sportFetch(`/schedules/seasons/${seasonId}`, token, base),

    sportFetch(`/standings/seasons/${seasonId}`, token, base, {
      include: standingsInclude,
    }),

    sportFetch('/livescores', token, base, {
      include: liveInclude,
      filters: `fixtureLeagues:${leagueId}`,
      per_page: 100,
    }),
  ]);

  const errors = [];

  if (seasonResult.status === 'rejected') errors.push(`season fixtures: ${seasonResult.reason.message}`);
  if (scheduleResult.status === 'rejected') errors.push(`schedule fixtures: ${scheduleResult.reason.message}`);
  if (standingsResult.status === 'rejected') errors.push(`standings: ${standingsResult.reason.message}`);
  if (liveResult.status === 'rejected') errors.push(`livescores: ${liveResult.reason.message}`);

  const seasonFixtures =
    seasonResult.status === 'fulfilled'
      ? collectFixtures(seasonResult.value?.data?.fixtures || seasonResult.value?.data || [])
      : [];

  const scheduleFixtures =
    scheduleResult.status === 'fulfilled'
      ? collectFixtures(scheduleResult.value?.data || [])
      : [];

  const liveFixtures =
    liveResult.status === 'fulfilled'
      ? collectFixtures(liveResult.value?.data || [])
      : [];

  const merged = new Map();

  [...seasonFixtures, ...scheduleFixtures, ...liveFixtures].forEach((fixture) => {
    if (fixture?.id) merged.set(fixture.id, normalizeFixture(fixture));
  });

  const fixtures = [...merged.values()].filter((fixture) => fixture.homeTeam && fixture.awayTeam);
  const standings = standingsResult.status === 'fulfilled' ? standingsResult.value.data || [] : [];

  return res.status(200).json({
    ok: fixtures.length > 0 || standings.length > 0,
    mode: 'sportmonks',
    seasonId,
    leagueId,
    fixtures,
    standings,
    errors,
    debugCounts: {
      seasonFixtures: seasonFixtures.length,
      scheduleFixtures: scheduleFixtures.length,
      liveFixtures: liveFixtures.length,
      standings: standings.length,
    },
    fetchedAt: new Date().toISOString(),
  });
};