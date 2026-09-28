const display = document.getElementById('display');
const keys = document.getElementById('keys');
const historyList = document.getElementById('history');
const errorBox = document.getElementById('error');
const statusBox = document.getElementById('status');
let expression = '';

function show(value) { display.textContent = value || '0'; }
function setError(message = '') { errorBox.textContent = message; }
function addValue(value) {
  if (value === '.' && /(?:^|[+\-*/%])\d*\.\d*$/.test(expression.split(/[+\-*/%]/).pop())) return;
  if (/[+\-*/%]/.test(value) && /[+\-*/%]$/.test(expression) && value !== '-') expression = expression.slice(0, -1);
  expression += value;
  show(expression);
  setError();
}
function clearAll() { expression = ''; show('0'); setError(); }
function backspace() { expression = expression.slice(0, -1); show(expression); }

async function calculate() {
  if (!expression.trim()) return;
  setError();
  try {
    const response = await fetch('/api/calculate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expression }) });
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || '计算失败');
    expression = String(body.result);
    show(expression);
    await loadHistory();
  } catch (error) {
    setError(error.message);
    statusBox.textContent = 'API error';
    statusBox.classList.add('offline');
  }
}

async function loadHistory() {
  try {
    const response = await fetch('/api/history');
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || '历史记录读取失败');
    statusBox.textContent = 'API ready';
    statusBox.classList.remove('offline');
    renderHistory(body.history);
  } catch (error) {
    statusBox.textContent = 'API offline';
    statusBox.classList.add('offline');
    renderHistory([]);
  }
}

function renderHistory(records) {
  if (!records.length) { historyList.innerHTML = '<p class="empty">暂无记录</p>'; return; }
  historyList.innerHTML = records.map((record) => `
    <div class="record">
      <div class="record-main"><span class="record-expression">${escapeHtml(record.expression)}</span><span class="record-result">${record.result}</span></div>
      <div class="record-meta"><span>${formatTime(record.created_at)}</span><button class="delete-record" data-id="${record.id}">删除</button></div>
    </div>`).join('');
}

function escapeHtml(value) { return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char])); }
function formatTime(value) { return value ? value.replace('T', ' ').replace('Z', '') : ''; }

keys.addEventListener('click', (event) => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.dataset.action === 'clear') clearAll();
  else if (button.dataset.action === 'backspace') backspace();
  else if (button.dataset.action === 'equals') calculate();
  else addValue(button.dataset.value);
});

historyList.addEventListener('click', async (event) => {
  const button = event.target.closest('.delete-record'); if (!button) return;
  await fetch(`/api/history/${button.dataset.id}`, { method: 'DELETE' });
  await loadHistory();
});

document.getElementById('clearHistory').addEventListener('click', async () => {
  await fetch('/api/history', { method: 'DELETE' });
  await loadHistory();
});

document.addEventListener('keydown', (event) => {
  if (/\d/.test(event.key)) addValue(event.key);
  else if ('+-*/%.()'.includes(event.key)) addValue(event.key);
  else if (event.key === 'Enter' || event.key === '=') calculate();
  else if (event.key === 'Backspace') backspace();
  else if (event.key === 'Escape') clearAll();
});

loadHistory();
