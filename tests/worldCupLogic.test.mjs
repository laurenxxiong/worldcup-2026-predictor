import test from "node:test";
import assert from "node:assert/strict";

import {
  applyManualOrder,
  buildKnockoutBracket,
  buildVerticalBracketBands,
  computeGroupStandings,
  getBestThirdPlacedTeams,
  resolveThirdPlaceAssignments,
} from "../src/worldCupLogic.js";

const match = (group, home, away, homeScore, awayScore) => ({
  group,
  home: { id: home.slice(0, 3).toUpperCase(), name: home, abbreviation: home.slice(0, 3).toUpperCase() },
  away: { id: away.slice(0, 3).toUpperCase(), name: away, abbreviation: away.slice(0, 3).toUpperCase() },
  homeScore,
  awayScore,
  status: "finished",
});

test("computes standings from completed group matches", () => {
  const standings = computeGroupStandings([
    match("A", "Mexico", "South Africa", 2, 0),
    match("A", "Korea Republic", "Czechia", 2, 1),
    match("A", "Czechia", "South Africa", 1, 1),
    match("A", "Mexico", "Korea Republic", 1, 0),
  ]);

  assert.equal(standings.A[0].name, "Mexico");
  assert.equal(standings.A[0].points, 6);
  assert.equal(standings.A[0].goalDifference, 3);
  assert.equal(standings.A[1].name, "Korea Republic");
  assert.equal(standings.A[1].points, 3);
  assert.equal(standings.A[2].name, "Czechia");
  assert.equal(standings.A[3].name, "South Africa");
});

test("ignores scheduled fixtures when counting played matches and points", () => {
  const standings = computeGroupStandings([
    match("A", "Mexico", "South Africa", 2, 0),
    {
      ...match("A", "Mexico", "Korea Republic", 0, 0),
      status: "scheduled",
    },
  ]);

  assert.equal(standings.A.find((team) => team.name === "Mexico").played, 1);
  assert.equal(standings.A.find((team) => team.name === "Mexico").points, 3);
  assert.equal(standings.A.find((team) => team.name === "Korea Republic").played, 0);
  assert.equal(standings.A.find((team) => team.name === "Korea Republic").points, 0);
});

test("uses standard football points for wins draws and losses", () => {
  const standings = computeGroupStandings([
    match("A", "Mexico", "South Africa", 2, 0),
    match("A", "Korea Republic", "Czechia", 1, 1),
  ]);

  assert.equal(standings.A.find((team) => team.name === "Mexico").points, 3);
  assert.equal(standings.A.find((team) => team.name === "Korea Republic").points, 1);
  assert.equal(standings.A.find((team) => team.name === "Czechia").points, 1);
  assert.equal(standings.A.find((team) => team.name === "South Africa").points, 0);
});

test("preserves team display metadata through standings", () => {
  const standings = computeGroupStandings([
    {
      group: "A",
      home: {
        id: "MEX",
        name: "墨西哥 Mexico",
        englishName: "Mexico",
        zhName: "墨西哥",
        abbreviation: "MEX",
        country: "MEX",
        flagEmoji: "🇲🇽",
      },
      away: {
        id: "RSA",
        name: "南非 South Africa",
        englishName: "South Africa",
        zhName: "南非",
        abbreviation: "RSA",
        country: "RSA",
        flagEmoji: "🇿🇦",
      },
      homeScore: 2,
      awayScore: 0,
      status: "finished",
    },
  ]);

  assert.equal(standings.A[0].name, "墨西哥 Mexico");
  assert.equal(standings.A[0].englishName, "Mexico");
  assert.equal(standings.A[0].zhName, "墨西哥");
  assert.equal(standings.A[0].flagEmoji, "🇲🇽");
});

test("applies manual drag order without mutating computed standings", () => {
  const standings = {
    A: [
      { id: "MEX", name: "Mexico", points: 6 },
      { id: "KOR", name: "Korea Republic", points: 3 },
      { id: "CZE", name: "Czechia", points: 1 },
    ],
  };

  const ordered = applyManualOrder(standings, { A: ["KOR", "MEX", "CZE"] });

  assert.equal(ordered.A[0].name, "Korea Republic");
  assert.equal(ordered.A[1].name, "Mexico");
  assert.equal(standings.A[0].name, "Mexico");
});

test("selects the eight best third-placed teams", () => {
  const standings = {};
  "ABCDEFGHIJKL".split("").forEach((group, index) => {
    standings[group] = [
      { id: `${group}1`, name: `${group} winner`, group, rank: 1, points: 6, goalDifference: 2, goalsFor: 4 },
      { id: `${group}2`, name: `${group} runner`, group, rank: 2, points: 4, goalDifference: 1, goalsFor: 3 },
      { id: `${group}3`, name: `${group} third`, group, rank: 3, points: 12 - index, goalDifference: 0, goalsFor: 2 },
    ];
  });

  const bestThird = getBestThirdPlacedTeams(standings);

  assert.deepEqual(bestThird.map((team) => team.group), ["A", "B", "C", "D", "E", "F", "G", "H"]);
});

