const STORAGE_KEY = 'oneday.todos.v1';
const els = {
  form: document.getElementById('add-form'),
  input: document.getElementById('new-todo'),
  list: document.getElementById('todo-list'),
  itemsLeft: document.getElementById('items-left'),
  clearCompleted: document.getElementById('clear-completed'),
  filters: Array.from(document.querySelectorAll('.filter-btn')),
  installBtn: document.getElementById('install-btn'),
};

let state = {
  todos: [],
  filter: 'all', // 'all' | 'active' | 'completed'
};

// --- storage ---
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.todos));
}

// --- utils ---
function uid() {
  return (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function itemsLeftCount() {
  return state.todos.filter(t => !t.completed).length;
}
function setFilter(f) {
  state.filter = f;
  els.filters.forEach(btn => {
    const active = btn.dataset.filter === f;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', String(active));
  });
}

// --- render ---
function render() {
  els.list.innerHTML = '';
  const filtered = state.todos.filter(t => {
    if (state.filter === 'active') return !t.completed;
    if (state.filter === 'completed') return t.completed;
    return true;
  });

  for (const todo of filtered) {
    const li = document.createElement('li');
    li.className = `todo-item${todo.completed ? ' completed' : ''}`;
    li.dataset.id = todo.id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'toggle';
    checkbox.checked = todo.completed;
    checkbox.setAttribute('aria-label', '切换完成状态');

    const text = document.createElement('span');
    text.className = 'text';
    text.textContent = todo.text;
    text.setAttribute('role', 'textbox');
    text.setAttribute('aria-label', '编辑待办内容');

    const del = document.createElement('button');
    del.className = 'delete-btn';
    del.textContent = '删除';
    del.setAttribute('aria-label', '删除待办');

    li.appendChild(checkbox);
    li.appendChild(text);
    li.appendChild(del);

    els.list.appendChild(li);
  }

  els.itemsLeft.textContent = `${itemsLeftCount()} 项未完成`;
}

// --- actions ---
function addTodo(text) {
  const v = text.trim();
  if (!v) return;
  state.todos.push({ id: uid(), text: v, completed: false });
  save();
  render();
}
function toggleTodo(id, checked) {
  const t = state.todos.find(t => t.id === id);
  if (!t) return;
  t.completed = !!checked;
  save();
  render();
}
function deleteTodo(id) {
  state.todos = state.todos.filter(t => t.id !== id);
  save();
  render();
}
function updateTodoText(id, text) {
  const v = text.trim();
  if (!v) return; // 保留原值，不保存空文本
  const t = state.todos.find(t => t.id === id);
  if (!t) return;
  t.text = v;
  save();
  render();
}
function clearCompleted() {
  state.todos = state.todos.filter(t => !t.completed);
  save();
  render();
}

// --- editing helpers ---
function startEdit(span) {
  const li = span.closest('.todo-item');
  if (!li) return;
  li.classList.add('editing');
  span.contentEditable = 'true';
  const range = document.createRange();
  range.selectNodeContents(span);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}
function endEdit(span, commit) {
  const li = span.closest('.todo-item');
  if (!li) return;
  const id = li.dataset.id;
  span.contentEditable = 'false';
  li.classList.remove('editing');
  if (commit) updateTodoText(id, span.textContent || '');
}

// --- event bindings ---
els.form.addEventListener('submit', (e) => {
  e.preventDefault();
  addTodo(els.input.value);
  els.input.value = '';
  els.input.focus();
});

els.filters.forEach(btn => {
  btn.addEventListener('click', () => {
    setFilter(btn.dataset.filter);
    render();
  });
});

els.clearCompleted.addEventListener('click', () => clearCompleted());

// 事件委托：列表交互
els.list.addEventListener('click', (e) => {
  const target = e.target;
  const li = target.closest('.todo-item');
  if (!li) return;
  const id = li.dataset.id;

  if (target.classList.contains('toggle')) {
    toggleTodo(id, target.checked);
  } else if (target.classList.contains('delete-btn')) {
    deleteTodo(id);
  }
});

els.list.addEventListener('dblclick', (e) => {
  const span = e.target.closest('.text');
  if (!span) return;
  startEdit(span);
});

els.list.addEventListener('keydown', (e) => {
  const span = e.target.closest('.text');
  if (!span) return;
  if (e.key === 'Enter') {
    e.preventDefault();
    endEdit(span, true);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    endEdit(span, false);
  }
});

els.list.addEventListener('blur', (e) => {
  const span = e.target.closest('.text');
  if (!span) return;
  endEdit(span, true);
}, true);

// --- PWA 安装 ---
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (els.installBtn) {
    els.installBtn.style.display = 'inline-block';
    els.installBtn.disabled = false;
  }
});

if (els.installBtn) {
  els.installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    els.installBtn.disabled = true;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    els.installBtn.style.display = 'none';
    // 可根据 choice.outcome === 'accepted' 做埋点
  });
}

window.addEventListener('appinstalled', () => {
  if (els.installBtn) {
    els.installBtn.style.display = 'none';
  }
});

// --- init ---
state.todos = load();
setFilter('all');
render();