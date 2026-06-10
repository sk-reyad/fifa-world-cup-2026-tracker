(function () {
  const MS = { second: 1000, minute: 60000, hour: 3600000, day: 86400000 };

  function getParts(targetDate, nowDate = new Date()) {
    const target = targetDate instanceof Date ? targetDate : new Date(targetDate);
    let diff = target.getTime() - nowDate.getTime();
    const isPast = diff <= 0;
    diff = Math.max(0, diff);
    const days = Math.floor(diff / MS.day);
    diff -= days * MS.day;
    const hours = Math.floor(diff / MS.hour);
    diff -= hours * MS.hour;
    const minutes = Math.floor(diff / MS.minute);
    diff -= minutes * MS.minute;
    const seconds = Math.floor(diff / MS.second);
    return { days, hours, minutes, seconds, isPast };
  }

  function two(value) {
    return String(value).padStart(2, '0');
  }

  function renderGrid(target, container, compact = false) {
    if (!container) return;
    const parts = getParts(target);
    if (parts.isPast) {
      container.innerHTML = compact
        ? '<span><strong>Started</strong><small>Status</small></span>'
        : '<span><strong>00</strong><small>Days</small></span><span><strong>00</strong><small>Hours</small></span><span><strong>00</strong><small>Minutes</small></span><span><strong>00</strong><small>Seconds</small></span>';
      return;
    }
    container.innerHTML = `
      <span><strong>${two(parts.days)}</strong><small>Days</small></span>
      <span><strong>${two(parts.hours)}</strong><small>Hours</small></span>
      <span><strong>${two(parts.minutes)}</strong><small>Minutes</small></span>
      <span><strong>${two(parts.seconds)}</strong><small>Seconds</small></span>
    `;
  }

  function human(target, now = new Date()) {
    const p = getParts(target, now);
    if (p.isPast) return 'Started';
    if (p.days > 0) return `${p.days}d ${p.hours}h ${p.minutes}m`;
    if (p.hours > 0) return `${p.hours}h ${p.minutes}m ${p.seconds}s`;
    return `${p.minutes}m ${p.seconds}s`;
  }

  window.WC_COUNTDOWN = { getParts, renderGrid, human };
})();
