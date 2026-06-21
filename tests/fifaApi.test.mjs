import test from "node:test";
import assert from "node:assert/strict";

import { parseFifaMatches } from "../src/fifaApi.js";

test("parses FIFA calendar matches into internal match records", () => {
  const apiPayload = {
    Results: [
      {
        IdGroup: "289275",
        GroupName: [{ Locale: "en-GB", Description: "Group A" }],
        Home: {
          IdTeam: "43911",
          IdCountry: "MEX",
          ShortClubName: "Mexico",
          Abbreviation: "MEX",
          PictureUrl: "https://api.fifa.com/api/v3/picture/flags-{format}-{size}/MEX",
          TeamName: [{ Locale: "en-GB", Description: "Mexico" }],
        },
        Away: {
          IdTeam: "43883",
          IdCountry: "RSA",
          ShortClubName: "South Africa",
          Abbreviation: "RSA",
          PictureUrl: "https://api.fifa.com/api/v3/picture/flags-{format}-{size}/RSA",
          TeamName: [{ Locale: "en-GB", Description: "South Africa" }],
        },
        HomeTeamScore: 2,
        AwayTeamScore: 0,
        MatchStatus: 0,
        Date: "2026-06-11T19:00:00Z",
      },
      {
        GroupName: [{ Locale: "en-GB", Description: "Group B" }],
        Home: { IdTeam: "CAN", ShortClubName: "Canada", Abbreviation: "CAN" },
        Away: { IdTeam: "QAT", ShortClubName: "Qatar", Abbreviation: "QAT" },
        HomeTeamScore: null,
        AwayTeamScore: null,
        MatchStatus: 1,
        Date: "2026-06-18T19:00:00Z",
      },
    ],
  };

  const parsed = parseFifaMatches(apiPayload);

  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].group, "A");
  assert.equal(parsed[0].home.name, "墨西哥 Mexico");
  assert.equal(parsed[0].home.englishName, "Mexico");
  assert.equal(parsed[0].home.zhName, "墨西哥");
  assert.equal(parsed[0].home.flagEmoji, "🇲🇽");
  assert.equal(parsed[0].home.flagUrl, "");
  assert.equal(parsed[0].away.name, "南非 South Africa");
  assert.equal(parsed[0].away.flagEmoji, "🇿🇦");
  assert.equal(parsed[0].status, "finished");
  assert.equal(parsed[1].home.name, "加拿大 Canada");
  assert.equal(parsed[1].home.flagEmoji, "🇨🇦");
  assert.equal(parsed[1].status, "scheduled");
});

test("uses subdivision emoji flags for England and Scotland", () => {
  const parsed = parseFifaMatches({
    Results: [
      {
        GroupName: [{ Locale: "en-GB", Description: "Group L" }],
        Home: { IdTeam: "ENG", IdCountry: "ENG", ShortClubName: "England", Abbreviation: "ENG" },
        Away: { IdTeam: "SCO", IdCountry: "SCO", ShortClubName: "Scotland", Abbreviation: "SCO" },
        HomeTeamScore: null,
        AwayTeamScore: null,
        MatchStatus: 1,
      },
    ],
  });

  assert.equal(parsed[0].home.name, "英格兰 England");
  assert.notEqual(parsed[0].home.flagEmoji, "🏴");
  assert.equal([...parsed[0].home.flagEmoji].length, 7);
  assert.equal(parsed[0].away.name, "苏格兰 Scotland");
  assert.notEqual(parsed[0].away.flagEmoji, "🏴");
  assert.equal([...parsed[0].away.flagEmoji].length, 7);
});
