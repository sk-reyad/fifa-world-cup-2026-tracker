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
    close: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
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

  function flagImage(flagCodeOrUrl, team) {
    return `<img class="flag-icon" src="${flagSource(flagCodeOrUrl)}" alt="${escapeHTML(team)} flag" loading="lazy" decoding="async" referrerpolicy="no-referrer" />`;
  }

  function teamLabel(team, flag, mode = 'horizontal-left') {
    const safeTeam = `<span class="team-name-text">${escapeHTML(team)}</span>`;
    const icon = flagImage(flag, team);
    if (mode === 'horizontal-right') {
      return `<span class="team-label team-label--right">${safeTeam} ${icon}</span>`;
    }
    return `<span class="team-label team-label--left">${icon} ${safeTeam}</span>`;
  }
  function horizontalMatchTitle(fixture) {
    return `
      <div class="match-title-horizontal">
        <span>${teamLabel(fixture.homeTeam, fixture.homeFlag, 'horizontal-left')}</span>
        <span>vs</span>
        <span>${teamLabel(fixture.awayTeam, fixture.awayFlag, 'horizontal-right')}</span>
      </div>
    `;
  }

  function verticalMatchTitle(fixture) {
    return `
      <div class="match-title-vertical">
        <strong>${teamLabel(fixture.homeTeam, fixture.homeFlag)}</strong>
        <span class="vs-badge">VS</span>
        <strong>${teamLabel(fixture.awayTeam, fixture.awayFlag)}</strong>
      </div>
    `;
  }

  function fixtureVenue(fixture) {
    if (fixture.apiVenue) return fixture.apiVenue;
    return [fixture.stadium, fixture.city, fixture.country].filter(Boolean).join(', ');
  }

  function formatDateTime(fixture) {
    return `${fixture.dateLabel} • ${fixture.timeLabel} BST`;
  }

  function statusLabel(fixture) {
    const status = String(fixture.status || 'scheduled').toLowerCase();
    if (['live', 'inplay', '1st_half', '2nd_half', 'ht'].includes(status)) return { text: 'LIVE', className: 'status-live' };
    if (['finished', 'ft', 'aet', 'pen_finished'].includes(status)) return { text: 'Finished', className: 'status-finished' };
    return { text: 'Upcoming', className: 'status-upcoming' };
  }

  function scoreLine(fixture) {
    if (Number.isFinite(fixture.homeScore) && Number.isFinite(fixture.awayScore)) {
      return `<div class="score-line">${escapeHTML(fixture.homeScore)} - ${escapeHTML(fixture.awayScore)}</div>`;
    }
    return '';
  }

  function metaRow(fixture, isFavourite = false, isMajor = false) {
    const status = statusLabel(fixture);
    return `
      <div class="meta-row">
        <span class="status-pill ${status.className}">${status.text}</span>
        <span>Match ${fixture.matchNumber}</span>
        <span>${escapeHTML(fixture.stage)}</span>
        ${fixture.group ? `<span>Group ${escapeHTML(fixture.group)}</span>` : ''}
        ${isFavourite ? '<span>Favourite</span>' : ''}
        ${isMajor ? '<span>Major team</span>' : ''}
      </div>
    `;
  }

  function notifyButton(fixture) {
    if (!window.WC_NOTIFICATIONS) return '';
    const active = window.WC_NOTIFICATIONS.isEnabled(fixture.id);
    return `<button class="chip-button notify-btn" data-notify-id="${escapeHTML(fixture.id)}" type="button">${active ? `${icon('bell')} <span>Alert On</span>` : `${icon('bellOff')} <span>Notify 20 min before</span>`}</button>`;
  }

  function countdownContainer(fixture, className = 'mini-countdown') {
    return `<div class="${className}" data-countdown="${escapeHTML(fixture.id)}"></div>`;
  }

  function matchCard(fixture, options = {}) {
    const favClass = options.isFavourite ? ' favourite' : '';
    const majorClass = options.isMajor ? ' major' : '';
    const title = options.vertical ? verticalMatchTitle(fixture) : horizontalMatchTitle(fixture);
    return `
      <article class="match-card${favClass}${majorClass}" data-match-id="${escapeHTML(fixture.id)}">
        ${title}
        ${metaRow(fixture, options.isFavourite, options.isMajor)}
        ${scoreLine(fixture)}
        <p class="time-line">${icon('clock')} <span>${escapeHTML(formatDateTime(fixture))}</span></p>
        <p class="venue-line">${icon('mapPin')} <span>${escapeHTML(fixtureVenue(fixture))}</span></p>
        ${countdownContainer(fixture)}
        ${notifyButton(fixture)}
      </article>
    `;
  }

  function featureCard(fixture, favouriteTeam) {
    if (!fixture) {
      return `<div class="empty-state">No upcoming match found for ${escapeHTML(favouriteTeam)}.</div>`;
    }
    return `
      <div>
        <p class="eyebrow">Next ${escapeHTML(favouriteTeam)} Match</p>
        ${verticalMatchTitle(fixture)}
      </div>
      <div>
        ${metaRow(fixture, true, false)}
        ${scoreLine(fixture)}
        <p class="time-line">${icon('clock')} <span>${escapeHTML(formatDateTime(fixture))}</span></p>
        <p class="venue-line">${icon('mapPin')} <span>${escapeHTML(fixtureVenue(fixture))}</span></p>
        ${countdownContainer(fixture, 'countdown-grid')}
        ${notifyButton(fixture)}
      </div>
    `;
  }

  function timelineItem(fixture) {
    return `
      <article class="timeline-item" data-match-id="${escapeHTML(fixture.id)}">
        ${horizontalMatchTitle(fixture)}
        ${metaRow(fixture)}
        ${scoreLine(fixture)}
        <p class="time-line">${icon('clock')} <span>${escapeHTML(formatDateTime(fixture))}</span></p>
        <p class="venue-line">${icon('mapPin')} <span>${escapeHTML(fixtureVenue(fixture))}</span></p>
        ${countdownContainer(fixture)}
      </article>
    `;
  }

  function empty(message) {
    return `<div class="empty-state">${escapeHTML(message)}</div>`;
  }

  window.WC_UI = {
    qs, qsa, escapeHTML, icon, flagSource, flagImage, teamLabel, horizontalMatchTitle, verticalMatchTitle,
    fixtureVenue, formatDateTime, statusLabel, scoreLine, metaRow,
    notifyButton, countdownContainer, matchCard, featureCard, timelineItem, empty,
  };
})();
