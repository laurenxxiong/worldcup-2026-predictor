import { THIRD_PLACE_ASSIGNMENT_TABLE } from "./thirdPlaceRules.js";

export const GROUPS = "ABCDEFGHIJKL".split("");

export const ROUND_OF_32_SLOTS = [
  { match: 73, home: "2A", away: "2B", date: "Jun 28", venue: "Inglewood" },
  { match: 74, home: "1E", away: "3:A/B/C/D/F", date: "Jun 29", venue: "Foxborough" },
  { match: 75, home: "1F", away: "2C", date: "Jun 29", venue: "Guadalupe" },
  { match: 76, home: "1C", away: "2F", date: "Jun 29", venue: "Houston" },
  { match: 77, home: "1I", away: "3:C/D/F/G/H", date: "Jun 30", venue: "New York/New Jersey" },
  { match: 78, home: "2E", away: "2I", date: "Jun 30", venue: "Dallas" },
  { match: 79, home: "1A", away: "3:C/E/F/H/I", date: "Jun 30", venue: "Mexico City" },
  { match: 80, home: "1L", away: "3:E/H/I/J/K", date: "Jul 1", venue: "Atlanta" },
  { match: 81, home: "1D", away: "3:B/E/F/I/J", date: "Jul 1", venue: "Santa Clara" },
  { match: 82, home: "1G", away: "3:A/E/H/I/J", date: "Jul 1", venue: "Seattle" },
  { match: 83, home: "2K", away: "2L", date: "Jul 2", venue: "Toronto" },
  { match: 84, home: "1H", away: "2J", date: "Jul 2", venue: "Los Angeles" },
  { match: 85, home: "1B", away: "3:E/F/G/I/J", date: "Jul 2", venue: "Vancouver" },
  { match: 86, home: "1J", away: "2H", date: "Jul 3", venue: "Miami" },
  { match: 87, home: "1K", away: "3:D/E/I/J/L", date: "Jul 3", venue: "Kansas City" },
  { match: 88, home: "2D", away: "2G", date: "Jul 3", venue: "Dallas" },
];

export const BRACKET_LINKS = {
  roundOf16: [
    { match: 89, home: 74, away: 77 },
    { match: 90, home: 73, away: 75 },
    { match: 91, home: 83, away: 84 },
    { match: 92, home: 81, away: 82 },
    { match: 93, home: 76, away: 78 },
    { match: 94, home: 79, away: 80 },
    { match: 95, home: 86, away: 88 },
    { match: 96, home: 85, away: 87 },
  ],
  quarterfinals: [
    { match: 97, home: 89, away: 90 },
    { match: 98, home: 91, away: 92 },
    { match: 99, home: 93, away: 94 },
    { match: 100, home: 95, away: 96 },
  ],
  semifinals: [
    { match: 101, home: 97, away: 98 },
    { match: 102, home: 99, away: 100 },
  ],
  final: { match: 103, home: 101, away: 102 },
};

const THIRD_PLACE_SLOT_KEYS = ["1A", "1B", "1D", "1E", "1G", "1I", "1K", "1L"];

