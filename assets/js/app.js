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
    scheduleTeam: 'all',
    scheduleDate: 'all',
    resultTeam: 'all',
    resultDate: 'all',
    collapsedDays: new Set(),
    scheduleViewMode: 'default',
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

  function uniqueSortedDates(fixtures = state.fixtures) {
    return [...new Set(fixtures.map((fixture) => fixture.dateLabel).filter(Boolean))]
      .sort((a, b) => new Date(fixtures.find((fixture) => fixture.dateLabel === a)?.kickoff || 0) - new Date(fixtures.find((fixture) => fixture.dateLabel === b)?.kickoff || 0));
  }


  function bstDateStamp(date) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(date);
  }

  function groupedScheduleDates(fixtures) {
    const map = new Map();
    fixtures.forEach((fixture) => {
      const key = dateGroupKey(fixture);
      if (!key || map.has(key)) return;
      map.set(key, fixture);
    });
    return [...map.entries()].sort((a, b) => fixtureDate(a[1]) - fixtureDate(b[1]));
  }

  function defaultExpandedScheduleDates(fixtures) {
    const grouped = groupedScheduleDates(fixtures);
    if (!grouped.length) return new Set();

    const todayStamp = bstDateStamp(now());
    const tomorrowStamp = bstDateStamp(new Date(Date.now() + 24 * 60 * 60 * 1000));
    const exactDates = new Set([todayStamp, tomorrowStamp]);
    const exactMatches = grouped
      .filter(([, fixture]) => exactDates.has(bstDateStamp(fixtureDate(fixture))))
      .map(([key]) => key);

    if (exactMatches.length) return new Set(exactMatches);

    const upcomingMatches = grouped
      .filter(([, fixture]) => fixtureDate(fixture).getTime() >= Date.now())
      .slice(0, 2)
      .map(([key]) => key);

    return new Set(upcomingMatches.length ? upcomingMatches : grouped.slice(0, 2).map(([key]) => key));
  }

  function applyDefaultScheduleCollapse(fixtures) {
    const keys = groupedScheduleDates(fixtures).map(([key]) => key);
    const defaultExpanded = defaultExpandedScheduleDates(fixtures);
    state.collapsedDays = new Set(keys.filter((key) => !defaultExpanded.has(key)));
  }

  function applyScheduleExpansionMode(fixtures) {
    const keys = groupedScheduleDates(fixtures).map(([key]) => key);
    if (state.scheduleViewMode === 'expanded') {
      state.collapsedDays.clear();
      return;
    }
    if (state.scheduleViewMode === 'default') {
      applyDefaultScheduleCollapse(fixtures);
      return;
    }
    state.collapsedDays = new Set([...state.collapsedDays].filter((key) => keys.includes(key)));
  }

  function updateScheduleToggleButton(fixtures) {
    const btn = UI.qs('#scheduleToggleBtn') || UI.qs('#expandAllBtn');
    if (!btn) return;
    const keys = groupedScheduleDates(fixtures).map(([key]) => key);
    const allExpanded = keys.length > 0 && keys.every((key) => !state.collapsedDays.has(key));
    btn.textContent = allExpanded ? 'Collapse days' : 'Expand all days';
    btn.setAttribute('aria-pressed', String(allExpanded));
    btn.setAttribute('aria-label', allExpanded ? 'Collapse schedule days to today and next day' : 'Expand all schedule days');
  }

  function applyMatchGridMeta(root = document) {
    UI.qsa('#todayMatches, #liveScoreboard, #majorTeams, #resultsGrid, #favouriteTimeline, .day-content', root).forEach((grid) => {
      const count = UI.qsa(':scope > .match-card', grid).length;
      grid.classList.toggle('match-card-grid', count > 0);
      if (count > 0) {
        grid.dataset.cardCount = String(count);
        grid.dataset.tail = String(count % 3);
      } else {
        delete grid.dataset.cardCount;
        delete grid.dataset.tail;
      }
    });
  }

  function resultDates() {
    return uniqueSortedDates(state.fixtures.filter((fixture) => UI.isFinishedFixture(fixture) && UI.scoreAvailable(fixture)));
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

  function renderResultDateSelect() {
    const select = UI.qs('#resultDateFilter');
    if (!select) return;
    const dates = resultDates();
    select.innerHTML = '<option value="all">All dates</option>' + dates.map((date) => `<option value="${UI.escapeHTML(date)}">${UI.escapeHTML(date)}</option>`).join('');
    select.value = dates.includes(state.resultDate) ? state.resultDate : 'all';
    if (select.value !== state.resultDate) state.resultDate = 'all';
  }

  function renderScheduleFilterSelects() {
    const teamSelect = UI.qs('#scheduleTeamFilter');
    const dateSelect = UI.qs('#scheduleDateFilter');
    const teams = allTeams();
    if (teamSelect) {
      teamSelect.innerHTML = '<option value="all">All teams</option>' + teams.map((team) => `<option value="${UI.escapeHTML(team)}">${UI.escapeHTML(team)}</option>`).join('');
      teamSelect.value = teams.includes(state.scheduleTeam) ? state.scheduleTeam : 'all';
      if (teamSelect.value !== state.scheduleTeam) state.scheduleTeam = 'all';
    }
    if (dateSelect) {
      const dates = uniqueSortedDates();
      dateSelect.innerHTML = '<option value="all">All dates</option>' + dates.map((date) => `<option value="${UI.escapeHTML(date)}">${UI.escapeHTML(date)}</option>`).join('');
      dateSelect.value = dates.includes(state.scheduleDate) ? state.scheduleDate : 'all';
      if (dateSelect.value !== state.scheduleDate) state.scheduleDate = 'all';
    }
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
    UI.qs('#favouriteTimeline').innerHTML = list.length
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
    if (state.resultDate !== 'all') results = results.filter((fixture) => fixture.dateLabel === state.resultDate);
    el.innerHTML = results.length
      ? results.slice(0, 18).map((fixture) => UI.matchCard(fixture, { isFavourite: hasTeam(fixture, state.favouriteTeam) })).join('')
      : UI.empty('No finished match result is available for this filter yet. Final scores will appear here after matches finish.');
  }

  function filterFixtures() {
    const term = state.search.trim().toLowerCase();
    let list = [...state.fixtures];
    if (state.filter === 'today') list = list.filter(isTodayBST);
    if (state.filter === 'favourite') list = list.filter((fixture) => hasTeam(fixture, state.favouriteTeam));
    if (state.filter === 'major') list = list.filter(hasFollowedTeam);
    if (state.filter === 'group') list = list.filter((fixture) => fixture.stage === 'Group Stage');
    if (state.filter === 'knockout') list = list.filter((fixture) => fixture.stage !== 'Group Stage');
    if (state.scheduleTeam !== 'all') list = list.filter((fixture) => hasTeam(fixture, state.scheduleTeam));
    if (state.scheduleDate !== 'all') list = list.filter((fixture) => fixture.dateLabel === state.scheduleDate);
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
    applyScheduleExpansionMode(filtered);
    if (!filtered.length) {
      el.innerHTML = UI.empty('No matches found for this filter/search.');
      updateScheduleToggleButton(filtered);
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
          <div class="day-content match-card-grid">
            ${fixtures.map((fixture) => UI.matchCard(fixture, { isFavourite: hasTeam(fixture, state.favouriteTeam) })).join('')}
          </div>
        </section>
      `;
    }).join('');
    updateScheduleToggleButton(filtered);
  }

  function groupsFromAvailableData() {
    if (state.groups && Object.keys(state.groups).length) return state.groups;
    const derived = {};
    state.fixtures.forEach((fixture) => {
      if (!fixture.group || fixture.stage !== 'Group Stage') return;
      if (!derived[fixture.group]) derived[fixture.group] = [];
      [fixture.homeTeam, fixture.awayTeam].forEach((team) => {
        const name = String(team || '').trim();
        if (!name || /winner|runner|third|tbc|placeholder/i.test(name)) return;
        if (!derived[fixture.group].includes(name)) derived[fixture.group].push(name);
      });
    });
    return derived;
  }

  function blankStandingRows(groupMap) {
    return Object.fromEntries(Object.entries(groupMap).map(([group, teams]) => [group, teams.map((team) => ({
      team,
      flag: state.flags[team] || 'un',
      played: 0,
      win: 0,
      draw: 0,
      loss: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0,
    }))]));
  }

  function renderStandings() {
    const el = UI.qs('#standingsGrid');
    if (!el) return;
    const groupMap = groupsFromAvailableData();
    const calculated = STANDINGS.calculate(groupMap, state.flags, state.fixtures);
    const standings = Object.keys(calculated).length ? calculated : blankStandingRows(groupMap);
    const entries = Object.entries(standings);

    if (!entries.length) {
      el.innerHTML = '<article class="standings-card standings-placeholder"><h3><span>Group Standings</span><span class="badge">Structure ready</span></h3><div class="empty-state">Group tables will appear here as soon as team or fixture data is available.</div></article>';
      return;
    }

    el.innerHTML = entries.map(([group, rows]) => `
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
                  <td class="team-name-cell"><span class="standings-team-wrap">${UI.teamLabel(row.team, row.flag || state.flags[row.team] || 'un')}${index < 2 ? '<span class="qualification-badge">Q Zone</span>' : ''}</span></td>
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

  function stageOrderName(stage) {
    const normalized = String(stage || '').toLowerCase();
    if (normalized.includes('round of 32')) return 'Round of 32';
    if (normalized.includes('round of 16')) return 'Round of 16';
    if (normalized.includes('quarter')) return 'Quarterfinals';
    if (normalized.includes('semi')) return 'Semifinals';
    if (normalized.includes('third')) return 'Third Place';
    if (normalized.includes('final')) return 'Final';
    return stage || 'Knockout';
  }

  function winningTeam(fixture) {
    if (!UI.scoreAvailable(fixture)) return '';
    if (fixture.homeScore > fixture.awayScore) return fixture.homeTeam;
    if (fixture.awayScore > fixture.homeScore) return fixture.awayTeam;
    if (UI.penaltyAvailable(fixture)) {
      if (fixture.homePenalty > fixture.awayPenalty) return fixture.homeTeam;
      if (fixture.awayPenalty > fixture.homePenalty) return fixture.awayTeam;
    }
    return '';
  }

  function bracketTeamLine(fixture, side) {
    const team = side === 'home' ? fixture.homeTeam : fixture.awayTeam;
    const flag = side === 'home' ? fixture.homeFlag : fixture.awayFlag;
    const score = side === 'home' ? fixture.homeScore : fixture.awayScore;
    const winner = winningTeam(fixture);
    const isWinner = winner && winner === team;
    const isLoser = winner && winner !== team;
    return `<div class="bracket-team ${isWinner ? 'is-winner' : ''} ${isLoser ? 'is-loser' : ''}">
      <span>${UI.teamLabel(team, flag || state.flags[team] || 'un')}</span>
      ${UI.scoreAvailable(fixture) ? `<strong>${UI.escapeHTML(score)}</strong>` : '<em>—</em>'}
    </div>`;
  }

  function bracketPlaceholder(stage, index) {
    const stagePrefix = {
      'Round of 32': 'R32',
      'Round of 16': 'R16',
      Quarterfinals: 'QF',
      Semifinals: 'SF',
      Final: 'Final',
      'Third Place': '3rd',
    }[stage] || 'Match';
    return `
      <article class="bracket-match bracket-match--placeholder">
        <div class="bracket-match-top"><span>${UI.escapeHTML(stagePrefix)} ${index + 1}</span><span>Date TBC</span></div>
        <div class="bracket-team"><span class="team-label team-label--left"><span class="flag-placeholder"></span><span class="team-name-text">Team TBC</span></span><em>—</em></div>
        <div class="bracket-team"><span class="team-label team-label--left"><span class="flag-placeholder"></span><span class="team-name-text">Team TBC</span></span><em>—</em></div>
        <p>Venue TBC</p>
      </article>`;
  }

  function renderBracket() {
    const el = UI.qs('#bracketBoard');
    if (!el) return;
    const stages = ['Round of 32', 'Round of 16', 'Quarterfinals', 'Semifinals', 'Final', 'Third Place'];
    const expectedSlots = {
      'Round of 32': 16,
      'Round of 16': 8,
      Quarterfinals: 4,
      Semifinals: 2,
      Final: 1,
      'Third Place': 1,
    };
    const knockouts = state.fixtures
      .filter((fixture) => fixture.stage && fixture.stage !== 'Group Stage')
      .sort((a, b) => fixtureDate(a) - fixtureDate(b));
    const grouped = stages.reduce((acc, stage) => ({ ...acc, [stage]: [] }), {});
    knockouts.forEach((fixture) => {
      const stage = stageOrderName(fixture.stage);
      if (!grouped[stage]) grouped[stage] = [];
      grouped[stage].push(fixture);
    });

    el.innerHTML = stages.map((stage) => {
      const fixtures = grouped[stage] || [];
      const slots = Math.max(fixtures.length, expectedSlots[stage] || 1);
      return `<section class="bracket-round bracket-round--${UI.escapeHTML(stage.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}">
        <h3>${UI.escapeHTML(stage)}</h3>
        <div class="bracket-round-list">
          ${Array.from({ length: slots }, (_, index) => {
            const fixture = fixtures[index];
            if (!fixture) return bracketPlaceholder(stage, index);
            return `
              <article class="bracket-match match-card--${UI.statusLabel(fixture).kind}">
                <div class="bracket-match-top"><span>Match ${UI.escapeHTML(fixture.matchNumber || index + 1)}</span><span>${UI.escapeHTML(UI.formatDateTime(fixture))}</span></div>
                ${bracketTeamLine(fixture, 'home')}
                ${bracketTeamLine(fixture, 'away')}
                ${UI.penaltyLine(fixture)}
                <p>${UI.escapeHTML(fixture.stadium || UI.fixtureVenue(fixture) || 'Venue TBC')}</p>
              </article>`;
          }).join('')}
        </div>
      </section>`;
    }).join('');
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
    applyMatchGridMeta();
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
        state.scheduleViewMode = 'custom';
        if (state.collapsedDays.has(day)) state.collapsedDays.delete(day);
        else state.collapsedDays.add(day);
        renderSchedule();
        renderCountdowns();
      }
    });
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.location.hash) {
      history.replaceState(null, document.title, window.location.pathname + window.location.search);
    }
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

    UI.qsa('.back-to-top, .brand').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        scrollToTop();
      });
    });

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

    UI.qs('#resultDateFilter').addEventListener('change', (event) => {
      state.resultDate = event.target.value;
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

    UI.qs('#scheduleDateFilter').addEventListener('change', (event) => {
      state.scheduleDate = event.target.value;
      renderSchedule();
      renderCountdowns();
    });

    UI.qs('#scheduleTeamFilter').addEventListener('change', (event) => {
      state.scheduleTeam = event.target.value;
      renderSchedule();
      renderCountdowns();
    });

    UI.qs('#clearScheduleFiltersBtn').addEventListener('click', () => {
      state.search = '';
      state.filter = 'all';
      state.scheduleTeam = 'all';
      state.scheduleDate = 'all';
      UI.qs('#scheduleSearch').value = '';
      renderScheduleFilterSelects();
      UI.qs('#stageFilter').value = 'all';
      renderSchedule();
      renderCountdowns();
    });

    const scheduleToggleBtn = UI.qs('#scheduleToggleBtn') || UI.qs('#expandAllBtn');
    if (scheduleToggleBtn) {
      scheduleToggleBtn.addEventListener('click', () => {
        const filtered = filterFixtures();
        const keys = groupedScheduleDates(filtered).map(([key]) => key);
        const allExpanded = keys.length > 0 && keys.every((key) => !state.collapsedDays.has(key));
        state.scheduleViewMode = allExpanded ? 'default' : 'expanded';
        if (allExpanded) applyDefaultScheduleCollapse(filtered);
        else state.collapsedDays.clear();
        updateScheduleToggleButton(filtered);
        renderSchedule();
        renderCountdowns();
      });
    }

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

  function toScore(value) {
    if (value === null || value === undefined || value === '') return NaN;
    const number = Number(value);
    return Number.isFinite(number) ? number : NaN;
  }

  function pickScore(source, keys) {
    for (const key of keys) {
      if (source && Object.prototype.hasOwnProperty.call(source, key)) {
        const value = toScore(source[key]);
        if (Number.isFinite(value)) return value;
      }
    }
    return NaN;
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

    const homeScore = pickScore(live, ['homeScore', 'home_score', 'homeGoals', 'home_goals', 'homeTeamScore', 'home_team_score', 'team1Score', 'team_1_score']);
    const awayScore = pickScore(live, ['awayScore', 'away_score', 'awayGoals', 'away_goals', 'awayTeamScore', 'away_team_score', 'team2Score', 'team_2_score']);
    if (Number.isFinite(homeScore) && Number.isFinite(awayScore)) {
      target.homeScore = sameDirection ? homeScore : awayScore;
      target.awayScore = sameDirection ? awayScore : homeScore;
    }

    const homePenalty = pickScore(live, ['homePenalty', 'home_penalty', 'homePenalties', 'home_penalties', 'homePenaltyScore', 'home_penalty_score']);
    const awayPenalty = pickScore(live, ['awayPenalty', 'away_penalty', 'awayPenalties', 'away_penalties', 'awayPenaltyScore', 'away_penalty_score']);
    if (Number.isFinite(homePenalty) && Number.isFinite(awayPenalty)) {
      target.homePenalty = sameDirection ? homePenalty : awayPenalty;
      target.awayPenalty = sameDirection ? awayPenalty : homePenalty;
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

  async function fetchLiveData(manual = false) {
    const statusEl = UI.qs('#apiStatus');
    if (statusEl) statusEl.textContent = manual ? 'Data mode: refreshing live API…' : 'Data mode: checking live API…';
    try {
      const response = await fetch('/api/worldcup', { cache: 'no-store' });
      if (!response.ok) throw new Error(`API proxy returned ${response.status}`);
      const payload = await response.json();
      if (!payload.ok || !Array.isArray(payload.fixtures) || payload.fixtures.length === 0) throw new Error(payload.message || 'No live fixtures returned');
      let merged = 0;
      payload.fixtures.forEach((fixture) => { if (mergeLiveFixture(fixture)) merged += 1; });
      state.apiMode = `${payload.provider || 'Live API'} connected (${merged} matches synced)`;
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
    renderResultTeamSelect();
    renderResultDateSelect();
    renderScheduleFilterSelects();
    renderHeroDashboard();
    renderFavourite();
    renderToday();
    renderFollowedTeams();
    renderScoreboard();
    renderResults();
    renderSchedule();
    renderBracket();
    renderStandings();
    applyMatchGridMeta();
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

    // Re-render card sections shortly after kickoff, even if the API still reports "scheduled".
    setInterval(() => {
      renderFavourite();
      renderToday();
      renderFollowedTeams();
      renderScoreboard();
      renderResults();
      renderSchedule();
      renderCountdowns();
    }, 30000);

    setInterval(() => fetchLiveData(false), 120000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
