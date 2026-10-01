document.addEventListener("DOMContentLoaded", function () {
  const companySelect = document.getElementById("companySelect");
  const typeSelect = document.getElementById("typeSelect");
  const roleSelect = document.getElementById("roleSelect");
  const levelSelect = document.getElementById("levelSelect");
  const countSelect = document.getElementById("countSelect");
  const orderSelect = document.getElementById("orderSelect");
  const followupSelect = document.getElementById("followupSelect");
  const questionAvailability = document.getElementById("questionAvailability");
  const startBtn = document.getElementById("startBtn");
  const retryBtn = document.getElementById("retryBtn");
  const retryWrap = document.getElementById("retryWrap");
  const setupPanel = document.getElementById("setupPanel");
  const chatBox = document.getElementById("chatBox");
  const chatLog = document.getElementById("chatLog");
  const chatTitle = document.getElementById("chatTitle");
  const chatProgress = document.getElementById("chatProgress");
  const endBtn = document.getElementById("endBtn");
  const answerInput = document.getElementById("answerInput");
  const sendBtn = document.getElementById("sendBtn");

  let session = null;

  [companySelect, typeSelect, roleSelect, levelSelect, countSelect, followupSelect].forEach(function (control) {
    control.addEventListener("change", updateAvailability);
  });
  orderSelect.addEventListener("change", updateAvailability);

  const param = new URLSearchParams(location.search).get("company");
  if (param && COMPANIES[param]) companySelect.value = param;
  updateAvailability();

  startBtn.addEventListener("click", startSession);
  retryBtn.addEventListener("click", startSession);
  endBtn.addEventListener("click", endSession);
  sendBtn.addEventListener("click", send);
  answerInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
  if (param && COMPANIES[param]) startSession();

  function getQuestionSets() {
    const company = COMPANIES[companySelect.value];
    if (!company) return { company: [], focused: [] };

    const type = typeSelect.value;
    const role = roleSelect.value;
    const level = levelSelect.value;
    const companyQuestions = company.questions
      .filter(function (question) {
        return type === "all" || question.t === type;
      })
      .map(function (question) {
        return Object.assign({ source: "company" }, question);
      });

    const roleKeys = role === "all" ? Object.keys(ROLE_QUESTION_BANK) : [role];
    const focusedQuestions = roleKeys.reduce(function (questions, key) {
      return questions.concat(ROLE_QUESTION_BANK[key] || []);
    }, []).filter(function (question) {
      return (type === "all" || question.t === type) && (level === "all" || question.level === level);
    }).map(function (question) {
      return Object.assign({ source: "role" }, question);
    });

    return { company: companyQuestions, focused: focusedQuestions };
  }

  function updateAvailability() {
    const sets = getQuestionSets();
    const available = sets.company.length + sets.focused.length;
    const requested = countSelect.value === "all" ? available : Math.min(Number(countSelect.value), available);
    const answerCount = requested * (followupSelect.checked ? 2 : 1);
    questionAvailability.textContent = "현재 조건: 질문 " + available + "개 중 " + requested + "개 출제 · " +
      (followupSelect.checked ? "꼬리질문 포함 최대 " + answerCount + "회 답변" : "꼬리질문 없이 " + answerCount + "회 답변");
  }

  function shuffle(list) {
    const result = list.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function makeQueue() {
    const sets = getQuestionSets();
    const allQuestions = sets.company.concat(sets.focused);
    const limit = countSelect.value === "all" ? allQuestions.length : Math.min(Number(countSelect.value), allQuestions.length);
    if (orderSelect.value === "sequential") {
      const ordered = [];
      const count = Math.max(sets.company.length, sets.focused.length);
      for (let i = 0; i < count; i++) {
        if (sets.company[i]) ordered.push(sets.company[i]);
        if (sets.focused[i]) ordered.push(sets.focused[i]);
      }
      return ordered.slice(0, limit);
    }
    if (limit >= allQuestions.length) return shuffle(allQuestions);

    // Keep company-specific questions represented, then randomize the remaining slots.
    const companyCount = Math.min(sets.company.length, limit, Math.max(2, Math.ceil(limit * 0.4)));
    const selectedCompany = shuffle(sets.company).slice(0, companyCount);
    const remaining = shuffle(sets.focused).slice(0, limit - selectedCompany.length);
    return shuffle(selectedCompany.concat(remaining));
  }

  function startSession() {
    const id = companySelect.value;
    if (!id || !COMPANIES[id]) return;
    const company = COMPANIES[id];
    const queue = makeQueue();
    if (!queue.length) return;

    session = {
      id: id,
      name: company.name,
      queue: queue,
      idx: 0,
      stage: "main",
      busy: false,
      followups: followupSelect.checked,
      answers: 0
    };
    chatLog.innerHTML = "";
    retryWrap.style.display = "none";
    chatTitle.textContent = company.name + " · " + roleSelect.options[roleSelect.selectedIndex].text + " 면접연습";
    updateProgress();
    setupPanel.style.display = "none";
    chatBox.style.display = "flex";
    answerInput.disabled = false;
    sendBtn.disabled = false;
    addBot(company.intro + "\n이번 연습은 " + queue.length + "문항" + (session.followups ? "과 문항별 꼬리질문" : "") + "으로 진행합니다.");
    setTimeout(askNext, 500);
  }

  function endSession() {
    session = null;
    chatBox.style.display = "none";
    setupPanel.style.display = "flex";
    retryWrap.style.display = "none";
    answerInput.value = "";
  }

  function askNext() {
    if (!session) return;
    const current = session.queue[session.idx];
    updateProgress();
    addBot("[질문 " + (session.idx + 1) + " / " + session.queue.length + " · " + current.t + "면접 · " +
      (current.level || "회사별") + "]\n" + current.q);
    session.stage = "main";
    enableAnswer();
  }

  function send() {
    if (!session || session.busy) return;
    const text = answerInput.value.trim();
    if (!text) return;

    const current = session.queue[session.idx];
    const isFollowup = session.stage === "followup";
    addUser(text);
    answerInput.value = "";
    session.busy = true;
    answerInput.disabled = true;
    sendBtn.disabled = true;
    session.answers++;

    setTimeout(function () {
      if (!session) return;
      addTip(buildFeedback(text, current, isFollowup));

      if (!isFollowup && session.followups) {
        session.stage = "followup";
        updateProgress();
        addBot("[꼬리질문 · 답변을 한 단계 더 구체화해 보세요]\n" + (current.followup || defaultFollowup(current)));
        enableAnswer();
        return;
      }

      session.idx++;
      session.stage = "main";
      setTimeout(function () {
        if (!session) return;
        if (session.idx >= session.queue.length) finish();
        else askNext();
      }, 500);
    }, 350);
  }

  function buildFeedback(text, question, isFollowup) {
    const answer = text.toLowerCase();
    const length = Array.from(text.trim()).length;
    const lines = ["📝 답변 셀프체크 (자동 채점이 아닌 연습용 체크입니다)"];

    if (length < 55) lines.push("• 구체성: 답변이 짧습니다. 결론에 실제 사례와 본인이 한 행동을 보태 보세요.");
    else if (length > 550) lines.push("• 전달력: 핵심이 묻힐 수 있습니다. 결론 → 행동 → 결과 순으로 압축해 보세요.");
    else lines.push("• 분량: " + length + "자입니다. 1분 안에 말할 수 있도록 핵심을 유지하세요.");

    if (question.checks && question.checks.length) {
      const passed = [];
      const missing = [];
      question.checks.forEach(function (check) {
        const found = check.terms.some(function (term) { return answer.includes(term.toLowerCase()); });
        (found ? passed : missing).push(check.label);
      });
      lines.push("• 직무 핵심어 점검: " + passed.length + " / " + question.checks.length + "개 항목에서 관련 표현이 확인됐습니다.");
      if (passed.length) lines.push("• 포함한 핵심: " + passed.join(", "));
      if (missing.length) lines.push("• 더 보완할 핵심: " + missing.join(", "));
    } else {
      const hasExample = /실습|경험|프로젝트|작업|수업|현장|동아리/.test(answer);
      const hasAction = /확인|점검|측정|보고|조치|기록|개선|제작|연습/.test(answer);
      const hasResult = /결과|완성|달성|개선|줄였|배웠|수치|mm|%/.test(answer);
      lines.push("• 경험 사례: " + (hasExample ? "사례 단서가 있습니다." : "실습·프로젝트 등 실제 경험을 하나 넣어 보세요."));
      lines.push("• 본인 행동: " + (hasAction ? "직접 한 행동을 언급했습니다." : "본인이 직접 확인·조치한 행동을 분명히 해 보세요."));
      lines.push("• 결과 근거: " + (hasResult ? "결과나 배운 점이 드러납니다." : "결과·수치·배운 점으로 마무리해 보세요."));
    }

    if (isFollowup) lines.push("• 꼬리질문 답변은 앞 답변과 모순되지 않는지, 본인 역할이 분명한지 다시 확인하세요.");
    else lines.push("• 다음 꼬리질문에서는 사례·판단 기준·결과 중 부족한 부분을 보완해 보세요.");
    lines.push("📌 준비 포인트: " + question.tip);
    return lines.join("\n");
  }

  function defaultFollowup(question) {
    if (question.t === "직무") {
      return "말씀하신 절차에서 가장 먼저 확인할 위험 또는 기준은 무엇인가요? 실제로 어떤 정보를 기록하고 누구에게 보고할지 순서대로 설명해 주세요.";
    }
    return "답변에서 말한 경험 하나를 골라 당시 상황, 본인이 직접 한 행동, 결과를 구체적으로 말해 주세요. 가능하면 수치나 주변의 피드백도 덧붙여 주세요.";
  }

  function enableAnswer() {
    if (!session) return;
    session.busy = false;
    answerInput.disabled = false;
    sendBtn.disabled = false;
    answerInput.focus();
  }

  function finish() {
    if (!session) return;
    session.idx = session.queue.length;
    updateProgress();
    addBot("🎉 연습을 마쳤습니다. 질문 " + session.queue.length + "개에 " + session.answers + "회 답변했습니다.\n\n셀프체크에서 보완할 항목을 골라 답변을 다시 정리해 보세요. 무작위 출제에서는 다시 시작할 때 질문 조합이 새로 바뀝니다.");
    session.busy = true;
    answerInput.disabled = true;
    sendBtn.disabled = true;
    retryWrap.style.display = "block";
  }

  function updateProgress() {
    if (!session) return;
    const current = Math.min(session.idx + 1, session.queue.length);
    chatProgress.textContent = current + " / " + session.queue.length + (session.stage === "followup" ? " · 꼬리질문" : "");
  }

  function scrollBottom() {
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function addBot(text) {
    const div = document.createElement("div");
    div.className = "msg bot";
    div.textContent = "면접관: " + text;
    chatLog.appendChild(div);
    scrollBottom();
  }

  function addUser(text) {
    const div = document.createElement("div");
    div.className = "msg user";
    div.textContent = text;
    chatLog.appendChild(div);
    scrollBottom();
  }

  function addTip(text) {
    const div = document.createElement("div");
    div.className = "msg tip";
    div.textContent = text;
    chatLog.appendChild(div);
    scrollBottom();
  }
});
