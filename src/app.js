import { fetchFifaMatches } from "./fifaApi.js";
import { decorateTeam } from "./countryMeta.js";
import {
  GROUPS,
  applyManualOrder,
  buildKnockoutBracket,
  buildVerticalBracketBands,
  computeGroupStandings,
} from "./worldCupLogic.js";

const CACHE_KEY = "world-cup-2026-live-cache";
const MANUAL_ORDER_KEY = "world-cup-2026-manual-order";
const LONG_PRESS_DRAG_DELAY_MS = 450;
const LONG_PRESS_CANCEL_DISTANCE_PX = 10;

const state = {
  matches: [],
  sourceUrl: "",
  fetchedAt: "",
  computedStandings: {},
  manualOrder: loadManualOrder(),
  pointerDrag: null,
  longPressTimer: null,
};

const elements = {
  app: document.querySelector("#app"),
  statusDot: document.querySelector("#status-dot"),
  statusTitle: document.querySelector("#status-title"),
  statusDetail: document.querySelector("#status-detail"),
  sourceLink: document.querySelector("#source-link"),
  groupsGrid: document.querySelector("#groups-grid"),
  bracketScroll: document.querySelector("#bracket-scroll"),
  refreshData: document.querySelector("#refresh-data"),
  resetOrder: document.querySelector("#reset-order"),
  mobileTabs: [...document.querySelectorAll("[data-mobile-tab]")],
};

elements.refreshData.addEventListener("click", () => loadLiveData({ force: true }));
elements.resetOrder.addEventListener("click", () => {
  state.manualOrder = {};
  localStorage.removeItem(MANUAL_ORDER_KEY);
  render();
});
elements.mobileTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    activateMobilePanel(tab.dataset.mobileTab);
    scrollMobilePanelIntoView(tab.dataset.mobileTab);
  });
});
activateMobilePanel(elements.app.dataset.mobilePanel || "groups");

loadLiveData();

function activateMobilePanel(panel) {
  if (!["groups", "bracket"].includes(panel)) return;

  elements.app.dataset.mobilePanel = panel;
  elements.mobileTabs.forEach((tab) => {
    const isActive = tab.dataset.mobileTab === panel;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
    tab.tabIndex = isActive ? 0 : -1;
  });
}

function scrollMobilePanelIntoView(panel) {
  if (!window.matchMedia("(max-width: 760px)").matches) return;

  const target = document.querySelector(`#${panel}-panel`);
  target?.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "start",
  });
}

async function loadLiveData() {
  setStatus("loading", "正在加载实时数据", "连接 FIFA 比赛接口中...");

  try {
    const data = await fetchFifaMatches();
    state.matches = data.matches;
    state.sourceUrl = data.sourceUrl;
    state.fetchedAt = data.fetchedAt;
    state.computedStandings = computeGroupStandings(data.matches);
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    setStatus("ok", "实时数据已更新", `更新时间 ${formatDateTime(data.fetchedAt)}`);
    render();
  } catch (error) {
    const cached = loadCachedData();
    if (cached) {
      state.matches = cached.matches;
      state.sourceUrl = cached.sourceUrl;
      state.fetchedAt = cached.fetchedAt;
      state.computedStandings = computeGroupStandings(cached.matches);
      setStatus("warn", "实时接口暂不可用", `已使用上次数据：${formatDateTime(cached.fetchedAt)}`);
      render();
      return;
    }

    setStatus("error", "无法加载数据", error.message);
  }
}

function render() {
  const standings = applyManualOrder(state.computedStandings, state.manualOrder);
  const bracket = buildKnockoutBracket(standings);

  renderGroups(standings);
  renderBracket(bracket);
}

function renderGroups(standings) {
  elements.groupsGrid.replaceChildren(...GROUPS.map((group) => renderGroupCard(group, standings[group] || [])));
}

function renderGroupCard(group, teams) {
  const card = document.createElement("article");
  card.className = "group-card";
  if (state.manualOrder[group]) card.classList.add("is-manual");

  const header = document.createElement("div");
  header.className = "group-header";
  header.innerHTML = `
    <div>
      <p class="eyebrow">Group ${group}</p>
      <h3>${group} 组</h3>
    </div>
    <span>${teams.length ? `${teams[0].name} 领跑` : "待加载"}</span>
  `;

  const table = document.createElement("div");
  table.className = "mini-table";
  table.innerHTML = `
    <div class="table-head">
      <span>队伍</span><span>赛</span><span>胜</span><span>平</span><span>负</span><span>净</span><span>分</span>
    </div>
  `;

  teams.forEach((team, index) => {
    table.appendChild(renderTeamRow(group, team, index, teams.length));
  });

  card.append(header, table);
  return card;
}

