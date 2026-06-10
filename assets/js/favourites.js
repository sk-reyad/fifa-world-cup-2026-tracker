(function () {
  const KEY = 'wc2026-favourite-team';

  function get(defaultTeam = 'Brazil') {
    return localStorage.getItem(KEY) || defaultTeam;
  }

  function set(team) {
    localStorage.setItem(KEY, team);
  }

  function teamsFromGroups(groups) {
    return Object.values(groups).flat().sort((a, b) => a.localeCompare(b));
  }

  window.WC_FAVOURITES = { get, set, teamsFromGroups };
})();
