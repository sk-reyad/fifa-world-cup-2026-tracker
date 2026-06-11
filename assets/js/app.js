(function () {
  const data = window.WC_FALLBACK_DATA;
  const UI = window.WC_UI;
  const COUNTDOWN = window.WC_COUNTDOWN;
  const STANDINGS = window.WC_STANDINGS;
  const FAV = window.WC_FAVOURITES;
  const NOTIFY = window.WC_NOTIFICATIONS;

  const FOLLOWED_KEY = 'wc2026-followed-teams';

  function allTeams() {
    return FAV.teamsFromGroups(data.groups);
  }

  function loadFollowedTeams() {
    const valid = new Set(allTeams());
    try {
      const parsed = JSON.parse(localStorage.getItem(FOLLOWED_KEY) || '[]');
      if (Array.isArray(parsed)) {
        const clean = [...new Set(parsed.filter((team) => valid.has(team)))];
        if (clean.length) return clean;
      }
    } catch {}
    return (data.meta.majorTeams || []).filter((team) => valid.has(team));
  }

  function saveFollowedTeams() {
    localStorage.setItem(FOLLOWED_KEY, JSON.stringify(state.followedTeams));
  }

  const state = {
    fixtures: typeof structuredClone === 'function' ? structuredClone(data.fixtures) : JSON.parse(JSON.stringify(data.fixtures)),
    groups: data.groups,
    flags: data.flags,
    favouriteTeam: FAV.get(data.meta.defaultFavourite),
    followedTeams: loadFollowedTeams(),
    search: '',
    filter: 'all',
    resultTeam: 'all',
    collapsedDays: new Set(),
    apiMode: 'fallback',
    lastLiveSync: null,
  };

  function fixtureDate(fixture) {
    return new Date(fixture.kickoff);
  }

  function now() {
    return new Date();
  }

  function isUpcoming(fixture) {
    return fixtureDate(fixture).getTime() > Date.now() && !UI.isLiveFixture(fixture) && !UI.isFinishedFixture(fixture);
  }

  function isTodayBST(fixture) {
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' });
    return formatter.format(fixtureDate(fixture)) === formatter.format(now());
  }

  function hasTeam(fixture, team) {
    return fixture.homeTeam === team || fixture.awayTeam === team;
  }

  function hasFollowedTeam(fixture) {
    return state.followedTeams.some((team) => hasTeam(fixture, team));
  }

  function nextFixture(fixtures = state.fixtures) {
    return fixtures.filter(isUpcoming).sort((a, b) => fixtureDate(a) - fixtureDate(b))[0] || null;
  }

  function liveFixture(fixtures = state.fixtures) {
    return fixtures.filter(UI.isLiveFixture).sort((a, b) => fixtureDate(a) - fixtureDate(b))[0] || null;
  }

  function lastFinishedFixture(fixtures = state.fixtures) {
    return fixtures
      .filter((fixture) => UI.isFinishedFixture(fixture) && UI.scoreAvailable(fixture))
      .sort((a, b) => fixtureDate(b) - fixtureDate(a))[0] || null;
  }

  function nextFixtureForTeam(team) {
    return state.fixtures.filter((fixture) => hasTeam(fixture, team) && isUpcoming(fixture)).sort((a, b) => fixtureDate(a) - fixtureDate(b))[0] || null;
  }

  function liveFixtureForTeam(team) {
    return state.fixtures.filter((fixture) => hasTeam(fixture, team) && UI.isLiveFixture(fixture)).sort((a, b) => fixtureDate(a) - fixtureDate(b))[0] || null;
  }

  function latestFinishedForTeam(team) {
    return state.fixtures
      .filter((fixture) => hasTeam(fixture, team) && UI.isFinishedFixture(fixture) && UI.scoreAvailable(fixture))
      .sort((a, b) => fixtureDate(b) - fixtureDate(a))[0] || null;
  }

  function focusFixtureForTeam(team) {
    return liveFixtureForTeam(team) || nextFixtureForTeam(team) || latestFinishedForTeam(team);
  }

  function upcomingFixturesForTeam(team) {
    return state.fixtures.filter((fixture) => hasTeam(fixture, team) && isUpcoming(fixture)).sort((a, b) => fixtureDate(a) - fixtureDate(b));
  }

  function formatBSTClock() {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Dhaka', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).format(now());
  }

  function renderClock() {
    const el = UI.qs('#bstClock');
    if (el) el.textContent = `BST: ${formatBSTClock()}`;
  }

  function renderFavouriteSelect() {
    const select = UI.qs('#favouriteSelect');
    if (!select) return;
    const teams = allTeams();
    select.innerHTML = teams.map((team) => `<option value="${UI.escapeHTML(team)}">${UI.escapeHTML(team)}</option>`).join('');
    select.value = state.favouriteTeam;
  }

  function renderResultTeamSelect() {
    const select = UI.qs('#resultTeamFilter');
    if (!select) return;
    const teams = allTeams();
    select.innerHTML = '<option value="all">All results</option>' + teams.map((team) => `<option value="${UI.escapeHTML(team)}">${UI.escapeHTML(team)}</option>`).join('');
    select.value = state.resultTeam;
  }

  function renderFollowedPicker() {
    const select = UI.qs('#followedTeamPicker');
    const chips = UI.qs('#followedTeamChips');
    if (!select || !chips) return;
    const teams = allTeams();
    const available = teams.filter((team) => !state.followedTeams.includes(team));
    select.innerHTML = '<option value="">Select team to follow</option>' + available.map((team) => `<option value="${UI.escapeHTML(team)}">${UI.escapeHTML(team)}</option>`).join('');
    select.value = '';
    chips.innerHTML = state.followedTeams.length
      ? state.followedTeams.map((team) => `
        <button class="selected-team-chip" type="button" data-remove-followed="${UI.escapeHTML(team)}">
          ${UI.teamLabel(team, state.flags[team] || 'un')} ${UI.icon('x')}
        </button>
      `).join('')
      : '<span class="empty-chip-note">No followed team selected yet.</span>';
  }

  function renderHeroDashboard() {
    const primaryEl = UI.qs('#heroPrimary');
    const secondaryEl = UI.qs('#heroSecondary');
    if (!primaryEl || !secondaryEl) return;

    const live = liveFixture();
    if (live) {
      primaryEl.innerHTML = UI.heroPanel(live, 'primary', { label: 'Live Match' });
      const next = nextFixture(state.fixtures.filter((fixture) => fixture.id !== live.id));
      secondaryEl.innerHTML = UI.heroPanel(next, 'secondary', {
        label: 'Next Match',
        emptyTitle: 'No upcoming match found',
        emptyText: 'The next scheduled match will appear here when available.',
      });
      return;
    }

    const next = nextFixture();
    const last = lastFinishedFixture();
    primaryEl.innerHTML = UI.heroPanel(next, 'primary', {
      label: 'Next Match',
      emptyTitle: 'No upcoming match found',
      emptyText: 'The next scheduled fixture will appear here when connected.',
    });
    secondaryEl.innerHTML = UI.heroPanel(last, 'secondary', {
      label: 'Last Finished Result',
      emptyTitle: 'No finished result yet',
      emptyText: 'When the first match finishes, its final score will appear here automatically.',
    });
  }

  function renderToday() {
    const list = state.fixtures.filter(isTodayBST).sort((a, b) => fixtureDate(a) - fixtureDate(b));
    const el = UI.qs('#todayMatches');
    if (!el) return;
    el.innerHTML = list.length
      ? list.map((fixture) => UI.matchCard(fixture, { isFavourite: hasTeam(fixture, state.favouriteTeam) })).join('')
      : UI.empty(`No World Cup match is scheduled today in Bangladesh time. Next match: ${nextFixture() ? COUNTDOWN.human(nextFixture().kickoff) : 'not available'}.`);
  }

  function renderFavourite() {
    const flag = state.flags[state.favouriteTeam] || 'un';
    UI.qs('#favouriteHeading').textContent = `${state.favouriteTeam} Focus`;
    UI.qs('#favouriteBadge').innerHTML = UI.teamLabel(state.favouriteTeam, flag);

    const focus = focusFixtureForTeam(state.favouriteTeam);
    UI.qs('#favouriteFeature').innerHTML = UI.featureCard(focus, state.favouriteTeam);

    const upcoming = upcomingFixturesForTeam(state.favouriteTeam).filter((fixture) => !focus || fixture.id !== focus.id).slice(0, 3);
    const finished = latestFinishedForTeam(state.favouriteTeam);
    const list = upcoming.length ? upcoming : (finished && (!focus || finished.id !== focus.id) ? [finished] : []);
    const timelineEl = UI.qs('#favouriteTimeline');
    if (!timelineEl) return;
    timelineEl.className = `timeline timeline--count-${Math.max(1, Math.min(list.length || 1, 3))}`;
    timelineEl.innerHTML = list.length
      ? list.map((fixture) => UI.matchCard(fixture, { isFavourite: true })).join('')
      : UI.empty(`No additional upcoming match found for ${state.favouriteTeam}.`);
  }

  function renderFollowedTeams() {
    renderFollowedPicker();
    const el = UI.qs('#majorTeams');
    if (!el) return;
    if (!state.followedTeams.length) {
      el.innerHTML = UI.empty('Select one or more teams to start tracking their next matches.');
      return;
    }
    el.innerHTML = state.followedTeams.map((team) => {
      const fixture = liveFixtureForTeam(team) || nextFixtureForTeam(team);
      if (!fixture) return `<article class="team-watch-card">${UI.empty(`No upcoming match found for ${team}.`)}</article>`;
      return UI.matchCard(fixture, { isFavourite: team === state.favouriteTeam });
    }).join('');
  }

  function renderScoreboard() {
    const el = UI.qs('#liveScoreboard');
    if (!el) return;
    const live = state.fixtures.filter(UI.isLiveFixture);
    const finishedToday = state.fixtures.filter((fixture) => isTodayBST(fixture) && UI.isFinishedFixture(fixture));
    const todayUpcoming = state.fixtures.filter((fixture) => isTodayBST(fixture) && isUpcoming(fixture));
    let list = [...live, ...finishedToday, ...todayUpcoming].sort((a, b) => fixtureDate(a) - fixtureDate(b));
    if (!list.length) list = state.fixtures.filter(isUpcoming).sort((a, b) => fixtureDate(a) - fixtureDate(b)).slice(0, 6);
    el.innerHTML = list.slice(0, 12).map((fixture) => UI.matchCard(fixture, { isFavourite: hasTeam(fixture, state.favouriteTeam) })).join('');
  }

  function renderResults() {
    const el = UI.qs('#resultsGrid');
    if (!el) return;
    let results = state.fixtures
      .filter((fixture) => UI.isFinishedFixture(fixture) && UI.scoreAvailable(fixture))
      .sort((a, b) => fixtureDate(b) - fixtureDate(a));
    if (state.resultTeam !== 'all') results = results.filter((fixture) => hasTeam(fixture, state.resultTeam));
    el.innerHTML = results.length
      ? results.slice(0, 18).map((fixture) => UI.matchCard(fixture, { isFavourite: hasTeam(fixture, state.favouriteTeam) })).join('')
      : UI.empty('No finished match result is available yet. Final scores will appear here after matches finish.');
  }

  function filterFixtures() {
    const term = state.search.trim().toLowerCase();
    let list = [...state.fixtures];
    if (state.filter === 'today') list = list.filter(isTodayBST);
    if (state.filter === 'favourite') list = list.filter((fixture) => hasTeam(fixture, state.favouriteTeam));
    if (state.filter === 'major') list = list.filter(hasFollowedTeam);
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
            ${fixtures.map((fixture) => UI.matchCard(fixture, { isFavourite: hasTeam(fixture, state.favouriteTeam) })).join('')}
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
                  <td class="team-name-cell">${UI.teamLabel(row.team, row.flag)}</td>
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
          ${teams.map((team) => `<li><strong>${UI.teamLabel(team, state.flags[team] || 'un')}</strong><span>${state.fixtures.filter((fixture) => hasTeam(fixture, team)).length} matches</span></li>`).join('')}
        </ul>
      </article>
    `).join('');
  }

  function renderCountdowns() {
    UI.qsa('[data-countdown]').forEach((el) => {
      const fixture = state.fixtures.find((item) => item.id === el.dataset.countdown);
      if (fixture) COUNTDOWN.renderGrid(fixture.kickoff, el, el.classList.contains('mini-countdown') || el.classList.contains('hero-mini-countdown'));
    });
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
        notifyBtn.innerHTML = enabled ? `${UI.icon('bell')} <span>Alert On</span>` : `${UI.icon('bellOff')} <span>Notify 20 min before</span>`;
        return;
      }

      const removeFollowed = event.target.closest('[data-remove-followed]');
      if (removeFollowed) {
        const team = removeFollowed.dataset.removeFollowed;
        state.followedTeams = state.followedTeams.filter((item) => item !== team);
        saveFollowedTeams();
        renderFollowedTeams();
        renderSchedule();
        renderCountdowns();
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
    themeToggle.innerHTML = savedTheme === 'dark' ? UI.icon('moon') : UI.icon('sun');
    themeToggle.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      localStorage.setItem('wc2026-theme', next);
      themeToggle.innerHTML = next === 'dark' ? UI.icon('moon') : UI.icon('sun');
    });

    UI.qs('#navToggle').addEventListener('click', () => {
      const nav = UI.qs('#siteNav');
      const toggle = UI.qs('#navToggle');
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.innerHTML = open ? UI.icon('close') : UI.icon('menu');
    });

    const updateStickyState = () => {
      document.documentElement.classList.toggle('is-scrolled', window.scrollY > 24);
    };
    updateStickyState();
    window.addEventListener('scroll', updateStickyState, { passive: true });

    UI.qsa('#siteNav a').forEach((link) => {
      link.addEventListener('click', () => {
        const nav = UI.qs('#siteNav');
        const toggle = UI.qs('#navToggle');
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.innerHTML = UI.icon('menu');
      });
    });

    UI.qs('#favouriteSelect').addEventListener('change', (event) => {
      state.favouriteTeam = event.target.value;
      FAV.set(state.favouriteTeam);
      renderAll();
    });

    UI.qs('#followedTeamPicker').addEventListener('change', (event) => {
      const team = event.target.value;
      if (team && !state.followedTeams.includes(team)) {
        state.followedTeams.push(team);
        saveFollowedTeams();
        renderFollowedTeams();
        renderSchedule();
        renderCountdowns();
      }
      event.target.value = '';
    });

    UI.qs('#clearFollowedBtn').addEventListener('click', () => {
      state.followedTeams = [];
      saveFollowedTeams();
      renderFollowedTeams();
      renderSchedule();
      renderCountdowns();
    });

    UI.qs('#resultTeamFilter').addEventListener('change', (event) => {
      state.resultTeam = event.target.value;
      renderResults();
      renderCountdowns();
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
      UI.qs('#notifyEnableBtn').innerHTML = status === 'granted' ? `${UI.icon('bell')} <span>Alerts Enabled</span>` : status === 'unsupported' ? '<span>Notifications Unsupported</span>' : `${UI.icon('bell')} <span>Permission Needed</span>`;
    });

    UI.qs('#refreshLiveBtn').addEventListener('click', () => fetchLiveData(true));
  }

  function updateDateLabels(fixture) {
    if (!fixture || !fixture.kickoff) return;
    const date = new Date(fixture.kickoff);
    if (Number.isNaN(date.getTime())) return;
    fixture.dateLabel = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Dhaka', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(date);
    fixture.timeLabel = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Dhaka', hour: 'numeric', minute: '2-digit' }).format(date);
  }

  function normalizeName(name) {
    return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function mergeLiveFixture(live) {
    if (!live || !live.homeTeam || !live.awayTeam) return false;
    const liveHome = normalizeName(live.homeTeam);
    const liveAway = normalizeName(live.awayTeam);
    const target = (live.matchNumber ? state.fixtures.find((fixture) => Number(fixture.matchNumber) === Number(live.matchNumber)) : null)
      || state.fixtures.find((fixture) => normalizeName(fixture.homeTeam) === liveHome && normalizeName(fixture.awayTeam) === liveAway)
      || state.fixtures.find((fixture) => normalizeName(fixture.homeTeam) === liveAway && normalizeName(fixture.awayTeam) === liveHome);
    if (!target) return false;

    const sameDirection = normalizeName(target.homeTeam) === liveHome;
    target.status = live.status || target.status;
    target.apiFixtureId = live.apiFixtureId || target.apiFixtureId;
    target.timeElapsed = live.timeElapsed || live.minute || live.elapsed || target.timeElapsed;
    if (Number.isFinite(live.homeScore) && Number.isFinite(live.awayScore)) {
      target.homeScore = sameDirection ? live.homeScore : live.awayScore;
      target.awayScore = sameDirection ? live.awayScore : live.homeScore;
    }
    if (Number.isFinite(live.homePenalty) && Number.isFinite(live.awayPenalty)) {
      target.homePenalty = sameDirection ? live.homePenalty : live.awayPenalty;
      target.awayPenalty = sameDirection ? live.awayPenalty : live.homePenalty;
    }
    if (live.matchNumber && Number(target.matchNumber) === Number(live.matchNumber)) {
      if (live.homeTeam && (live.homeTeamConfirmed || String(target.homeTeam || '').toLowerCase().includes('winner') || String(target.homeTeam || '').toLowerCase().includes('runner') || String(target.homeTeam || '').toLowerCase().includes('3rd'))) target.homeTeam = live.homeTeam;
      if (live.awayTeam && (live.awayTeamConfirmed || String(target.awayTeam || '').toLowerCase().includes('winner') || String(target.awayTeam || '').toLowerCase().includes('runner') || String(target.awayTeam || '').toLowerCase().includes('3rd'))) target.awayTeam = live.awayTeam;
      target.homeFlag = state.flags[target.homeTeam] || target.homeFlag || 'un';
      target.awayFlag = state.flags[target.awayTeam] || target.awayFlag || 'un';
    }
    if (live.kickoff) {
      target.kickoff = live.kickoff;
      updateDateLabels(target);
    }
    if (live.stage) target.stage = live.stage;
    if (live.group) target.group = live.group;
    if (live.stadium) {
      target.stadium = live.stadium;
      target.city = live.city || target.city;
      target.country = live.country || target.country;
      target.apiVenue = [live.stadium, live.city, live.country].filter(Boolean).join(', ');
    }
    return true;
  }


  function clientAsArray(payload, keys = []) {
    if (Array.isArray(payload)) return payload;
    for (const key of keys) {
      if (Array.isArray(payload?.[key])) return payload[key];
    }
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.result)) return payload.result;
    return [];
  }

  function clientClean(value) {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    if (!text || text.toLowerCase() === 'null' || text.toLowerCase() === 'undefined') return null;
    return text;
  }

  function clientAsNumber(value) {
    if (value === null || value === undefined || value === '' || value === 'null') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function clientBoolish(value) {
    const text = String(value ?? '').trim().toLowerCase();
    return ['true', '1', 'yes', 'finished', 'ft'].includes(text);
  }

  function clientStageFromType(type) {
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

  function clientStatusFromGame(game) {
    if (clientBoolish(game.finished)) return 'finished';
    const elapsed = String(game.time_elapsed || game.status || '').trim().toLowerCase();
    if (!elapsed || elapsed === 'notstarted' || elapsed === 'not_started' || elapsed === 'scheduled') return 'scheduled';
    if (elapsed.includes('half') || elapsed.includes('live') || elapsed.includes('1st') || elapsed.includes('2nd') || /^\d+$/.test(elapsed)) return 'live';
    return elapsed;
  }

  function clientOffsetForStadium(stadium = {}) {
    const id = String(stadium.id || stadium.stadium_id || '');
    const city = String(stadium.city_en || stadium.city || '').toLowerCase();
    const country = String(stadium.country_en || stadium.country || '').toLowerCase();
    if (country.includes('mexico') || ['1', '2', '3'].includes(id) || city.includes('mexico') || city.includes('guadalajara') || city.includes('monterrey')) return '-06:00';
    if (city.includes('vancouver') || city.includes('los angeles') || city.includes('inglewood') || city.includes('seattle') || city.includes('san francisco') || city.includes('santa clara')) return '-07:00';
    if (city.includes('dallas') || city.includes('arlington') || city.includes('houston') || city.includes('kansas')) return '-05:00';
    if (city.includes('toronto') || city.includes('east rutherford') || city.includes('new york') || city.includes('miami') || city.includes('atlanta') || city.includes('philadelphia') || city.includes('boston') || city.includes('foxborough')) return '-04:00';
    return '-05:00';
  }

  function clientKickoffFromLocalDate(localDate, stadium) {
    const text = clientClean(localDate);
    if (!text) return null;
    const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
    if (!match) return text;
    const [, mm, dd, yyyy, hh, min] = match;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T${hh.padStart(2, '0')}:${min}:00${clientOffsetForStadium(stadium)}`;
  }

  function clientNormalizeTeamName(name) {
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
    const raw = clientClean(name);
    if (!raw) return null;
    const key = raw.toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9']+/g, ' ').trim();
    return aliases[key] || raw;
  }

  function clientBuildTeamMaps(teams) {
    const byId = new Map();
    teams.forEach((team) => {
      const id = clientClean(team.id || team.team_id || team._id);
      const name = clientNormalizeTeamName(team.name_en || team.name || team.team_name || team.name_fa);
      const entry = {
        id,
        name,
        group: clientClean(team.groups || team.group),
        fifaCode: clientClean(team.fifa_code),
        flagUrl: clientClean(team.flag),
      };
      if (id) byId.set(String(id), entry);
    });
    return { byId };
  }

  function clientBuildStadiumMap(stadiums) {
    const byId = new Map();
    stadiums.forEach((stadium) => {
      const id = clientClean(stadium.id || stadium.stadium_id || stadium._id);
      const entry = {
        id,
        stadium: clientClean(stadium.name_en || stadium.name || stadium.fifa_name),
        city: clientClean(stadium.city_en || stadium.city),
        country: clientClean(stadium.country_en || stadium.country),
      };
      if (id) byId.set(String(id), entry);
    });
    return byId;
  }

  function clientShouldShowScore(status) {
    return ['live', 'finished', 'ft', 'aet', 'pen_finished'].includes(String(status || '').toLowerCase());
  }

  function clientNormalizeGame(game, teamMaps, stadiumMap) {
    const stadium = stadiumMap.get(String(game.stadium_id || '')) || {};
    const homeId = clientClean(game.home_team_id);
    const awayId = clientClean(game.away_team_id);
    const homeTeamRecord = homeId && homeId !== '0' ? teamMaps.byId.get(String(homeId)) : null;
    const awayTeamRecord = awayId && awayId !== '0' ? teamMaps.byId.get(String(awayId)) : null;
    const homeTeam = clientNormalizeTeamName(homeTeamRecord?.name || game.home_team_name_en || game.home_team_name || game.home_team_label || game.home_label);
    const awayTeam = clientNormalizeTeamName(awayTeamRecord?.name || game.away_team_name_en || game.away_team_name || game.away_team_label || game.away_label);
    const status = clientStatusFromGame(game);
    const showScore = clientShouldShowScore(status);
    const matchNumber = clientAsNumber(game.id || game.match_id || game.matchNumber);
    return {
      apiFixtureId: clientClean(game._id || game.id),
      matchNumber,
      homeTeam,
      awayTeam,
      homeTeamConfirmed: Boolean(homeTeamRecord || (homeId && homeId !== '0')),
      awayTeamConfirmed: Boolean(awayTeamRecord || (awayId && awayId !== '0')),
      homeScore: showScore ? clientAsNumber(game.home_score) : null,
      awayScore: showScore ? clientAsNumber(game.away_score) : null,
      homePenalty: clientAsNumber(game.home_penalty || game.home_penalty_score || game.home_penalties || game.home_penalties_score),
      awayPenalty: clientAsNumber(game.away_penalty || game.away_penalty_score || game.away_penalties || game.away_penalties_score),
      status,
      kickoff: clientKickoffFromLocalDate(game.local_date, stadium),
      stadium: stadium.stadium || clientClean(game.stadium_name),
      city: stadium.city || clientClean(game.city),
      country: stadium.country || clientClean(game.country),
      stage: clientStageFromType(game.type),
      group: /^[A-L]$/i.test(String(game.group || '')) ? String(game.group).toUpperCase() : null,
      type: clientClean(game.type),
      timeElapsed: clientClean(game.time_elapsed),
    };
  }

  async function clientFetchJSON(url) {
    const response = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.json();
  }

  async function fetchProxyWorldCupPayload() {
    const response = await fetch('/api/worldcup', { cache: 'no-store' });
    if (!response.ok) throw new Error(`API proxy returned ${response.status}`);
    const payload = await response.json();
    if (!payload.ok || !Array.isArray(payload.fixtures) || payload.fixtures.length === 0) throw new Error(payload.message || 'No live fixtures returned');
    return { ...payload, sourceType: 'serverless proxy' };
  }

  async function fetchDirectWorldCupPayload() {
    const base = 'https://worldcup26.ir';
    const [gamesResult, teamsResult, stadiumsResult, groupsResult] = await Promise.allSettled([
      clientFetchJSON(`${base}/get/games`),
      clientFetchJSON(`${base}/get/teams`),
      clientFetchJSON(`${base}/get/stadiums`),
      clientFetchJSON(`${base}/get/groups`),
    ]);

    if (gamesResult.status === 'rejected') throw gamesResult.reason;
    const games = clientAsArray(gamesResult.value, ['games', 'matches', 'fixtures']);
    const teams = teamsResult.status === 'fulfilled' ? clientAsArray(teamsResult.value, ['teams']) : [];
    const stadiums = stadiumsResult.status === 'fulfilled' ? clientAsArray(stadiumsResult.value, ['stadiums']) : [];
    const teamMaps = clientBuildTeamMaps(teams);
    const stadiumMap = clientBuildStadiumMap(stadiums);
    const fixtures = games
      .map((game) => clientNormalizeGame(game, teamMaps, stadiumMap))
      .filter((fixture) => fixture.matchNumber && fixture.homeTeam && fixture.awayTeam)
      .sort((a, b) => a.matchNumber - b.matchNumber);

    if (!fixtures.length) throw new Error('Direct API returned no usable fixtures');
    return {
      ok: true,
      mode: 'worldcup26',
      provider: 'worldcup26.ir free API',
      sourceType: 'direct browser API',
      requiresApiKey: false,
      fixtures,
      standings: groupsResult.status === 'fulfilled' ? clientAsArray(groupsResult.value, ['groups', 'tables', 'standings']) : [],
    };
  }

  async function fetchWorldCupPayload() {
    try {
      return await fetchProxyWorldCupPayload();
    } catch (proxyError) {
      const directPayload = await fetchDirectWorldCupPayload();
      directPayload.proxyError = proxyError?.message || String(proxyError);
      return directPayload;
    }
  }

  async function fetchLiveData(manual = false) {
    const statusEl = UI.qs('#apiStatus');
    if (statusEl) statusEl.textContent = manual ? 'Data mode: refreshing live API…' : 'Data mode: checking live API…';
    try {
      const payload = await fetchWorldCupPayload();
      let merged = 0;
      payload.fixtures.forEach((fixture) => { if (mergeLiveFixture(fixture)) merged += 1; });
      const sourceLabel = payload.sourceType ? ` via ${payload.sourceType}` : '';
      state.apiMode = `${payload.provider || 'Live API'} connected${sourceLabel} (${merged} matches synced)`;
      state.lastLiveSync = new Date();
      if (statusEl) statusEl.textContent = `Data mode: ${state.apiMode}`;
      renderAll();
    } catch (error) {
      state.apiMode = 'fallback schedule';
      const hint = window.location.hostname.includes('github.io')
        ? ' — GitHub Pages cannot run /api routes; direct API also failed'
        : (manual ? ' — API not connected yet' : '');
      if (statusEl) statusEl.textContent = `Data mode: fallback schedule${hint}`;
      console.warn('Live API refresh failed:', error);
    }
  }

  function renderAll() {
    renderClock();
    renderFavouriteSelect();
    renderResultTeamSelect();
    renderHeroDashboard();
    renderFavourite();
    renderToday();
    renderFollowedTeams();
    renderScoreboard();
    renderResults();
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
      renderHeroDashboard();
      renderCountdowns();
      NOTIFY.tick(state.fixtures);
    }, 1000);

    setInterval(() => fetchLiveData(false), 120000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
