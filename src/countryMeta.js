const SPECIAL_FLAGS = {
  ENG: subdivisionFlag("gbeng"),
  SCO: subdivisionFlag("gbsct"),
};

const COUNTRY_META = {
  MEX: { zhName: "墨西哥", alpha2: "MX" },
  RSA: { zhName: "南非", alpha2: "ZA" },
  KOR: { zhName: "韩国", alpha2: "KR" },
  CZE: { zhName: "捷克", alpha2: "CZ" },
  CAN: { zhName: "加拿大", alpha2: "CA" },
  QAT: { zhName: "卡塔尔", alpha2: "QA" },
  SUI: { zhName: "瑞士", alpha2: "CH" },
  BIH: { zhName: "波黑", alpha2: "BA" },
  BRA: { zhName: "巴西", alpha2: "BR" },
  MAR: { zhName: "摩洛哥", alpha2: "MA" },
  HAI: { zhName: "海地", alpha2: "HT" },
  SCO: { zhName: "苏格兰", emoji: SPECIAL_FLAGS.SCO },
  USA: { zhName: "美国", alpha2: "US" },
  PAR: { zhName: "巴拉圭", alpha2: "PY" },
  AUS: { zhName: "澳大利亚", alpha2: "AU" },
  TUR: { zhName: "土耳其", alpha2: "TR" },
  GER: { zhName: "德国", alpha2: "DE" },
  CUW: { zhName: "库拉索", alpha2: "CW" },
  CIV: { zhName: "科特迪瓦", alpha2: "CI" },
  ECU: { zhName: "厄瓜多尔", alpha2: "EC" },
  NED: { zhName: "荷兰", alpha2: "NL" },
  JPN: { zhName: "日本", alpha2: "JP" },
  SWE: { zhName: "瑞典", alpha2: "SE" },
  TUN: { zhName: "突尼斯", alpha2: "TN" },
  BEL: { zhName: "比利时", alpha2: "BE" },
  EGY: { zhName: "埃及", alpha2: "EG" },
  IRN: { zhName: "伊朗", alpha2: "IR" },
  NZL: { zhName: "新西兰", alpha2: "NZ" },
  ESP: { zhName: "西班牙", alpha2: "ES" },
  CPV: { zhName: "佛得角", alpha2: "CV" },
  KSA: { zhName: "沙特阿拉伯", alpha2: "SA" },
  URU: { zhName: "乌拉圭", alpha2: "UY" },
  FRA: { zhName: "法国", alpha2: "FR" },
  SEN: { zhName: "塞内加尔", alpha2: "SN" },
  IRQ: { zhName: "伊拉克", alpha2: "IQ" },
  NOR: { zhName: "挪威", alpha2: "NO" },
  ARG: { zhName: "阿根廷", alpha2: "AR" },
  ALG: { zhName: "阿尔及利亚", alpha2: "DZ" },
  AUT: { zhName: "奥地利", alpha2: "AT" },
  JOR: { zhName: "约旦", alpha2: "JO" },
  POR: { zhName: "葡萄牙", alpha2: "PT" },
  COD: { zhName: "刚果民主共和国", alpha2: "CD" },
  UZB: { zhName: "乌兹别克斯坦", alpha2: "UZ" },
  COL: { zhName: "哥伦比亚", alpha2: "CO" },
  ENG: { zhName: "英格兰", emoji: SPECIAL_FLAGS.ENG },
  CRO: { zhName: "克罗地亚", alpha2: "HR" },
  GHA: { zhName: "加纳", alpha2: "GH" },
  PAN: { zhName: "巴拿马", alpha2: "PA" },
};

const COUNTRY_NAME_TO_CODE = {
  Mexico: "MEX",
  "South Africa": "RSA",
  "Korea Republic": "KOR",
  Czechia: "CZE",
  Canada: "CAN",
  Qatar: "QAT",
  Switzerland: "SUI",
  "Bosnia and Herzegovina": "BIH",
  Brazil: "BRA",
  Morocco: "MAR",
  Haiti: "HAI",
  Scotland: "SCO",
  "United States": "USA",
  USA: "USA",
  Paraguay: "PAR",
  Australia: "AUS",
  Türkiye: "TUR",
  Turkey: "TUR",
  Germany: "GER",
  Curacao: "CUW",
  Curaçao: "CUW",
  "Cote d'Ivoire": "CIV",
  "Côte d’Ivoire": "CIV",
  "Côte d'Ivoire": "CIV",
  Ecuador: "ECU",
  Netherlands: "NED",
  Japan: "JPN",
  Sweden: "SWE",
  Tunisia: "TUN",
  Belgium: "BEL",
  Egypt: "EGY",
  Iran: "IRN",
  "New Zealand": "NZL",
  Spain: "ESP",
  "Cabo Verde": "CPV",
  "Cape Verde": "CPV",
  "Saudi Arabia": "KSA",
  Uruguay: "URU",
  France: "FRA",
  Senegal: "SEN",
  Iraq: "IRQ",
  Norway: "NOR",
  Argentina: "ARG",
  Algeria: "ALG",
  Austria: "AUT",
  Jordan: "JOR",
  Portugal: "POR",
  "Congo DR": "COD",
  "DR Congo": "COD",
  "Congo Democratic Republic": "COD",
  Uzbekistan: "UZB",
  Colombia: "COL",
  England: "ENG",
  Croatia: "CRO",
  Ghana: "GHA",
  Panama: "PAN",
};

export function decorateTeam(team = {}) {
  const englishName = getEnglishName(team.name, team.zhName, team.englishName);
  const codeCandidates = [team.country, team.abbreviation, team.id]
    .filter(Boolean)
    .map((value) => String(value).toUpperCase());
  const code =
    codeCandidates.find((candidate) => COUNTRY_META[candidate]) ||
    COUNTRY_NAME_TO_CODE[englishName] ||
    COUNTRY_NAME_TO_CODE[team.name] ||
    codeCandidates[0] ||
    "";
  const meta = COUNTRY_META[code] || {};
  const zhName = team.zhName || meta.zhName || "";
  const flagEmoji = team.flagEmoji || meta.emoji || countryCodeToEmoji(meta.alpha2);

  return {
    ...team,
    englishName,
    zhName,
    name: zhName && englishName ? `${zhName} ${englishName}` : englishName || zhName || code,
    flagEmoji: flagEmoji || "🏳️",
    flagUrl: "",
  };
}

export function countryCodeToEmoji(alpha2 = "") {
  const code = alpha2.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "";

  return [...code]
    .map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
    .join("");
}

function subdivisionFlag(region = "") {
  const base = String.fromCodePoint(0x1f3f4);
  const tags = [...region.toLowerCase()]
    .map((letter) => String.fromCodePoint(0xe0000 + letter.charCodeAt(0)))
    .join("");
  const cancelTag = String.fromCodePoint(0xe007f);
  return `${base}${tags}${cancelTag}`;
}

function getEnglishName(name = "", zhName = "", explicitEnglishName = "") {
  if (explicitEnglishName) return explicitEnglishName;
  if (zhName && name.startsWith(`${zhName} `)) return name.slice(zhName.length + 1);
  return name;
}
