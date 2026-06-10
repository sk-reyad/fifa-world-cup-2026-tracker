(function () {
  const STORAGE_KEY = 'wc2026-notify-match-ids';
  const fired = new Set();

  function supported() {
    return 'Notification' in window;
  }

  async function requestPermission() {
    if (!supported()) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    return Notification.requestPermission();
  }

  function getSaved() {
    try {
      return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
    } catch {
      return new Set();
    }
  }

  function save(set) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  }

  function toggle(matchId) {
    const saved = getSaved();
    if (saved.has(matchId)) saved.delete(matchId);
    else saved.add(matchId);
    save(saved);
    return saved.has(matchId);
  }

  function isEnabled(matchId) {
    return getSaved().has(matchId);
  }

  function tick(fixtures) {
    if (!supported() || Notification.permission !== 'granted') return;
    const saved = getSaved();
    const now = Date.now();
    fixtures.forEach((fixture) => {
      if (!saved.has(fixture.id) || fired.has(fixture.id)) return;
      const kickoff = new Date(fixture.kickoff).getTime();
      const diff = kickoff - now;
      if (diff <= 20 * 60 * 1000 && diff > 0) {
        fired.add(fixture.id);
        new Notification('World Cup match starts soon', {
          body: `${fixture.homeTeam} vs ${fixture.awayTeam} starts in about ${Math.ceil(diff / 60000)} minutes.`,
          icon: 'assets/icons/icon-192.png',
        });
      }
    });
  }

  window.WC_NOTIFICATIONS = { supported, requestPermission, toggle, isEnabled, tick };
})();
