const teams = ["Вода", "Воздух", "Земля", "Огонь"];
const stages = [
  { id: "production", title: "Производство" },
  { id: "marketing", title: "Маркетинг" },
  { id: "sales", title: "Реализация" },
];
const questions = [0, 1, 2];
const fortuneColors = [
  "#f3e3bf",
  "#dff4ff",
  "#dfc285",
  "#f6c2b7",
  "#cfe9c8",
  "#f7d7a8",
  "#cfd9ff",
  "#ffe8a3",
  "#d7f0df",
  "#f1c6df",
  "#c9edf0",
  "#ead8b6",
];
const defaultFortuneRules = [
  "Право на 1 ошибку",
  "Переброс кубика",
  "Двойное время на ответ",
  "Бросить 2 кубика – выбрать лучший",
  "Подсказка от ведущего",
  "50/50 для тестового вопроса",
  "Выбор категории вопроса",
  "Риск",
];

let nextFortuneRuleId = 0;
let scores = createEmptyScores();
let teamModifiers = Object.fromEntries(teams.map((team) => [team, 0]));
let fortuneRuleBank = defaultFortuneRules.map(createFortuneRule);
let fortuneRules = [...fortuneRuleBank];
let fortuneHistory = [];
let selectedCell = null;
let selectedTeam = null;
let activeView = "all";
let activeScreen = "scoreboard";

let timerDuration = 30;
let timerLeft = timerDuration;
let timerId = null;
let activeTimerButton = null;
let wheelRotation = 0;
let isWheelSpinning = false;

const headNode = document.querySelector("#scoreHead");
const rowsNode = document.querySelector("#scoreRows");
const popoverNode = document.querySelector("#scorePopover");
const popoverTitleNode = document.querySelector("#popoverTitle");
const customScoreForm = document.querySelector("#customScoreForm");
const customScoreInput = document.querySelector("#customScoreInput");
const teamRulePopoverNode = document.querySelector("#teamRulePopover");
const teamRuleTitleNode = document.querySelector("#teamRuleTitle");
const customModifierForm = document.querySelector("#customModifierForm");
const customModifierInput = document.querySelector("#customModifierInput");
const timerDisplayNode = document.querySelector("#timerDisplay");
const timerButtons = document.querySelectorAll("[data-timer-button]");
const clearTableButton = document.querySelector("#clearTable");
const viewButtons = document.querySelectorAll("[data-view]");
const viewMenu = document.querySelector(".view-menu");
const menuTrigger = document.querySelector(".menu-trigger");
const tableWrap = document.querySelector(".table-wrap");
const fortuneOpenButton = document.querySelector("#fortuneOpen");
const fortuneBackButton = document.querySelector("#fortuneBack");
const fortuneScreen = document.querySelector("#fortuneScreen");
const fortuneWheel = document.querySelector("#fortuneWheel");
const fortuneSpinButton = document.querySelector("#fortuneSpin");
const fortuneResultNode = document.querySelector("#fortuneResult");
const fortuneRulesNode = document.querySelector("#fortuneRules");
const fortuneRulesOpenButton = document.querySelector("#fortuneRulesOpen");
const fortuneRulesModal = document.querySelector("#fortuneRulesModal");
const fortuneRulesCloseButton = document.querySelector("#fortuneRulesClose");
const fortuneRulesDoneButton = document.querySelector("#fortuneRulesDone");
const fortuneRuleAddButton = document.querySelector("#fortuneRuleAdd");
const fortuneResetButton = document.querySelector("#fortuneReset");
const fortuneHistoryNode = document.querySelector("#fortuneHistory");
const timerCard = document.querySelector(".timer-card");
const scoreBoard = document.querySelector(".score-board");

function createFortuneRule(text) {
  nextFortuneRuleId += 1;
  return { id: nextFortuneRuleId, text };
}

function createEmptyScores() {
  return Object.fromEntries(
    teams.map((team) => [
      team,
      Object.fromEntries(stages.map((stage) => [stage.id, [0, 0, 0]])),
    ]),
  );
}

function stageTotal(team, stageId) {
  return scores[team][stageId].reduce((sum, value) => sum + value, 0);
}

function gameTotal(team) {
  return stages.reduce((sum, stage) => sum + stageTotal(team, stage.id), 0);
}

function applyTeamModifier(team, points) {
  return Math.max(0, points + teamModifiers[team]);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => (
    {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    }[char]
  ));
}

