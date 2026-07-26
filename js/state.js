/* ============================================
   Life OS — State Management
   ============================================ */

const State = (() => {
  const _state = {
    user: null,
    categories: [],
    items: {},         // { categoryId: [items] }
    habitLogs: {},     // { itemId: { 'YYYY-MM-DD': {done} } }
    widgetLayout: [],
    currentPage: 'home',
    loading: true,
  };

  const _listeners = {};

  function get(key) {
    return key ? _state[key] : { ..._state };
  }

  function set(key, value) {
    _state[key] = value;
    _emit(key, value);
  }

  function on(key, callback) {
    if (!_listeners[key]) _listeners[key] = [];
    _listeners[key].push(callback);
    return () => {
      _listeners[key] = _listeners[key].filter(cb => cb !== callback);
    };
  }

  function _emit(key, value) {
    (_listeners[key] || []).forEach(cb => cb(value));
    (_listeners['*'] || []).forEach(cb => cb(key, value));
  }

  // Helpers
  function getCategory(id) {
    return _state.categories.find(c => c.id === id);
  }

  function getCategoryItems(categoryId) {
    return _state.items[categoryId] || [];
  }

  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function daysUntil(dateStr) {
    const now = new Date(today());
    const target = new Date(dateStr);
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  }

  return { get, set, on, getCategory, getCategoryItems, today, daysUntil };
})();

function _esc(str) {
  if (typeof str !== 'string') return str || '';
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}
