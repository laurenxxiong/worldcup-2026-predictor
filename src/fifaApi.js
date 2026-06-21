import { decorateTeam } from "./countryMeta.js";

const FIFA_MATCHES_URL =
  "https://api.fifa.com/api/v3/calendar/matches?language=en&count=120&idCompetition=17&from=2026-06-11&to=2026-06-29";

export async function fetchFifaMatches() {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), 12000);
  let response;

  try {
    response = await fetch(FIFA_MATCHES_URL, {
      signal: controller.signal,
      headers: {
        accept: "application/json",
      },
    });
  } finally {
    globalThis.clearTimeout(timeout);
  }

  if (!response.ok) throw new Error(`FIFA data request failed: ${response.status}`);

  const payload = await response.json();
  return {
    sourceUrl: FIFA_MATCHES_URL,
    fetchedAt: new Date().toISOString(),
    matches: parseFifaMatches(payload),
  };
}

export function parseFifaMatches(payload) {
  return (payload?.Results || [])
    .map((match) => {
      const group = getDescription(match.GroupName).replace(/^Group\s+/i, "").trim();
      if (!group) return null;

      return {
        id: match.IdMatch,
        group: group.slice(0, 1).toUpperCase(),
        date: match.Date,
        localDate: match.LocalDate,
        status: normalizeStatus(match),
        home: parseTeam(match.Home),
        away: parseTeam(match.Away),
        homeScore: numberOrNull(match.HomeTeamScore ?? match.Home?.Score),
        awayScore: numberOrNull(match.AwayTeamScore ?? match.Away?.Score),
      };
    })
    .filter(Boolean);
}

function parseTeam(team = {}) {
  const abbreviation = team.Abbreviation || team.IdCountry || team.IdTeam || "";

  return decorateTeam({
    id: team.IdTeam || abbreviation,
    englishName: team.ShortClubName || getDescription(team.TeamName) || abbreviation,
    name: team.ShortClubName || getDescription(team.TeamName) || abbreviation,
    abbreviation,
    country: team.IdCountry || abbreviation,
  });
}

function normalizeStatus(match) {
  const homeScore = numberOrNull(match.HomeTeamScore ?? match.Home?.Score);
  const awayScore = numberOrNull(match.AwayTeamScore ?? match.Away?.Score);
  if (Number.isFinite(homeScore) && Number.isFinite(awayScore)) return "finished";
  if (match.MatchTime) return "live";
  return "scheduled";
}

function getDescription(localized = []) {
  return localized.find((entry) => /^en/i.test(entry.Locale))?.Description || localized[0]?.Description || "";
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
