(function () {
  const data = window.WC_FALLBACK_DATA;
  const UI = window.WC_UI;
  const COUNTDOWN = window.WC_COUNTDOWN;
  const STANDINGS = window.WC_STANDINGS;
  const FAV = window.WC_FAVOURITES;
  const NOTIFY = window.WC_NOTIFICATIONS;

  const state = {
    fixtures: typeof structuredClone === 'function' ? structuredClone(data.fixtures) : JSON.parse(JSON.stringify(data.fixtures)),
    groups: data.groups,
    flags: data.flags,
    favouriteTeam: FAV.get(data.meta.defaultFavourite),
    search: '',
    filter: 'all',
    collapsedDays: new Set(),
    apiMode: 'fallback',
    lastLiveSync: null,
  };

  const majorTeams = data.meta.majorTeams;

  function fixtureDate(fixture) {
    return new Date(fixture.kickoff);
  }

  function now() {
    return new Date();
  }

  function isUpcoming(fixture) {
    return fixtureDate(fixture).getTime() > Date.now();
  }

  function isTodayBST(fixture) {
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' });
    return formatter.format(fixtureDate(fixture)) === formatter.format(now());
  }

  function hasTeam(fixture, team) {
    return fixture.homeTeam === team || fixture.awayTeam === team;
  }

  function hasMajorTeam(fixture) {
    return majorTeams.some((team) => hasTeam(fixture, team));
  }

  function nextFixture(fixtures = state.fixtures) {
    return fixtures.filter(isUpcoming).sort((a, b) => fixtureDate(a) - fixtureDate(b))[0] || null;
  }

  function nextFixtureForTeam(team) {
    return state.fixtures.filter((fixture) => hasTeam(fixture, team) && isUpcoming(fixture)).sort((a, b) => fixtureDate(a) - fixtureDate(b))[0] || null;
  }

  function upcomingFixturesForTeam(team) {
    return state.fixtures.filter((fixture) => hasTeam(fixture, team) && isUpcoming(fixture)).sort((a, b) => fixtureDate(a) - fixtureDate(b));
  }

  function formatBSTClock() {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Dhaka',
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(now());
  }

  function renderClock() {
    const el = UI.qs('#bstClock');
    if (el) el.textContent = `BST: ${formatBSTClock()}`;
  }

  function renderFavouriteSelect() {
    const select = UI.qs('#favouriteSelect');
    if (!select) return;
    const teams = FAV.teamsFromGroups(state.groups);
    select.innerHTML = teams.map((team) => `<option value="${UI.escapeHTML(team)}">${UI.teamLabel(team, state.flags[team])}</option>`).join('');
    select.value = state.favouriteTeam;
  }

  function renderHeroNext() {
    const fixture = nextFixture();
    if (!fixture) return;
    UI.qs('#nextMatchTitle').innerHTML = UI.horizontalMatchTitle(fixture).replace('match-title-horizontal', 'match-title-horizontal hero-match-title');
    UI.qs('#nextMatchMeta').textContent = `${UI.formatDateTime(fixture)} • ${fixture.stage}${fixture.group ? ` • Group ${fixture.group}` : ''}`;
    UI.qs('#nextMatchVenue').textContent = `📍 ${UI.fixtureVenue(fixture)}`;
    COUNTDOWN.renderGrid(fixture.kickoff, UI.qs('#globalCountdown'));
  }

  function renderToday() {
    const list = state.fixtures.filter(isTodayBST).sort((a, b) => fixtureDate(a) - fixtureDate(b));
    const el = UI.qs('#todayMatches');
    if (!el) return;
    el.innerHTML = list.length
      ? list.map((fixture) => UI.matchCard(fixture, { isFavourite: hasTeam(fixture, state.favouriteTeam), isMajor: hasMajorTeam(fixture) })).join('')
      : UI.empty(`No World Cup match is scheduled today in Bangladesh time. Next match: ${nextFixture() ? COUNTDOWN.human(nextFixture().kickoff) : 'not available'}.`);
  }

  function renderFavourite() {
    const flag = state.flags[state.favouriteTeam] || '🏳️';
    UI.qs('#favouriteHeading').textContent = `${state.favouriteTeam} Focus`;
    UI.qs('#favouriteBadge').textContent = `${flag} ${state.favouriteTeam}`;

    const next = nextFixtureForTeam(state.favouriteTeam);
    UI.qs('#favouriteFeature').innerHTML = UI.featureCard(next, state.favouriteTeam);

    const upcoming = upcomingFixturesForTeam(state.favouriteTeam);
    UI.qs('#favouriteTimeline').innerHTML = upcoming.length
      ? upcoming.map(UI.timelineItem).join('')
      : UI.empty(`No upcoming match found for ${state.favouriteTeam}.`);
  }

  function renderMajorTeams() {
    const el = UI.qs('#majorTeams');
    if (!el) return;
    el.innerHTML = majorTeams.map((team) => {
      const flag = state.flags[team] || '🏳️';
      const fixture = nextFixtureForTeam(team);
      if (!fixture) {
        return `<article class="team-watch-card"><h3>${UI.escapeHTML(flag)} ${UI.escapeHTML(team)}</h3>${UI.empty('No upcoming match found.')}</article>`;
      }
      return `
        <article class="team-watch-card" data-match-id="${UI.escapeHTML(fixture.id)}">
          <h3>${UI.escapeHTML(flag)} ${UI.escapeHTML(team)}</h3>
          ${UI.horizontalMatchTitle(fixture)}
          ${UI.metaRow(fixture, team === state.favouriteTeam, true)}
          ${UI.scoreLine(fixture)}
          <p class="time-line">🕒 ${UI.escapeHTML(UI.formatDateTime(fixture))}</p>
          <p class="venue-line">📍 ${UI.escapeHTML(UI.fixtureVenue(fixture))}</p>
          ${UI.countdownContainer(fixture)}
        </article>
      `;
    }).join('');
  }

  function renderScoreboard() {
    const el = UI.qs('#liveScoreboard');
    if (!el) return;
    const liveOrToday = state.fixtures
      .filter((fixture) => isTodayBST(fixture) || ['live', 'inplay', '1st_half', '2nd_half', 'ht', 'finished', 'ft'].includes(String(fixture.status).toLowerCase()))
      .sort((a, b) => fixtureDate(a) - fixtureDate(b))
      .slice(0, 12);

    const fallback = liveOrToday.length ? liveOrToday : state.fixtures.filter(isUpcoming).sort((a, b) => fixtureDate(a) - fixtureDate(b)).slice(0, 6);

    el.innerHTML = fallback.map((fixture) => `
      <article class="score-card" data-match-id="${UI.escapeHTML(fixture.id)}">
        ${UI.horizontalMatchTitle(fixture)}
        ${UI.metaRow(fixture, hasTeam(fixture, state.favouriteTeam), hasMajorTeam(fixture))}
        ${UI.scoreLine(fixture) || '<p class="venue-line">Score will appear here when live API data is connected.</p>'}
        <p class="time-line">🕒 ${UI.escapeHTML(UI.formatDateTime(fixture))}</p>
        ${UI.countdownContainer(fixture)}
      </article>
    `).join('');
  }

  function filterFixtures() {
    const term = state.search.trim().toLowerCase();
    let list = [...state.fixtures];
    if (state.filter === 'today') list = list.filter(isTodayBST);
    if (state.filter === 'favourite') list = list.filter((fixture) => hasTeam(fixture, state.favouriteTeam));
    if (state.filter === 'major') list = list.filter(hasMajorTeam);
    if (state.filter === 'group') list = list.filter((fixture) => fixture.stage === 'Group Stage');
    if (state.filter === 'knockout') list = list.filter((fixture) => fixture.stage !== 'Group Stage');
    if (term) {
      list = list.filter((fixture) => {
        const hay = [fixture.homeTeam, fixture.awayTeam, fixture.stage, fixture.group ? `Group ${fixture.group}` : '', fixture.dateLabel, fixture.timeLabel, fixture.stadium, fixture.city, fixture.country, fixture.venueKey].join(' ').toLowerCase();
        return hay.includes(term);
      });
    }
    return list.sort((a, b) => fixtureDate(a) - fixtureDate(b));
  }

  function dateGroupKey(fixture) {
    return fixture.dateLabel;
  }

  function renderSchedule() {
    const el = UI.qs('#scheduleList');
    if (!el) return;
    const filtered = filterFixtures();
    if (!filtered.length) {
      el.innerHTML = UI.empty('No matches found for this filter/search.');
      return;
    }
    const groups = filtered.reduce((acc, fixture) => {
      const key = dateGroupKey(fixture);
      if (!acc[key]) acc[key] = [];
      acc[key].push(fixture);
      return acc;
    }, {});

    el.innerHTML = Object.entries(groups).map(([date, fixtures]) => {
      const collapsed = state.collapsedDays.has(date);
      const stages = [...new Set(fixtures.map((fixture) => fixture.stage))].join(' • ');
      return `
        <section class="day-block${collapsed ? ' is-collapsed' : ''}" data-day="${UI.escapeHTML(date)}">
          <button class="day-summary" type="button" data-toggle-day="${UI.escapeHTML(date)}">
            <strong>${UI.escapeHTML(date)}</strong>
            <span>${fixtures.length} match${fixtures.length > 1 ? 'es' : ''} • ${UI.escapeHTML(stages)}</span>
          </button>
          <div class="day-content">
            ${fixtures.map((fixture) => UI.matchCard(fixture, { isFavourite: hasTeam(fixture, state.favouriteTeam), isMajor: hasMajorTeam(fixture) })).join('')}
          </div>
        </section>
      `;
    }).join('');
  }

  function renderStandings() {
    const standings = STANDINGS.calculate(state.groups, state.flags, state.fixtures);
    const el = UI.qs('#standingsGrid');
    if (!el) return;
    el.innerHTML = Object.entries(standings).map(([group, rows]) => `
      <article class="standings-card">
        <h3><span>Group ${UI.escapeHTML(group)}</span><span class="badge">Top 2 + best 3rd</span></h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Pos</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr>
            </thead>
            <tbody>
              ${rows.map((row, index) => `
                <tr class="${index < 2 ? 'qualified-row' : ''}">
                  <td>${index + 1}</td>
                  <td class="team-name-cell">${UI.escapeHTML(row.flag)} ${UI.escapeHTML(row.team)}</td>
                  <td>${row.played}</td><td>${row.win}</td><td>${row.draw}</td><td>${row.loss}</td>
                  <td>${row.gf}</td><td>${row.ga}</td><td>${row.gd > 0 ? '+' : ''}${row.gd}</td><td><strong>${row.points}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </article>
    `).join('');
  }

  function renderGroups() {
    const el = UI.qs('#groupsGrid');
    if (!el) return;
    el.innerHTML = Object.entries(state.groups).map(([group, teams]) => `
      <article class="group-card">
        <h3><span>Group ${UI.escapeHTML(group)}</span><span class="badge">${teams.length} teams</span></h3>
        <ul>
          ${teams.map((team) => `<li><strong>${UI.escapeHTML(state.flags[team] || '🏳️')} ${UI.escapeHTML(team)}</strong><span>${state.fixtures.filter((fixture) => hasTeam(fixture, team)).length} matches</span></li>`).join('')}
        </ul>
      </article>
    `).join('');
  }

  function renderCountdowns() {
    UI.qsa('[data-countdown]').forEach((el) => {
      const fixture = state.fixtures.find((item) => item.id === el.dataset.countdown);
      if (fixture) COUNTDOWN.renderGrid(fixture.kickoff, el, el.classList.contains('mini-countdown'));
    });
    renderHeroNext();
  }

  function bindDynamicClicks() {
    document.addEventListener('click', async (event) => {
      const notifyBtn = event.target.closest('[data-notify-id]');
      if (notifyBtn) {
        const permission = await NOTIFY.requestPermission();
        if (permission !== 'granted') {
          notifyBtn.textContent = permission === 'unsupported' ? 'Notifications unsupported' : 'Permission needed';
          return;
        }
        const enabled = NOTIFY.toggle(notifyBtn.dataset.notifyId);
        notifyBtn.textContent = enabled ? '🔔 Alert On' : '🔕 Notify 20 min before';
        return;
      }

      const dayBtn = event.target.closest('[data-toggle-day]');
      if (dayBtn) {
        const day = dayBtn.dataset.toggleDay;
        if (state.collapsedDays.has(day)) state.collapsedDays.delete(day);
        else state.collapsedDays.add(day);
        renderSchedule();
        renderCountdowns();
      }
    });
  }

  function setupStaticEvents() {
    const themeToggle = UI.qs('#themeToggle');
    const savedTheme = localStorage.getItem('wc2026-theme') || 'dark';
    document.documentElement.dataset.theme = savedTheme;
    themeToggle.textContent = savedTheme === 'dark' ? '🌙' : '☀️';
    themeToggle.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      localStorage.setItem('wc2026-theme', next);
      themeToggle.textContent = next === 'dark' ? '🌙' : '☀️';
    });

    UI.qs('#navToggle').addEventListener('click', () => {
      const nav = UI.qs('#siteNav');
      const open = nav.classList.toggle('is-open');
      UI.qs('#navToggle').setAttribute('aria-expanded', String(open));
    });

    UI.qs('#favouriteSelect').addEventListener('change', (event) => {
      state.favouriteTeam = event.target.value;
      FAV.set(state.favouriteTeam);
      renderAll();
    });

    UI.qs('#scheduleSearch').addEventListener('input', (event) => {
      state.search = event.target.value;
      renderSchedule();
      renderCountdowns();
    });

    UI.qs('#stageFilter').addEventListener('change', (event) => {
      state.filter = event.target.value;
      renderSchedule();
      renderCountdowns();
    });

    UI.qs('#expandAllBtn').addEventListener('click', () => {
      state.collapsedDays.clear();
      renderSchedule();
      renderCountdowns();
    });

    UI.qs('#collapseAllBtn').addEventListener('click', () => {
      filterFixtures().forEach((fixture) => state.collapsedDays.add(dateGroupKey(fixture)));
      renderSchedule();
    });

    UI.qs('#notifyEnableBtn').addEventListener('click', async () => {
      const status = await NOTIFY.requestPermission();
      UI.qs('#notifyEnableBtn').textContent = status === 'granted' ? '🔔 Alerts Enabled' : status === 'unsupported' ? 'Notifications Unsupported' : '🔔 Permission Needed';
    });

    UI.qs('#refreshLiveBtn').addEventListener('click', () => fetchLiveData(true));
  }

  function normalizeName(name) {
    return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function mergeLiveFixture(live) {
    if (!live || !live.homeTeam || !live.awayTeam) return false;
    const liveHome = normalizeName(live.homeTeam);
    const liveAway = normalizeName(live.awayTeam);
    const target = state.fixtures.find((fixture) =>
      normalizeName(fixture.homeTeam) === liveHome && normalizeName(fixture.awayTeam) === liveAway
    ) || state.fixtures.find((fixture) =>
      normalizeName(fixture.homeTeam) === liveAway && normalizeName(fixture.awayTeam) === liveHome
    );
    if (!target) return false;

    const sameDirection = normalizeName(target.homeTeam) === liveHome;
    target.status = live.status || target.status;
    target.apiFixtureId = live.apiFixtureId || target.apiFixtureId;
    if (Number.isFinite(live.homeScore) && Number.isFinite(live.awayScore)) {
      target.homeScore = sameDirection ? live.homeScore : live.awayScore;
      target.awayScore = sameDirection ? live.awayScore : live.homeScore;
    }
    if (live.kickoff) target.apiKickoff = live.kickoff;
    if (live.stadium) target.apiVenue = [live.stadium, live.city, live.country].filter(Boolean).join(', ');
    return true;
  }

  async function fetchLiveData(manual = false) {
    const statusEl = UI.qs('#apiStatus');
    if (statusEl) statusEl.textContent = manual ? 'Data mode: refreshing live API…' : 'Data mode: checking live API…';
    try {
      const response = await fetch('/api/worldcup', { cache: 'no-store' });
      if (!response.ok) throw new Error(`API proxy returned ${response.status}`);
      const payload = await response.json();
      if (!payload.ok || !Array.isArray(payload.fixtures) || payload.fixtures.length === 0) {
        throw new Error(payload.message || 'No live fixtures returned');
      }
      let merged = 0;
      payload.fixtures.forEach((fixture) => { if (mergeLiveFixture(fixture)) merged += 1; });
      state.apiMode = `Sportmonks connected (${merged} matches synced)`;
      state.lastLiveSync = new Date();
      if (statusEl) statusEl.textContent = `Data mode: ${state.apiMode}`;
      renderAll();
    } catch (error) {
      state.apiMode = 'fallback schedule';
      if (statusEl) statusEl.textContent = `Data mode: fallback schedule${manual ? ' — API not connected yet' : ''}`;
      if (manual) console.warn('Live API refresh failed:', error);
    }
  }

  function renderAll() {
    renderClock();
    renderFavouriteSelect();
    renderHeroNext();
    renderToday();
    renderFavourite();
    renderMajorTeams();
    renderScoreboard();
    renderSchedule();
    renderStandings();
    renderGroups();
    renderCountdowns();
  }

  function init() {
    setupStaticEvents();
    bindDynamicClicks();
    renderAll();
    fetchLiveData(false);

    setInterval(() => {
      renderClock();
      renderCountdowns();
      NOTIFY.tick(state.fixtures);
    }, 1000);

    setInterval(() => fetchLiveData(false), 120000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
