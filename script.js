const chatBox = document.getElementById("chatBox");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const emptyState = document.getElementById("emptyState");

let messages = [];
let loading = false;

function addBubble(role, text) {
  const row = document.createElement("div");
  row.className = `bubble-row ${role}`;

  const bubble = document.createElement("div");
  bubble.className = `bubble ${role}`;
  bubble.textContent = text;

  row.appendChild(bubble);
  chatBox.appendChild(row);
  chatBox.scrollTop = chatBox.scrollHeight;
  return row;
}

function showError(text) {
  const p = document.createElement("p");
  p.className = "error-text";
  p.textContent = text;
  chatBox.appendChild(p);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function setLoading(state) {
  loading = state;
  sendBtn.disabled = state;
  chatInput.disabled = state;
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text || loading) return;

  if (emptyState) emptyState.remove();

  messages.push({ role: "user", content: text });
  addBubble("user", text);
  chatInput.value = "";
  setLoading(true);

  const typingRow = addBubble("assistant", "Mengetik...");

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    const data = await res.json();
    typingRow.remove();

    if (!res.ok) {
      showError(data.error || "Terjadi kesalahan.");
    } else {
      messages.push({ role: "assistant", content: data.reply });
      addBubble("assistant", data.reply);
    }
  } catch (err) {
    typingRow.remove();
    showError("Gagal menghubungi server: " + err.message);
  } finally {
    setLoading(false);
    chatInput.focus();
  }
});
