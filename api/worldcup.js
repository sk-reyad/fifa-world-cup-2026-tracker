const DEFAULT_BASE = 'https://api.sportmonks.com/v3/football';
const DEFAULT_SEASON_ID = '23706';

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
  if (['ft', 'finished', 'ended', 'aet'].some((v) => state.includes(v))) return 'finished';
  if (['live', '1st', '2nd', 'half', 'ht', 'inplay', 'in play'].some((v) => state.includes(v))) return 'live';
  return 'scheduled';
}

function normalizeFixture(fixture) {
  const home = pickParticipant(fixture, 'home');
  const away = pickParticipant(fixture, 'away');
  const homeScore = scoreFromScores(fixture, home?.id) ?? asNumber(fixture.scores?.localteam_score ?? fixture.localteam_score ?? fixture.home_score);
  const awayScore = scoreFromScores(fixture, away?.id) ?? asNumber(fixture.scores?.visitorteam_score ?? fixture.visitorteam_score ?? fixture.away_score);
  const venue = fixture.venue || fixture.venue_data || {};
  return {
    apiFixtureId: fixture.id,
    homeTeam: pickName(home) || fixture.home_name || fixture.localteam_name,
    awayTeam: pickName(away) || fixture.away_name || fixture.visitorteam_name,
    homeScore,
    awayScore,
    status: normalizeStatus(fixture),
    kickoff: fixture.starting_at || fixture.starting_at_timestamp || fixture.date_time || fixture.kickoff,
    stadium: venue.name || fixture.venue_name || null,
    city: venue.city_name || venue.city || null,
    country: venue.country?.name || venue.country_name || null,
    rawState: fixture.state || fixture.status || null,
  };
}

async function sportFetch(path, token, base) {
  const joiner = path.includes('?') ? '&' : '?';
  const url = `${base}${path}${joiner}api_token=${encodeURIComponent(token)}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: token,
    },
  });
  const text = await response.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
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

  if (!token) {
    return res.status(200).json({
      ok: false,
      mode: 'fallback',
      message: 'SPORTMONKS_API_TOKEN is not configured. The website will use fallback schedule data.',
      fixtures: [],
      standings: [],
      seasonId,
    });
  }

  const fixturePath = `/fixtures?include=participants;scores;state;venue;stage;round;group&filters=fixtureSeasons:${seasonId}&per_page=100`;
  const standingsPath = `/standings/seasons/${seasonId}?include=participant;details;group`;
  const livePath = `/livescores?include=participants;scores;state;venue;stage;round;group&filters=fixtureSeasons:${seasonId}&per_page=100`;

  const [fixturesResult, standingsResult, liveResult] = await Promise.allSettled([
    sportFetch(fixturePath, token, base),
    sportFetch(standingsPath, token, base),
    sportFetch(livePath, token, base),
  ]);

  const errors = [];
  if (fixturesResult.status === 'rejected') errors.push(`fixtures: ${fixturesResult.reason.message}`);
  if (standingsResult.status === 'rejected') errors.push(`standings: ${standingsResult.reason.message}`);
  if (liveResult.status === 'rejected') errors.push(`livescores: ${liveResult.reason.message}`);

  const fixtureData = fixturesResult.status === 'fulfilled' ? (fixturesResult.value.data || []) : [];
  const liveData = liveResult.status === 'fulfilled' ? (liveResult.value.data || []) : [];
  const merged = new Map();
  [...fixtureData, ...liveData].forEach((fixture) => {
    if (fixture?.id) merged.set(fixture.id, normalizeFixture(fixture));
  });

  return res.status(200).json({
    ok: merged.size > 0,
    mode: 'sportmonks',
    seasonId,
    fixtures: [...merged.values()].filter((fixture) => fixture.homeTeam && fixture.awayTeam),
    standings: standingsResult.status === 'fulfilled' ? (standingsResult.value.data || []) : [],
    errors,
    fetchedAt: new Date().toISOString(),
  });
};