function renderStageScoreCell(team, stage, questionIndex) {
  const value = scores[team][stage.id][questionIndex];
  const label = `${team}, ${stage.title}, вопрос ${questionIndex + 1}`;
  const filledClass = value ? " filled" : "";
  const clearButton = value
    ? `<button class="inline-clear" data-inline-score="0" type="button" aria-label="Удалить баллы">×</button>`
    : "";

  return `
    <td>
      <div
        class="score-cell stage-score-cell${filledClass}"
        data-team="${team}"
        data-stage="${stage.id}"
        data-question="${questionIndex}"
        aria-label="${label}"
      >
        ${clearButton}
        <span class="score-number">${value || ""}</span>
        <button class="inline-custom" data-custom-score type="button" aria-label="Ввести свое значение">✎</button>
        <div class="inline-score-actions" aria-label="Начислить баллы">
          <button data-inline-score="10" type="button">10</button>
          <button data-inline-score="20" type="button">20</button>
          <button data-inline-score="50" type="button">50</button>
        </div>
      </div>
    </td>
  `;
}

function renderPopupScoreCell(team, stage, questionIndex) {
  const value = scores[team][stage.id][questionIndex];
  const label = `${team}, ${stage.title}, вопрос ${questionIndex + 1}`;
  const filledClass = value ? " filled" : "";
  const clearButton = value
    ? `<span class="inline-clear popup-cell-clear" data-inline-score="0" aria-label="Удалить баллы">×</span>`
    : "";

  return `
    <td>
      <div
        class="score-cell${filledClass}"
        data-team="${team}"
        data-stage="${stage.id}"
        data-question="${questionIndex}"
        aria-label="${label}"
      >
        ${clearButton}
        <span class="score-number">${value || ""}</span>
      </div>
    </td>
  `;
}

function renderHead() {
  if (activeView !== "all") {
    const stage = stages.find((item) => item.id === activeView);
    const stageIndex = stages.findIndex((item) => item.id === activeView);
    const previousStage = stages[stageIndex - 1];
    const nextStage = stages[stageIndex + 1];
    headNode.innerHTML = `
      <tr>
        <th rowspan="2" class="team-head">Команда</th>
        <th colspan="4" class="stage-head">
          <div class="stage-nav">
            <button
              class="stage-nav-button"
              data-stage-nav="${previousStage?.id || ""}"
              type="button"
              aria-label="Предыдущий этап"
              ${previousStage ? "" : "disabled"}
            >‹</button>
            <span>${stage.title}</span>
            <button
              class="stage-nav-button"
              data-stage-nav="${nextStage?.id || ""}"
              type="button"
              aria-label="Следующий этап"
              ${nextStage ? "" : "disabled"}
            >›</button>
          </div>
        </th>
        <th rowspan="2" class="game-total-head">Общий балл</th>
      </tr>
      <tr>
        <th>Вопрос 1</th>
        <th>Вопрос 2</th>
        <th>Вопрос 3</th>
        <th class="stage-total-head">Итого этап</th>
      </tr>
    `;
    return;
  }

  const stageHeaders = stages.map((stage) => `<th colspan="4" class="stage-head">${stage.title}</th>`).join("");
  const questionHeaders = stages
    .map(
      () => `
        <th>В1</th>
        <th>В2</th>
        <th>В3</th>
        <th class="stage-total-head">Итого этап</th>
      `,
    )
    .join("");

  headNode.innerHTML = `
    <tr>
      <th rowspan="2" class="team-head">Команда</th>
      ${stageHeaders}
      <th rowspan="2" class="game-total-head">Общий балл</th>
    </tr>
    <tr>${questionHeaders}</tr>
  `;
}