export function computeGroupStandings(matches) {
  const byGroup = {};

  for (const match of matches) {
    const group = normalizeGroup(match.group);
    if (!group) continue;
    byGroup[group] ||= new Map();

    const home = ensureTeam(byGroup[group], match.home, group);
    const away = ensureTeam(byGroup[group], match.away, group);
    const homeScore = Number(match.homeScore);
    const awayScore = Number(match.awayScore);
    const isFinished = match.status === "finished" && Number.isFinite(homeScore) && Number.isFinite(awayScore);

    if (!isFinished) continue;

    home.played += 1;
    away.played += 1;
    home.goalsFor += homeScore;
    home.goalsAgainst += awayScore;
    away.goalsFor += awayScore;
    away.goalsAgainst += homeScore;

    if (homeScore > awayScore) {
      home.wins += 1;
      away.losses += 1;
      home.points += 3;
    } else if (homeScore < awayScore) {
      away.wins += 1;
      home.losses += 1;
      away.points += 3;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  const standings = {};
  for (const group of GROUPS) {
    const teams = Array.from(byGroup[group]?.values() || []);
    standings[group] = teams.map(addDerivedStats).sort(compareTeams).map((team, index) => ({
      ...team,
      rank: index + 1,
    }));
  }

  return standings;
}

export function applyManualOrder(standings, manualOrder = {}) {
  const ordered = {};

  for (const group of Object.keys(standings)) {
    const source = standings[group] || [];
    const ids = manualOrder[group] || [];
    const byId = new Map(source.map((team) => [team.id, team]));
    const used = new Set();
    const manualTeams = ids.map((id) => byId.get(id)).filter(Boolean);
    manualTeams.forEach((team) => used.add(team.id));
    const remaining = source.filter((team) => !used.has(team.id));

    ordered[group] = [...manualTeams, ...remaining].map((team, index) => ({
      ...team,
      rank: index + 1,
    }));
  }

  return ordered;
}

export function getBestThirdPlacedTeams(standings) {
  return GROUPS.map((group) => standings[group]?.[2])
    .filter(Boolean)
    .map((team) => ({ ...team, rank: 3 }))
    .sort(compareTeams)
    .slice(0, 8);
}

export function resolveThirdPlaceAssignments(groups) {
  const key = [...new Set(groups)].sort().join("");
  const assignment = THIRD_PLACE_ASSIGNMENT_TABLE[key];

  if (!assignment) {
    return resolveThirdPlaceAssignmentsBySearch(key.split(""));
  }

  return Object.fromEntries(THIRD_PLACE_SLOT_KEYS.map((slot, index) => [slot, assignment[index]]));
}

export function buildKnockoutBracket(standings) {
  const thirdPlaced = getBestThirdPlacedTeams(standings);
  const thirdByGroup = new Map(thirdPlaced.map((team) => [team.group, team]));
  const assignments = resolveThirdPlaceAssignments(thirdPlaced.map((team) => team.group));

  const roundOf32 = ROUND_OF_32_SLOTS.map((slot) => ({
    ...slot,
    home: resolveSlotTeam(slot.home, standings, thirdByGroup, assignments),
    away: resolveSlotTeam(slot.away, standings, thirdByGroup, assignments),
  }));

  const roundOf16 = BRACKET_LINKS.roundOf16.map((link) => ({
    match: link.match,
    home: placeholder(`Winner ${link.home}`),
    away: placeholder(`Winner ${link.away}`),
    source: link,
  }));

  const quarterfinals = BRACKET_LINKS.quarterfinals.map((link) => ({
    match: link.match,
    home: placeholder(`Winner ${link.home}`),
    away: placeholder(`Winner ${link.away}`),
    source: link,
  }));

  const semifinals = BRACKET_LINKS.semifinals.map((link) => ({
    match: link.match,
    home: placeholder(`Winner ${link.home}`),
    away: placeholder(`Winner ${link.away}`),
    source: link,
  }));

  return {
    roundOf32,
    roundOf16,
    quarterfinals,
    semifinals,
    final: {
      match: BRACKET_LINKS.final.match,
      home: placeholder(`Winner ${BRACKET_LINKS.final.home}`),
      away: placeholder(`Winner ${BRACKET_LINKS.final.away}`),
      source: BRACKET_LINKS.final,
    },
    thirdPlaced,
    assignments,
  };
}

export function buildVerticalBracketBands(bracket) {
  const gamesByMatch = new Map(
    [
      ...bracket.roundOf32,
      ...bracket.roundOf16,
      ...bracket.quarterfinals,
      ...bracket.semifinals,
    ].map((game) => [game.match, game]),
  );

  return [
    { id: "upper", label: "上半区", semifinal: 101 },
    { id: "lower", label: "下半区", semifinal: 102 },
  ].map((band) => {
    const buckets = {
      roundOf32: [],
      roundOf16: [],
      quarterfinals: [],
      semifinals: [],
    };

    collectBracketPath(gamesByMatch.get(band.semifinal), gamesByMatch, buckets);

    return {
      id: band.id,
      label: band.label,
      rounds: [
        { label: "32 强", games: buckets.roundOf32 },
        { label: "16 强", games: buckets.roundOf16 },
        { label: "8 强", games: buckets.quarterfinals },
        { label: "半决赛", games: buckets.semifinals },
      ],
    };
  }).map((band) => ({
    ...band,
    displayRounds: band.id === "lower" ? [...band.rounds].reverse() : band.rounds,
  }));
}

function ensureTeam(groupMap, team, group) {
  const id = team.id || team.abbreviation || team.name;
  if (!groupMap.has(id)) {
    groupMap.set(id, {
      id,
      name: team.name,
      englishName: team.englishName || team.name,
      zhName: team.zhName || "",
      abbreviation: team.abbreviation || id,
      country: team.country || team.abbreviation || id,
      flagEmoji: team.flagEmoji || "",
      flagUrl: team.flagUrl || "",
      group,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
      fairPlay: team.fairPlay ?? 0,
    });
  }
  return groupMap.get(id);
}

function collectBracketPath(game, gamesByMatch, buckets) {
  if (!game) return;

  if (game.source) {
    [game.source.home, game.source.away].forEach((matchNumber) => {
      collectBracketPath(gamesByMatch.get(matchNumber), gamesByMatch, buckets);
    });
  }

  const bucket = getBracketRoundKey(game.match);
  if (bucket) buckets[bucket].push(game);
}

function getBracketRoundKey(matchNumber) {
  if (matchNumber >= 73 && matchNumber <= 88) return "roundOf32";
  if (matchNumber >= 89 && matchNumber <= 96) return "roundOf16";
  if (matchNumber >= 97 && matchNumber <= 100) return "quarterfinals";
  if (matchNumber >= 101 && matchNumber <= 102) return "semifinals";
  return "";
}

function addDerivedStats(team) {
  return {
    ...team,
    goalDifference: team.goalsFor - team.goalsAgainst,
  };
}

function compareTeams(a, b) {
  return (
    b.points - a.points ||
    b.goalDifference - a.goalDifference ||
    b.goalsFor - a.goalsFor ||
    (b.fairPlay ?? 0) - (a.fairPlay ?? 0) ||
    String(a.name).localeCompare(String(b.name))
  );
}

function normalizeGroup(group) {
  if (!group) return "";
  return String(group).replace(/^Group\s+/i, "").trim().slice(0, 1).toUpperCase();
}

function resolveSlotTeam(slot, standings, thirdByGroup, assignments) {
  const fixedMatch = /^([12])([A-L])$/.exec(slot);
  if (fixedMatch) {
    const [, rank, group] = fixedMatch;
    return standings[group]?.[Number(rank) - 1] || placeholder(slot);
  }

  const thirdMatch = /^3:/.exec(slot);
  if (thirdMatch) {
    const winnerGroup = slot === "3:A/B/C/D/F" ? "1E" : slot === "3:C/D/F/G/H" ? "1I" : slot === "3:C/E/F/H/I" ? "1A" : slot === "3:E/H/I/J/K" ? "1L" : slot === "3:B/E/F/I/J" ? "1D" : slot === "3:A/E/H/I/J" ? "1G" : slot === "3:E/F/G/I/J" ? "1B" : slot === "3:D/E/I/J/L" ? "1K" : "";
    const assignedGroup = assignments[winnerGroup];
    return thirdByGroup.get(assignedGroup) || placeholder(`3rd ${assignedGroup || slot.replace("3:", "")}`);
  }

  return placeholder(slot);
}

function resolveThirdPlaceAssignmentsBySearch(groups) {
  const slotEligibility = {
    "1A": ["C", "E", "F", "H", "I"],
    "1B": ["E", "F", "G", "I", "J"],
    "1D": ["B", "E", "F", "I", "J"],
    "1E": ["A", "B", "C", "D", "F"],
    "1G": ["A", "E", "H", "I", "J"],
    "1I": ["C", "D", "F", "G", "H"],
    "1K": ["D", "E", "I", "J", "L"],
    "1L": ["E", "H", "I", "J", "K"],
  };
  const result = {};
  const used = new Set();

  const search = (index) => {
    if (index >= THIRD_PLACE_SLOT_KEYS.length) return true;
    const slot = THIRD_PLACE_SLOT_KEYS[index];
    for (const group of slotEligibility[slot]) {
      if (!groups.includes(group) || used.has(group)) continue;
      result[slot] = group;
      used.add(group);
      if (search(index + 1)) return true;
      used.delete(group);
      delete result[slot];
    }
    return false;
  };

  search(0);
  return result;
}

function placeholder(name) {
  return {
    id: name,
    name,
    abbreviation: name,
    group: "",
    placeholder: true,
  };
}
