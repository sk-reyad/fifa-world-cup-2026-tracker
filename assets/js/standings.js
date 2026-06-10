(function () {
  function initialRows(groups, flags) {
    const rows = {};
    Object.entries(groups).forEach(([group, teams]) => {
      rows[group] = teams.map((team) => ({
        group,
        team,
        flag: flags[team] || '🏳️',
        played: 0,
        win: 0,
        draw: 0,
        loss: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        points: 0,
      }));
    });
    return rows;
  }

  function findRow(table, group, team) {
    if (!group || !team || !table[group]) return null;
    return table[group].find((row) => row.team === team) || null;
  }

  function hasFinalScore(fixture) {
    return Number.isFinite(fixture.homeScore) && Number.isFinite(fixture.awayScore) && ['finished', 'ft', 'aet', 'pen_finished'].includes(String(fixture.status || '').toLowerCase());
  }

  function applyMatch(home, away, homeScore, awayScore) {
    home.played += 1;
    away.played += 1;
    home.gf += homeScore;
    home.ga += awayScore;
    away.gf += awayScore;
    away.ga += homeScore;
    home.gd = home.gf - home.ga;
    away.gd = away.gf - away.ga;

    if (homeScore > awayScore) {
      home.win += 1; home.points += 3;
      away.loss += 1;
    } else if (homeScore < awayScore) {
      away.win += 1; away.points += 3;
      home.loss += 1;
    } else {
      home.draw += 1; away.draw += 1;
      home.points += 1; away.points += 1;
    }
  }

  function calculate(groups, flags, fixtures) {
    const table = initialRows(groups, flags);
    fixtures
      .filter((fixture) => fixture.stage === 'Group Stage' && hasFinalScore(fixture))
      .forEach((fixture) => {
        const home = findRow(table, fixture.group, fixture.homeTeam);
        const away = findRow(table, fixture.group, fixture.awayTeam);
        if (!home || !away) return;
        applyMatch(home, away, Number(fixture.homeScore), Number(fixture.awayScore));
      });

    Object.keys(table).forEach((group) => {
      table[group].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.gd !== a.gd) return b.gd - a.gd;
        if (b.gf !== a.gf) return b.gf - a.gf;
        return a.team.localeCompare(b.team);
      });
    });
    return table;
  }

  window.WC_STANDINGS = { calculate, hasFinalScore };
})();