function renderRows() {
  document.querySelector(".score-table").classList.toggle("stage-view", activeView !== "all");
  document.querySelector(".score-table").classList.toggle("all-view", activeView === "all");

  if (activeView !== "all") {
    const stage = stages.find((item) => item.id === activeView);
    rowsNode.innerHTML = teams
      .map((team) => {
        const questionCells = questions
          .map((questionIndex) => renderStageScoreCell(team, stage, questionIndex))
          .join("");

        return `
          <tr>
            <th class="team-cell" scope="row"><button class="team-rule-button" data-team-rule="${team}" type="button">${team}${renderTeamModifier(team)}</button></th>
            ${questionCells}
            <td class="total-cell">${stageTotal(team, stage.id)}</td>
            <td class="game-total-cell">${gameTotal(team)}</td>
          </tr>
        `;
      })
      .join("");
    return;
  }

  rowsNode.innerHTML = teams
    .map((team) => {
      const stageCells = stages
        .map((stage) => {
          const questionCells = questions
            .map((questionIndex) => renderPopupScoreCell(team, stage, questionIndex))
            .join("");

          return `
            ${questionCells}
            <td class="total-cell">${stageTotal(team, stage.id)}</td>
          `;
        })
        .join("");

      return `
        <tr>
          <th class="team-cell" scope="row"><button class="team-rule-button" data-team-rule="${team}" type="button">${team}${renderTeamModifier(team)}</button></th>
          ${stageCells}
          <td class="game-total-cell">${gameTotal(team)}</td>
        </tr>
      `;
    })
    .join("");
}

function renderTeamModifier(team) {
  const modifier = teamModifiers[team];
  return modifier ? `<span>${modifier}</span>` : "";
}

function render() {
  renderHead();
  renderRows();
  viewButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === activeView);
  });
  fortuneOpenButton.classList.toggle("active", activeScreen === "fortune");
}

function renderFortuneWheel() {
  if (!fortuneRules.length) {
    fortuneWheel.innerHTML = `<div class="fortune-empty-wheel"></div>`;
    fortuneSpinButton.disabled = true;
    renderFortuneRuleEditor();
    return;
  }

  const sliceSize = 360 / fortuneRules.length;
  const slices = fortuneRules
    .map((rule, index) => {
      const startAngle = -90 + index * sliceSize;
      const endAngle = startAngle + sliceSize;
      const labelAngle = startAngle + sliceSize / 2;
      const labelStart = polarPoint(50, 50, 45, labelAngle);
      return `
        <g class="fortune-slice">
          <path d="${fortuneSlicePath(50, 50, 50, startAngle, endAngle)}" fill="${fortuneColors[index % fortuneColors.length]}"></path>
          <foreignObject
            x="${labelStart.x}"
            y="${labelStart.y - 3.6}"
            width="25"
            height="7.2"
            transform="rotate(${labelAngle + 180} ${labelStart.x} ${labelStart.y})"
          >
            <div xmlns="http://www.w3.org/1999/xhtml" class="fortune-label-box">${escapeHtml(rule.text)}</div>
          </foreignObject>
        </g>
      `;
    })
    .join("");
  fortuneWheel.innerHTML = `
    <svg class="fortune-wheel-svg" viewBox="0 0 100 100" aria-hidden="true">
      ${slices}
      <circle class="fortune-inner-ring" cx="50" cy="50" r="19"></circle>
    </svg>
  `;

  renderFortuneRuleEditor();
  fortuneSpinButton.disabled = isWheelSpinning;
}

function polarPoint(cx, cy, radius, angle) {
  const radians = angle * Math.PI / 180;
  return {
    x: cx + Math.cos(radians) * radius,
    y: cy + Math.sin(radians) * radius,
  };
}

