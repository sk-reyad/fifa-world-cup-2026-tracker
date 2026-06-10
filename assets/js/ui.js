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

  function teamLabel(team, flag, mode = 'horizontal-left') {
    const safeTeam = escapeHTML(team);
    const safeFlag = escapeHTML(flag || '🏳️');
    if (mode === 'horizontal-right') return `${safeTeam} ${safeFlag}`;
    return `${safeFlag} ${safeTeam}`;
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
    return `<button class="chip-button notify-btn" data-notify-id="${escapeHTML(fixture.id)}" type="button">${active ? '🔔 Alert On' : '🔕 Notify 20 min before'}</button>`;
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
        <p class="time-line">🕒 ${escapeHTML(formatDateTime(fixture))}</p>
        <p class="venue-line">📍 ${escapeHTML(fixtureVenue(fixture))}</p>
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
        <p class="time-line">🕒 ${escapeHTML(formatDateTime(fixture))}</p>
        <p class="venue-line">📍 ${escapeHTML(fixtureVenue(fixture))}</p>
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
        <p class="time-line">🕒 ${escapeHTML(formatDateTime(fixture))}</p>
        <p class="venue-line">📍 ${escapeHTML(fixtureVenue(fixture))}</p>
        ${countdownContainer(fixture)}
      </article>
    `;
  }

  function empty(message) {
    return `<div class="empty-state">${escapeHTML(message)}</div>`;
  }

  window.WC_UI = {
    qs, qsa, escapeHTML, teamLabel, horizontalMatchTitle, verticalMatchTitle,
    fixtureVenue, formatDateTime, statusLabel, scoreLine, metaRow,
    notifyButton, countdownContainer, matchCard, featureCard, timelineItem, empty,
  };
})();
