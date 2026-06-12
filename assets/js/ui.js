(function () {
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

  function escapeHTML(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  const ICONS = {
    bell: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9.8a6 6 0 0 0-12 0c0 7-2.5 7.2-2.5 7.2h17S18 16.8 18 9.8Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9.6 20a2.6 2.6 0 0 0 4.8 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    bellOff: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m3 3 18 18M6.2 6.3A5.9 5.9 0 0 0 6 9.8c0 7-2.5 7.2-2.5 7.2h12.3M18 15.6c-.3-1.2-.5-3-.5-5.8a6 6 0 0 0-7.3-5.85M9.6 20a2.6 2.6 0 0 0 4.8 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    clock: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6v6l4 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
    mapPin: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-5.1 7-11a7 7 0 1 0-14 0c0 5.9 7 11 7 11Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="10" r="2.4" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
    moon: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 15.2A8.3 8.3 0 0 1 8.8 3.5 8.8 8.8 0 1 0 20.5 15.2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    sun: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    menu: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    close: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    calendar: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v4M17 3v4M4.5 9.5h15M6.5 5h11A2.5 2.5 0 0 1 20 7.5v10A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-10A2.5 2.5 0 0 1 6.5 5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    search: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m16.2 16.2 4.1 4.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    trophy: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v3.5A4 4 0 0 1 12 11.5a4 4 0 0 1-4-4V4Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 5H5.5A2.5 2.5 0 0 0 8 9.2M16 5h2.5A2.5 2.5 0 0 1 16 9.2M12 11.5V16M8.5 20h7M10 16h4l.8 4H9.2l.8-4Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    live: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M7 7a7 7 0 0 0 0 10M17 7a7 7 0 0 1 0 10M4 4a11 11 0 0 0 0 16M20 4a11 11 0 0 1 0 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    plus: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    x: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };

  function icon(name) {
    return ICONS[name] || '';
  }

  const FLAG_CDN_BASE = 'https://flagcdn.com';

  function flagSource(flagCodeOrUrl) {
    const value = String(flagCodeOrUrl || '').trim().toLowerCase();
    if (!value) return `${FLAG_CDN_BASE}/un.svg`;
    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('assets/')) return escapeHTML(value);
    const safeCode = value.replace(/[^a-z0-9-]/g, '');
    return `${FLAG_CDN_BASE}/${safeCode || 'un'}.svg`;
  }

  function flagImage(flagCodeOrUrl, team, className = 'flag-icon') {
    return `<img class="${className}" src="${flagSource(flagCodeOrUrl)}" alt="${escapeHTML(team)} flag" loading="lazy" decoding="async" referrerpolicy="no-referrer" />`;
  }

  function teamNameMarkup(team) {
    const value = String(team || '').trim();
    if (value.toLowerCase() === 'bosnia and herzegovina') {
      return '<span class="team-name-text team-name-text--bosnia"><span>Bosnia and </span><span>Herzegovina</span></span>';
    }
    return `<span class="team-name-text">${escapeHTML(team)}</span>`;
  }

  function teamLabel(team, flag, mode = 'horizontal-left') {
    const safeTeam = teamNameMarkup(team);
    const flagEl = flagImage(flag, team);
    if (mode === 'horizontal-right') return `<span class="team-label team-label--right">${safeTeam} ${flagEl}</span>`;
    return `<span class="team-label team-label--left">${flagEl} ${safeTeam}</span>`;
  }

  function fixtureVenue(fixture) {
    if (fixture?.apiVenue) return fixture.apiVenue;
    return [fixture?.stadium, fixture?.city, fixture?.country].filter(Boolean).join(', ');
  }

  function formatDateTime(fixture) {
    return `${fixture.dateLabel} • ${fixture.timeLabel} BST`;
  }

  function scoreAvailable(fixture) {
    return Number.isFinite(fixture?.homeScore) && Number.isFinite(fixture?.awayScore);
  }

  function penaltyAvailable(fixture) {
    return Number.isFinite(fixture?.homePenalty) && Number.isFinite(fixture?.awayPenalty);
  }

  function normalizedStatus(fixture) {
    return String(fixture?.status || 'scheduled').toLowerCase().replace(/[\s-]+/g, '_');
  }

  const LIVE_STATUSES = [
    'live', 'inplay', 'in_play', 'started', 'start', 'running', 'playing', 'in_progress', 'inprogress',
    '1st_half', 'first_half', 'firsthalf', '2nd_half', 'second_half', 'secondhalf',
    'ht', 'halftime', 'half_time', 'half-time', 'et', 'extra_time', 'extra-time', 'penalties', 'penalty', 'pens'
  ];

  const FINISHED_STATUSES = [
    'finished', 'finish', 'ended', 'complete', 'completed', 'closed', 'ft', 'fulltime', 'full_time', 'full-time',
    'aet', 'after_extra_time', 'after-extra-time', 'pen_finished', 'penalties_finished', 'penalties-finished'
  ];

  function elapsedMinutesFromKickoff(fixture) {
    if (!fixture?.kickoff) return null;
    const kickoff = new Date(fixture.kickoff).getTime();
    if (!Number.isFinite(kickoff)) return null;
    const elapsed = Math.floor((Date.now() - kickoff) / 60000);
    return Number.isFinite(elapsed) ? elapsed : null;
  }

  function isTimeDerivedLive(fixture) {
    const status = normalizedStatus(fixture);
    if (FINISHED_STATUSES.includes(status) || LIVE_STATUSES.includes(status)) return false;
    const elapsed = elapsedMinutesFromKickoff(fixture);
    // Keep a scheduled match in live-state for a safe live window after kickoff.
    // This fixes the UI contradiction where a card said Upcoming while countdown already said Started.
    return elapsed !== null && elapsed >= 0 && elapsed <= 145;
  }

  function isTimeDerivedFinished(fixture) {
    const status = normalizedStatus(fixture);
    if (FINISHED_STATUSES.includes(status) || LIVE_STATUSES.includes(status)) return false;
    const elapsed = elapsedMinutesFromKickoff(fixture);
    return elapsed !== null && elapsed > 145;
  }

  function isLiveFixture(fixture) {
    const status = normalizedStatus(fixture);
    return LIVE_STATUSES.includes(status) || isTimeDerivedLive(fixture);
  }

  function isFinishedFixture(fixture) {
    const status = normalizedStatus(fixture);
    return FINISHED_STATUSES.includes(status) || (scoreAvailable(fixture) && isTimeDerivedFinished(fixture));
  }

  function compactMinute(fixture) {
    const raw = String(fixture?.timeElapsed || fixture?.minute || fixture?.elapsed || '').trim();
    if (raw) {
      const low = raw.toLowerCase().replace(/[\s-]+/g, '_');
      if (!['notstarted', 'not_started', 'scheduled', 'upcoming', 'null', 'undefined'].includes(low)) {
        if (/^\d+$/.test(raw)) return `${raw}'`;
        if (/^\d+\+\d+$/.test(raw)) return `${raw}'`;
        if (/^\d{1,3}:\d{2}$/.test(raw)) return raw;
        if (low.includes('half') || low === 'ht') return 'Half-Time';
        if (low.includes('full') || low === 'ft') return 'Full-time';
        if (low.includes('extra')) return 'ET';
        if (low.includes('pen')) return 'PENS';
        if (!['live', 'inplay', 'in_play', 'in_progress', 'inprogress', 'started', 'running', 'playing'].includes(low)) return raw.toUpperCase();
      }
    }

    // Some providers return live score/status but keep time_elapsed as "notstarted".
    // In that case, derive a safe minute from kickoff so the UI does not show only "LIVE".
    const elapsed = elapsedMinutesFromKickoff(fixture);
    if (elapsed !== null && elapsed >= 0 && elapsed <= 145) {
      if (elapsed > 90) return `90+${elapsed - 90}'`;
      return `${Math.max(1, elapsed)}'`;
    }
    return '';
  }

  function statusLabel(fixture) {
    const status = normalizedStatus(fixture);
    const minute = compactMinute(fixture);
    if (isLiveFixture(fixture)) {
      if (['ht', 'halftime', 'half_time'].includes(status)) return { text: 'Half-Time', detail: 'Half-Time', className: 'status-live', kind: 'live' };
      if (['et', 'extra_time'].includes(status)) return { text: minute || 'ET', detail: 'Extra time', className: 'status-live', kind: 'live' };
      if (['penalties', 'penalty'].includes(status)) return { text: 'PENS', detail: 'Penalty shootout', className: 'status-live', kind: 'live' };
      return { text: minute ? `${minute} LIVE` : 'LIVE', detail: 'Live now', className: 'status-live', kind: 'live' };
    }
    if (isFinishedFixture(fixture)) {
      if (['aet', 'after_extra_time'].includes(status)) return { text: 'AET', detail: 'After extra time', className: 'status-finished', kind: 'finished' };
      if (['pen_finished', 'penalties_finished'].includes(status)) return { text: 'Full-time', detail: 'Decided on penalties', className: 'status-finished', kind: 'finished' };
      return { text: 'Full-time', detail: 'Full-time', className: 'status-finished', kind: 'finished' };
    }
    return { text: 'Upcoming', detail: 'Scheduled', className: 'status-upcoming', kind: 'upcoming' };
  }

  function scoreText(fixture) {
    return scoreAvailable(fixture) ? `${escapeHTML(fixture.homeScore)} - ${escapeHTML(fixture.awayScore)}` : '';
  }

  function penaltyLine(fixture) {
    if (!penaltyAvailable(fixture)) return '';
    return `<small class="penalty-line">Pens: ${escapeHTML(fixture.homePenalty)} - ${escapeHTML(fixture.awayPenalty)}</small>`;
  }

  function matchCenter(fixture) {
    const status = statusLabel(fixture);
    const score = scoreText(fixture);
    if (status.kind === 'live' || status.kind === 'finished') {
      return `
        <span class="score-stack ${status.kind === 'live' ? 'score-stack--live' : 'score-stack--final'}">
          <strong>${score || (status.kind === 'live' ? escapeHTML(status.text.replace(/\s*LIVE$/i, '') || 'LIVE') : 'Full-time')}</strong>
          <small>${score ? escapeHTML(status.text) : 'Score pending'}</small>
          ${penaltyLine(fixture)}
        </span>
      `;
    }
    return '<span class="vs-badge">VS</span>';
  }

  function horizontalMatchTitle(fixture, variant = '') {
    return `
      <div class="match-title-horizontal ${variant}">
        <span class="team-side team-side--home">${teamLabel(fixture.homeTeam, fixture.homeFlag, 'horizontal-left')}</span>
        <span class="match-center">${matchCenter(fixture)}</span>
        <span class="team-side team-side--away">${teamLabel(fixture.awayTeam, fixture.awayFlag, 'horizontal-right')}</span>
      </div>
    `;
  }

  function verticalMatchTitle(fixture) {
    return horizontalMatchTitle(fixture, 'match-title-feature');
  }

  function metaRow(fixture, isFavourite = false) {
    const status = statusLabel(fixture);
    return `
      <div class="meta-row">
        <span class="status-pill ${status.className}">${escapeHTML(status.text)}</span>
        <span>Match ${escapeHTML(fixture.matchNumber)}</span>
        <span>${escapeHTML(fixture.stage)}</span>
        ${fixture.group ? `<span>Group ${escapeHTML(fixture.group)}</span>` : ''}
        ${isFavourite ? '<span>Favourite</span>' : ''}
      </div>
    `;
  }

  function notifyButton(fixture) {
    if (!window.WC_NOTIFICATIONS || isLiveFixture(fixture) || isFinishedFixture(fixture)) return '';
    const active = window.WC_NOTIFICATIONS.isEnabled(fixture.id);
    return `<button class="chip-button notify-btn" data-notify-id="${escapeHTML(fixture.id)}" type="button">${active ? `${icon('bell')} <span>Alert On</span>` : `${icon('bellOff')} <span>Notify 20 min before</span>`}</button>`;
  }

  function countdownContainer(fixture, className = 'mini-countdown') {
    if (isLiveFixture(fixture) || isFinishedFixture(fixture)) return '';
    return `<div class="${className}" data-countdown="${escapeHTML(fixture.id)}"></div>`;
  }

  function detailLine(fixture) {
    const status = statusLabel(fixture);
    const venue = fixtureVenue(fixture);
    if (status.kind === 'live' && !scoreAvailable(fixture)) {
      const minute = compactMinute(fixture);
      return `<p class="state-line state-line--live">${icon('live')} <span>${minute ? `Live window: ${escapeHTML(minute)}. ` : ''}Waiting for official score data from the API.</span></p>`;
    }
    if (status.kind === 'finished' && !scoreAvailable(fixture)) {
      return '<p class="state-line">Final result will appear when score data is available.</p>';
    }
    return `<p class="venue-line">${icon('mapPin')} <span>${escapeHTML(venue)}</span></p>`;
  }

  function matchCard(fixture, options = {}) {
    const favClass = options.isFavourite ? ' favourite' : '';
    const status = statusLabel(fixture);
    return `
      <article class="match-card${favClass} match-card--${status.kind}" data-match-id="${escapeHTML(fixture.id)}">
        ${horizontalMatchTitle(fixture)}
        ${metaRow(fixture, options.isFavourite)}
        <p class="time-line">${icon('clock')} <span>${escapeHTML(formatDateTime(fixture))}</span></p>
        ${detailLine(fixture)}
        ${countdownContainer(fixture)}
        ${notifyButton(fixture)}
      </article>
    `;
  }

  function featureCard(fixture, favouriteTeam) {
    if (!fixture) return `<div class="empty-state">No match found for ${escapeHTML(favouriteTeam)} yet.</div>`;
    return `
      <div class="feature-main-copy">
        <p class="eyebrow">Priority team focus</p>
        <h3>${escapeHTML(favouriteTeam)} Match Focus</h3>
        <p>${escapeHTML(statusLabel(fixture).detail)} • ${escapeHTML(formatDateTime(fixture))}</p>
      </div>
      <div class="feature-match-body">
        ${horizontalMatchTitle(fixture, 'match-title-feature')}
        ${metaRow(fixture, true)}
        <p class="venue-line">${icon('mapPin')} <span>${escapeHTML(fixtureVenue(fixture))}</span></p>
        ${countdownContainer(fixture, 'countdown-grid')}
        ${notifyButton(fixture)}
      </div>
    `;
  }

  function timelineItem(fixture) {
    return matchCard(fixture);
  }

  function heroPanel(fixture, type, options = {}) {
    const label = options.label || 'Match Focus';
    const isLive = fixture && statusLabel(fixture).kind === 'live';
    if (!fixture) {
      return `
        <div class="hero-panel-inner hero-panel-empty">
          <p class="eyebrow">${escapeHTML(label)}</p>
          <h2>${escapeHTML(options.emptyTitle || 'No match data yet')}</h2>
          <p>${escapeHTML(options.emptyText || 'This panel will update automatically when match data is available.')}</p>
        </div>
      `;
    }
    return `
      <div class="hero-panel-inner ${isLive ? 'is-live-panel' : ''}">
        <div class="hero-panel-topline">
          <span class="panel-kicker ${isLive ? 'panel-kicker--live' : ''}">${isLive ? `${icon('live')} <span>LIVE MATCH</span>` : escapeHTML(label)}</span>
          <span class="panel-stage">${escapeHTML(fixture.stage)}${fixture.group ? ` • Group ${escapeHTML(fixture.group)}` : ''}</span>
        </div>
        ${horizontalMatchTitle(fixture, 'hero-match-title')}
        <div class="hero-panel-meta">
          <span>${icon('calendar')} ${escapeHTML(formatDateTime(fixture))}</span>
          <span>${icon('mapPin')} ${escapeHTML(fixtureVenue(fixture))}</span>
        </div>
        ${countdownContainer(fixture, type === 'primary' ? 'countdown-grid hero-countdown' : 'mini-countdown hero-mini-countdown')}
      </div>
    `;
  }

  function empty(message) {
    return `<div class="empty-state">${escapeHTML(message)}</div>`;
  }

  window.WC_UI = {
    qs, qsa, escapeHTML, icon, flagSource, flagImage, teamLabel, horizontalMatchTitle, verticalMatchTitle,
    fixtureVenue, formatDateTime, statusLabel, scoreAvailable, penaltyAvailable, isLiveFixture, isFinishedFixture,
    matchCenter, penaltyLine, metaRow, notifyButton, countdownContainer, matchCard, featureCard, timelineItem, heroPanel, empty,
  };
})();
