document.addEventListener("DOMContentLoaded", function () {
  const companySelect = document.getElementById("companySelect");
  const typeSelect = document.getElementById("typeSelect");
  const startBtn = document.getElementById("startBtn");
  const setupPanel = document.getElementById("setupPanel");
  const chatBox = document.getElementById("chatBox");
  const chatLog = document.getElementById("chatLog");
  const chatTitle = document.getElementById("chatTitle");
  const chatProgress = document.getElementById("chatProgress");
  const endBtn = document.getElementById("endBtn");
  const answerInput = document.getElementById("answerInput");
  const sendBtn = document.getElementById("sendBtn");

  let session = null;

  const param = new URLSearchParams(location.search).get("company");
  if (param && COMPANIES[param]) {
    companySelect.value = param;
    startSession();
  }

  startBtn.addEventListener("click", startSession);
  endBtn.addEventListener("click", endSession);
  sendBtn.addEventListener("click", send);
  answerInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });

  function startSession() {
    const id = companySelect.value;
    const type = typeSelect.value;
    if (!id || !COMPANIES[id]) return;
    const c = COMPANIES[id];
    const queue = c.questions.filter(function (q) {
      return type === "all" || q.t === type;
    });
    if (!queue.length) return;
    session = { id: id, name: c.name, queue: queue, idx: 0, busy: false };
    chatLog.innerHTML = "";
    chatTitle.textContent = c.name + " · 1:1 모의 면접";
    updateProgress();
    setupPanel.style.display = "none";
    chatBox.style.display = "flex";
    addBot(c.intro);
    setTimeout(askNext, 600);
  }

  function endSession() {
    session = null;
    chatBox.style.display = "none";
    setupPanel.style.display = "flex";
    answerInput.value = "";
  }

  function askNext() {
    if (!session) return;
    updateProgress();
    addBot("[질문 " + (session.idx + 1) + " / " + session.queue.length + " · " + session.queue[session.idx].t + "면접]\n" + session.queue[session.idx].q);
    session.busy = false;
    answerInput.disabled = false;
    sendBtn.disabled = false;
    answerInput.focus();
  }

  function send() {
    if (!session || session.busy) return;
    const text = answerInput.value.trim();
    if (!text) return;
    addUser(text);
    answerInput.value = "";
    session.busy = true;
    answerInput.disabled = true;
    sendBtn.disabled = true;
    const current = session.queue[session.idx];
    setTimeout(function () {
      if (!session) return;
      addTip("📌 모범답변 포인트\n" + current.tip);
      session.idx++;
      setTimeout(function () {
        if (!session) return;
        if (session.idx >= session.queue.length) {
          finish();
        } else {
          askNext();
        }
      }, 1200);
    }, 500);
  }

  function finish() {
    updateProgress();
    addBot("🎉 수고하셨습니다! " + session.queue.length + "개 질문이 모두 끝났습니다.\n\n방금 드린 '모범답변 포인트'를 다시 읽어보고, 각 답변을 목소리 내어 연습해 보세요. '종료' 버튼을 누르면 다른 회사·유형으로 다시 연습할 수 있습니다.");
    session.busy = true;
  }

  function updateProgress() {
    if (!session) return;
    chatProgress.textContent = session.idx + " / " + session.queue.length;
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