function fortuneSlicePath(cx, cy, radius, startAngle, endAngle) {
  const start = polarPoint(cx, cy, radius, startAngle);
  const end = polarPoint(cx, cy, radius, endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
}

function renderFortuneRuleEditor() {
  if (!fortuneRuleBank.length) {
    fortuneRulesNode.innerHTML = `<div class="fortune-rules-empty">Правил пока нет</div>`;
    return;
  }

  fortuneRulesNode.innerHTML = fortuneRuleBank
    .map(
      (rule, index) => `
        <div class="fortune-rule-row">
          <span class="fortune-rule-number">${index + 1}</span>
          <input class="fortune-rule-input" data-rule-id="${rule.id}" value="${escapeHtml(rule.text)}">
          <button class="fortune-rule-delete" data-delete-rule="${rule.id}" type="button" aria-label="Удалить правило">×</button>
        </div>
      `,
    )
    .join("");
}

function renderFortuneHistory() {
  fortuneHistoryNode.innerHTML = fortuneHistory
    .map((item, index) => `<li><span>${index + 1}</span>${escapeHtml(item)}</li>`)
    .join("");
}

function showFortuneScreen() {
  activeScreen = "fortune";
  hidePopover();
  timerCard.hidden = true;
  scoreBoard.hidden = true;
  fortuneScreen.hidden = false;
  render();
  closeViewMenu();
}

function showScoreboardScreen() {
  activeScreen = "scoreboard";
  hideFortuneRulesModal();
  fortuneScreen.hidden = true;
  timerCard.hidden = false;
  scoreBoard.hidden = false;
  render();
  closeViewMenu();
}

function showFortuneRulesModal() {
  fortuneRulesModal.hidden = false;
  const firstInput = fortuneRulesModal.querySelector(".fortune-rule-input");
  if (firstInput) firstInput.focus();
}

function hideFortuneRulesModal() {
  fortuneRulesModal.hidden = true;
}

function spinFortuneWheel() {
  if (isWheelSpinning || !fortuneRules.length) return;

  isWheelSpinning = true;
  fortuneSpinButton.disabled = true;
  fortuneResultNode.textContent = "Колесо крутится...";

  const targetIndex = Math.floor(Math.random() * fortuneRules.length);
  const sliceSize = 360 / fortuneRules.length;
  const currentNormalized = ((wheelRotation % 360) + 360) % 360;
  const targetNormalized = (360 - targetIndex * sliceSize - sliceSize / 2 + 360) % 360;
  const extraTurns = 5 * 360;
  const travel = (targetNormalized - currentNormalized + 360) % 360;
  wheelRotation += extraTurns + travel;
  fortuneWheel.style.transform = `rotate(${wheelRotation}deg)`;

  window.setTimeout(() => {
    const selectedRule = fortuneRules[targetIndex];
    isWheelSpinning = false;
    fortuneResultNode.textContent = selectedRule.text;
    fortuneHistory.push(selectedRule.text);
    fortuneRules.splice(targetIndex, 1);
    renderFortuneWheel();
    renderFortuneHistory();
    if (!fortuneRules.length) {
      fortuneResultNode.textContent = `${selectedRule.text} — правила закончились`;
    }
  }, 4700);
}

function resetFortuneSpins() {
  if (isWheelSpinning) return;

  fortuneRules = [...fortuneRuleBank];
  fortuneHistory = [];
  wheelRotation = 0;
  fortuneWheel.style.transition = "none";
  fortuneWheel.style.transform = "rotate(0deg)";
  fortuneWheel.offsetHeight;
  fortuneWheel.style.transition = "";
  fortuneResultNode.textContent = fortuneRules.length ? "Готово к прокрутке" : "Добавьте правила";
  renderFortuneWheel();
  renderFortuneHistory();
}

function showPopover(button) {
  selectedCell = {
    team: button.dataset.team,
    stage: button.dataset.stage,
    question: Number(button.dataset.question),
  };

  document.querySelectorAll(".score-cell").forEach((cell) => cell.classList.remove("selected"));
  button.classList.add("selected");

  const stage = stages.find((item) => item.id === selectedCell.stage);
  popoverTitleNode.textContent = `${selectedCell.team} • ${stage.title} • Вопрос ${selectedCell.question + 1}`;
  customScoreInput.value = scores[selectedCell.team][selectedCell.stage][selectedCell.question] || "";
  popoverNode.hidden = false;

  const buttonRect = button.getBoundingClientRect();
  const shellRect = document.querySelector(".game-shell").getBoundingClientRect();
  const popoverWidth = 250;
  const popoverHeight = popoverNode.offsetHeight;
  const left = Math.min(
    Math.max(buttonRect.left - shellRect.left, 8),
    shellRect.width - popoverWidth - 8,
  );
  const belowTop = buttonRect.bottom - shellRect.top + 8;
  const aboveTop = buttonRect.top - shellRect.top - popoverHeight - 8;
  const hasSpaceBelow = buttonRect.bottom + popoverHeight + 8 <= window.innerHeight;
  const top = hasSpaceBelow ? belowTop : Math.max(8, aboveTop);

  popoverNode.style.left = `${left}px`;
  popoverNode.style.top = `${top}px`;
}

function showTeamRulePopover(button) {
  selectedTeam = button.dataset.teamRule;
  teamRuleTitleNode.textContent = `${selectedTeam} • правило начисления`;
  customModifierInput.value = teamModifiers[selectedTeam] || "";
  teamRulePopoverNode.hidden = false;

  const buttonRect = button.getBoundingClientRect();
  const shellRect = document.querySelector(".game-shell").getBoundingClientRect();
  const popoverWidth = 250;
  const popoverHeight = teamRulePopoverNode.offsetHeight;
  const left = Math.min(
    Math.max(buttonRect.left - shellRect.left, 8),
    shellRect.width - popoverWidth - 8,
  );
  const belowTop = buttonRect.bottom - shellRect.top + 8;
  const aboveTop = buttonRect.top - shellRect.top - popoverHeight - 8;
  const hasSpaceBelow = buttonRect.bottom + popoverHeight + 8 <= window.innerHeight;
  const top = hasSpaceBelow ? belowTop : Math.max(8, aboveTop);

  teamRulePopoverNode.style.left = `${left}px`;
  teamRulePopoverNode.style.top = `${top}px`;
}

function hidePopover() {
  selectedCell = null;
  popoverNode.hidden = true;
  selectedTeam = null;
  teamRulePopoverNode.hidden = true;
  document.querySelectorAll(".score-cell").forEach((cell) => cell.classList.remove("selected"));
}

function setSelectedScore(points) {
  if (!selectedCell) return;

  scores[selectedCell.team][selectedCell.stage][selectedCell.question] = applyTeamModifier(selectedCell.team, points);
  hidePopover();
  renderRows();
}

function setScore(team, stage, question, points, useModifier = true) {
  scores[team][stage][question] = useModifier ? applyTeamModifier(team, points) : Math.max(0, points);
  hidePopover();
  renderRows();
}

function clearTable() {
  scores = createEmptyScores();
  teamModifiers = Object.fromEntries(teams.map((team) => [team, 0]));
  hidePopover();
  renderRows();
}

function closeViewMenu() {
  viewMenu.classList.remove("pinned");
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}

function renderTimer() {
  const minutes = String(Math.floor(timerLeft / 60)).padStart(2, "0");
  const seconds = String(timerLeft % 60).padStart(2, "0");
  timerDisplayNode.textContent = `${minutes}:${seconds}`;
  timerCard.classList.toggle("warning", Boolean(timerId) && timerLeft <= 10 && timerLeft > 0);

  timerButtons.forEach((button) => {
    const isActive = button === activeTimerButton;
    button.classList.toggle("running", isActive);
    button.textContent = isActive ? "×" : `${button.dataset.timerButton} c`;
    button.setAttribute("aria-label", isActive ? "Сбросить таймер" : `Запустить таймер ${button.dataset.timerButton} секунд`);
  });
}

function startTimer(seconds, button) {
  pauseTimer(false);
  timerDuration = seconds;
  timerLeft = seconds;
  activeTimerButton = button;

  timerId = window.setInterval(() => {
    timerLeft -= 1;
    if (timerLeft <= 0) {
      timerLeft = 0;
      pauseTimer(true);
    }
    renderTimer();
  }, 1000);

  renderTimer();
}

function pauseTimer(clearButton) {
  window.clearInterval(timerId);
  timerId = null;
  if (clearButton) {
    activeTimerButton = null;
  }
  renderTimer();
}

function resetActiveTimer() {
  pauseTimer(true);
  timerLeft = timerDuration;
  renderTimer();
}

rowsNode.addEventListener("click", (event) => {
  const teamButton = event.target.closest("[data-team-rule]");
  if (teamButton) {
    hidePopover();
    showTeamRulePopover(teamButton);
    return;
  }

  const customButton = event.target.closest("[data-custom-score]");
  if (customButton) {
    const cell = customButton.closest(".score-cell");
    showPopover(cell);
    customScoreInput.focus();
    return;
  }

  const inlineButton = event.target.closest("[data-inline-score]");
  if (inlineButton) {
    const cell = inlineButton.closest(".score-cell");
    const points = Number(inlineButton.dataset.inlineScore);
    setScore(
      cell.dataset.team,
      cell.dataset.stage,
      Number(cell.dataset.question),
      points,
      points !== 0,
    );
    return;
  }

  if (activeView !== "all") return;

  const button = event.target.closest(".score-cell");
  if (!button) return;

  showPopover(button);
});

headNode.addEventListener("click", (event) => {
  const button = event.target.closest("[data-stage-nav]");
  if (!button || !button.dataset.stageNav) return;

  activeView = button.dataset.stageNav;
  hidePopover();
  render();
});

popoverNode.addEventListener("click", (event) => {
  const button = event.target.closest("[data-set-score]");
  if (!button) return;

  setSelectedScore(Number(button.dataset.setScore));
});

teamRulePopoverNode.addEventListener("click", (event) => {
  const button = event.target.closest("[data-team-modifier]");
  if (!button || !selectedTeam) return;

  teamModifiers[selectedTeam] = Number(button.dataset.teamModifier);
  hidePopover();
  renderRows();
});

customScoreForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!selectedCell) return;

  setScore(
    selectedCell.team,
    selectedCell.stage,
    selectedCell.question,
    Number(customScoreInput.value || 0),
    false,
  );
});

customModifierForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!selectedTeam) return;

  teamModifiers[selectedTeam] = Number(customModifierInput.value || 0);
  hidePopover();
  renderRows();
});

document.addEventListener("click", (event) => {
  if (
    event.target.closest(".score-cell") ||
    event.target.closest("#scorePopover") ||
    event.target.closest("#teamRulePopover") ||
    event.target.closest("[data-team-rule]")
  ) {
    return;
  }
  hidePopover();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  hidePopover();
  hideFortuneRulesModal();
});

timerButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button === activeTimerButton) {
      resetActiveTimer();
    } else {
      startTimer(Number(button.dataset.timerButton), button);
    }
  });
});

clearTableButton.addEventListener("click", () => {
  clearTable();
  closeViewMenu();
});

viewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeView = button.dataset.view;
    hidePopover();
    if (activeScreen === "fortune") {
      showScoreboardScreen();
      return;
    }
    render();
    closeViewMenu();
  });
});

menuTrigger.addEventListener("click", () => viewMenu.classList.toggle("pinned"));

fortuneOpenButton.addEventListener("click", showFortuneScreen);
fortuneBackButton.addEventListener("click", showScoreboardScreen);
fortuneSpinButton.addEventListener("click", spinFortuneWheel);
fortuneRulesOpenButton.addEventListener("click", showFortuneRulesModal);
fortuneRulesCloseButton.addEventListener("click", hideFortuneRulesModal);
fortuneRulesDoneButton.addEventListener("click", hideFortuneRulesModal);
fortuneResetButton.addEventListener("click", resetFortuneSpins);
fortuneRuleAddButton.addEventListener("click", () => {
  if (isWheelSpinning) return;

  const rule = createFortuneRule("Новое правило");
  fortuneRuleBank.push(rule);
  fortuneRules.push(rule);
  renderFortuneWheel();
  const inputs = fortuneRulesNode.querySelectorAll(".fortune-rule-input");
  const lastInput = inputs[inputs.length - 1];
  if (lastInput) {
    lastInput.focus();
    lastInput.select();
  }
});