function renderTeamRow(group, team, index, total) {
  const row = document.createElement("div");
  row.className = "team-row";
  row.draggable = false;
  row.dataset.group = group;
  row.dataset.teamId = team.id;

  row.innerHTML = `
    <div class="team-name">
      <span class="rank">${index + 1}</span>
      ${renderFlag(team)}
      <strong>${team.name}</strong>
    </div>
    <span>${team.played ?? "-"}</span>
    <span>${team.wins ?? "-"}</span>
    <span>${team.draws ?? "-"}</span>
    <span>${team.losses ?? "-"}</span>
    <span>${formatSigned(team.goalDifference)}</span>
    <span class="points">${team.points ?? "-"}</span>
  `;

  const controls = document.createElement("div");
  controls.className = "row-controls";

  const up = document.createElement("button");
  up.type = "button";
  up.textContent = "↑";
  up.disabled = index === 0;
  up.title = "上移";
  up.addEventListener("click", () => moveTeam(group, index, index - 1));

  const down = document.createElement("button");
  down.type = "button";
  down.textContent = "↓";
  down.disabled = index === total - 1;
  down.title = "下移";
  down.addEventListener("click", () => moveTeam(group, index, index + 1));

  controls.append(up, down);
  row.appendChild(controls);

  row.addEventListener("dragstart", (event) => event.preventDefault());

  row.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button")) return;
    if (event.button !== undefined && event.button !== 0) return;

    cancelPendingPointerDrag();
    state.pointerDrag = {
      group,
      teamId: team.id,
      pointerId: event.pointerId,
      row,
      startX: event.clientX,
      startY: event.clientY,
      targetIndex: index,
      activated: false,
    };
    row.classList.add("is-arming-drag");
    state.longPressTimer = setTimeout(() => activatePointerDrag(event.pointerId), LONG_PRESS_DRAG_DELAY_MS);
  });

  row.addEventListener("contextmenu", (event) => {
    if (state.pointerDrag?.teamId === team.id) event.preventDefault();
  });

  return row;
}

document.addEventListener("pointermove", (event) => {
  if (!state.pointerDrag) return;

  const drag = state.pointerDrag;
  const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
  if (!drag.activated && distance > LONG_PRESS_CANCEL_DISTANCE_PX) {
    cancelPendingPointerDrag();
    return;
  }
  if (!drag.activated) return;

  event.preventDefault();
  document.querySelectorAll(".team-row.is-over").forEach((row) => row.classList.remove("is-over"));

  const targetRow = document
    .elementsFromPoint(event.clientX, event.clientY)
    .find((node) => node.classList?.contains("team-row") && node.dataset.group === drag.group);

  if (!targetRow) return;
  targetRow.classList.add("is-over");
  const rows = [...document.querySelectorAll(`.team-row[data-group="${drag.group}"]`)];
  drag.targetIndex = rows.indexOf(targetRow);
});

document.addEventListener("pointerup", () => {
  if (!state.pointerDrag) return;

  const drag = state.pointerDrag;
  clearPointerDragVisuals();
  state.pointerDrag = null;
  clearTimeout(state.longPressTimer);
  state.longPressTimer = null;

  if (!drag.activated || drag.targetIndex < 0) return;
  const current = applyManualOrder(state.computedStandings, state.manualOrder)[drag.group] || [];
  const fromIndex = current.findIndex((team) => team.id === drag.teamId);
  if (fromIndex < 0) return;
  moveTeam(drag.group, fromIndex, drag.targetIndex);
});

document.addEventListener("pointercancel", cancelPendingPointerDrag);

function activatePointerDrag(pointerId) {
  const drag = state.pointerDrag;
  if (!drag || drag.pointerId !== pointerId) return;

  clearTimeout(state.longPressTimer);
  state.longPressTimer = null;
  drag.activated = true;
  drag.row.classList.remove("is-arming-drag");
  drag.row.classList.add("is-dragging");
  drag.row.setPointerCapture?.(pointerId);
}

function cancelPendingPointerDrag() {
  clearTimeout(state.longPressTimer);
  state.longPressTimer = null;
  clearPointerDragVisuals();
  state.pointerDrag = null;
}