test("resolves official third-place assignment for the all-late-groups combination", () => {
  const assignments = resolveThirdPlaceAssignments(["E", "F", "G", "H", "I", "J", "K", "L"]);

  assert.equal(assignments["1A"], "E");
  assert.equal(assignments["1B"], "J");
  assert.equal(assignments["1D"], "I");
  assert.equal(assignments["1E"], "F");
  assert.equal(assignments["1G"], "H");
  assert.equal(assignments["1I"], "G");
  assert.equal(assignments["1K"], "L");
  assert.equal(assignments["1L"], "K");
});

test("resolves official third-place assignment for a mixed combination", () => {
  const assignments = resolveThirdPlaceAssignments(["B", "F", "G", "H", "I", "J", "K", "L"]);

  assert.equal(assignments["1A"], "H");
  assert.equal(assignments["1B"], "J");
  assert.equal(assignments["1D"], "B");
  assert.equal(assignments["1E"], "F");
  assert.equal(assignments["1G"], "I");
  assert.equal(assignments["1I"], "G");
  assert.equal(assignments["1K"], "L");
  assert.equal(assignments["1L"], "K");
});

test("builds a bracket with live group winners and third-place slots", () => {
  const standings = {};
  "ABCDEFGHIJKL".split("").forEach((group, index) => {
    standings[group] = [
      { id: `${group}1`, name: `${group} winner`, group, rank: 1, points: 9, goalDifference: 3, goalsFor: 5 },
      { id: `${group}2`, name: `${group} runner`, group, rank: 2, points: 6, goalDifference: 1, goalsFor: 3 },
      { id: `${group}3`, name: `${group} third`, group, rank: 3, points: 12 - index, goalDifference: 0, goalsFor: 2 },
    ];
  });

  const bracket = buildKnockoutBracket(standings);

  assert.equal(bracket.roundOf32.length, 16);
  assert.equal(bracket.roundOf32.find((game) => game.match === 73).home.name, "A runner");
  assert.equal(bracket.roundOf32.find((game) => game.match === 73).away.name, "B runner");
  assert.equal(bracket.roundOf32.find((game) => game.match === 79).home.name, "A winner");
  assert.equal(bracket.roundOf32.find((game) => game.match === 79).away.group, "H");
  assert.equal(bracket.roundOf16.length, 8);
  assert.equal(bracket.final.match, 103);
});

test("builds vertical upper and lower bracket bands that converge into the final", () => {
  const standings = {};
  "ABCDEFGHIJKL".split("").forEach((group, index) => {
    standings[group] = [
      { id: `${group}1`, name: `${group} winner`, group, rank: 1, points: 9, goalDifference: 3, goalsFor: 5 },
      { id: `${group}2`, name: `${group} runner`, group, rank: 2, points: 6, goalDifference: 1, goalsFor: 3 },
      { id: `${group}3`, name: `${group} third`, group, rank: 3, points: 12 - index, goalDifference: 0, goalsFor: 2 },
    ];
  });

  const bands = buildVerticalBracketBands(buildKnockoutBracket(standings));

  assert.equal(bands.length, 2);
  assert.equal(bands[0].id, "upper");
  assert.equal(bands[0].label, "上半区");
  assert.deepEqual(
    bands[0].rounds.map((round) => [round.label, round.games.map((game) => game.match)]),
    [
      ["32 强", [74, 77, 73, 75, 83, 84, 81, 82]],
      ["16 强", [89, 90, 91, 92]],
      ["8 强", [97, 98]],
      ["半决赛", [101]],
    ],
  );
  assert.equal(bands[1].id, "lower");
  assert.equal(bands[1].label, "下半区");
  assert.deepEqual(
    bands[1].rounds.map((round) => [round.label, round.games.map((game) => game.match)]),
    [
      ["32 强", [76, 78, 79, 80, 86, 88, 85, 87]],
      ["16 强", [93, 94, 95, 96]],
      ["8 强", [99, 100]],
      ["半决赛", [102]],
    ],
  );
  assert.deepEqual(
    bands[1].displayRounds.map((round) => [round.label, round.games.map((game) => game.match)]),
    [
      ["半决赛", [102]],
      ["8 强", [99, 100]],
      ["16 强", [93, 94, 95, 96]],
      ["32 强", [76, 78, 79, 80, 86, 88, 85, 87]],
    ],
  );
});