fortuneRulesModal.addEventListener("click", (event) => {
  if (event.target === fortuneRulesModal) hideFortuneRulesModal();
});

fortuneRulesNode.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-delete-rule]");
  if (!deleteButton) return;
  if (isWheelSpinning) return;

  const ruleId = Number(deleteButton.dataset.deleteRule);
  fortuneRuleBank = fortuneRuleBank.filter((rule) => rule.id !== ruleId);
  fortuneRules = fortuneRules.filter((rule) => rule.id !== ruleId);
  fortuneResultNode.textContent = fortuneRules.length ? fortuneResultNode.textContent : "Добавьте правила";
  renderFortuneWheel();
});

fortuneRulesNode.addEventListener("input", (event) => {
  const input = event.target.closest("[data-rule-id]");
  if (!input) return;
  if (isWheelSpinning) return;

  const ruleId = Number(input.dataset.ruleId);
  const rule = fortuneRuleBank.find((item) => item.id === ruleId);
  if (!rule) return;

  rule.text = input.value || "Пустое правило";
  const activeIndex = fortuneRules.findIndex((item) => item.id === ruleId);
  const label = fortuneWheel.querySelectorAll(".fortune-label")[activeIndex];
  if (label) {
    label.title = rule.text;
    const labelText = label.querySelector(".fortune-label-text");
    if (labelText) labelText.textContent = rule.text;
  }
});

tableWrap.addEventListener(
  "wheel",
  (event) => {
    if (activeView !== "all" || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

    const maxScrollLeft = tableWrap.scrollWidth - tableWrap.clientWidth;
    if (maxScrollLeft <= 0) return;

    const nextScrollLeft = Math.min(
      Math.max(tableWrap.scrollLeft + event.deltaY, 0),
      maxScrollLeft,
    );
    if (nextScrollLeft === tableWrap.scrollLeft) return;

    event.preventDefault();
    tableWrap.scrollLeft = nextScrollLeft;
  },
  { passive: false },
);

render();
renderFortuneWheel();
renderFortuneHistory();
renderTimer();