function clearPointerDragVisuals() {
  document.querySelectorAll(".team-row.is-arming-drag, .team-row.is-dragging, .team-row.is-over").forEach((row) => {
    row.classList.remove("is-arming-drag", "is-dragging", "is-over");
  });
}

function moveTeam(group, fromIndex, toIndex) {
  if (fromIndex === toIndex || toIndex < 0) return;
  const current = applyManualOrder(state.computedStandings, state.manualOrder)[group] || [];
  if (toIndex >= current.length) return;

  const ids = current.map((team) => team.id);
  const [moved] = ids.splice(fromIndex, 1);
  ids.splice(toIndex, 0, moved);
  state.manualOrder[group] = ids;
  localStorage.setItem(MANUAL_ORDER_KEY, JSON.stringify(state.manualOrder));
  render();
}

function renderBracket(bracket) {
  const [upperBand, lowerBand] = buildVerticalBracketBands(bracket);
  elements.bracketScroll.replaceChildren(
    renderBracketBand(upperBand),
    renderFinalBand(bracket.final),
    renderBracketBand(lowerBand),
  );
}

function renderBracketBand(band) {
  const section = document.createElement("section");
  section.className = `bracket-band bracket-band-${band.id}`;
  section.innerHTML = `
    <div class="band-title">
      <strong>${band.label}</strong>
      <span>${band.id === "upper" ? "胜者进入 M101" : "胜者进入 M102"}</span>
    </div>
  `;

  const stack = document.createElement("div");
  stack.className = `bracket-stack bracket-stack-${band.id}`;
  const rounds = band.displayRounds || band.rounds;

  rounds.forEach((round, index) => {
    const stage = document.createElement("section");
    stage.className = "bracket-stage";
    stage.dataset.gameCount = round.games.length;
    stage.innerHTML = `<h3>${round.label}</h3>`;

    const games = document.createElement("div");
    games.className = "stage-games";
    round.games.forEach((game) => games.appendChild(renderMatchCard(game)));
    stage.appendChild(games);
    stack.appendChild(stage);

    if (index < rounds.length - 1) {
      const connector = document.createElement("div");
      connector.className = "route-connector";
      connector.setAttribute("aria-hidden", "true");
      stack.appendChild(connector);
    }
  });

  section.appendChild(stack);
  return section;
}

function renderFinalBand(final) {
  const section = document.createElement("section");
  section.className = "final-band";
  section.innerHTML = `
    <div class="final-card-wrap">
      <h3>决赛</h3>
    </div>
  `;
  section.querySelector(".final-card-wrap").appendChild(renderMatchCard(final));
  return section;
}

function renderMatchCard(game) {
  const card = document.createElement("article");
  card.className = "match-card";
  card.dataset.match = game.match;
  card.innerHTML = `
    <div class="match-meta">
      <strong>M${game.match}</strong>
      <span>${game.date || ""} ${game.venue ? `· ${game.venue}` : ""}</span>
    </div>
    ${renderTeamSlot(game.home)}
    ${renderTeamSlot(game.away)}
  `;
  return card;
}

function renderTeamSlot(team) {
  return `
    <div class="match-team ${team.placeholder ? "is-placeholder" : ""}">
      ${team.placeholder ? "" : renderFlag(team)}
      <span>${team.name}</span>
      ${team.group ? `<em>${team.group}${team.rank ? `#${team.rank}` : ""}</em>` : ""}
    </div>
  `;
}

function renderFlag(team) {
  return `<span class="flag-emoji" aria-hidden="true">${team.flagEmoji || "🏳️"}</span>`;
}

function setStatus(type, title, detail) {
  elements.statusDot.className = `status-dot ${type}`;
  elements.statusTitle.textContent = title;
  elements.statusDetail.textContent = detail;
  if (state.sourceUrl) elements.sourceLink.href = state.sourceUrl;
}

function loadCachedData() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (!cached?.matches) return null;
    return {
      ...cached,
      matches: cached.matches.map((match) => ({
        ...match,
        home: repairCachedTeam(match.home),
        away: repairCachedTeam(match.away),
      })),
    };
  } catch {
    return null;
  }
}

function repairCachedTeam(team) {
  if (!team) return team;
  return decorateTeam(team);
}

function loadManualOrder() {
  try {
    return JSON.parse(localStorage.getItem(MANUAL_ORDER_KEY)) || {};
  } catch {
    return {};
  }
}

function formatSigned(value) {
  if (!Number.isFinite(value)) return "-";
  return value > 0 ? `+${value}` : String(value);
}

function formatDateTime(value) {
  if (!value) return "未知";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
