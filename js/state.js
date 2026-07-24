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

  function getTodayItems() {
    const t = today();
    const results = [];

    for (const cat of _state.categories) {
      const items = _state.items[cat.id] || [];
      const schema = cat.schema || [];

      for (const item of items) {
        // Check for deadline fields
        for (const field of schema) {
          if (field.type === 'date' && item.data[field.key]) {
            const itemDate = item.data[field.key];
            if (itemDate === t) {
              results.push({ item, category: cat, field, type: 'today' });
            } else if (itemDate < t && !item.data.done) {
              results.push({ item, category: cat, field, type: 'overdue' });
            } else if (itemDate > t && itemDate <= _addDays(t, 3)) {
              results.push({ item, category: cat, field, type: 'upcoming' });
            }
          }
        }

        // Check checkbox (done) status for tasks
        if (cat.is_builtin && cat.name === 'Tasks') {
          if (!item.data.done && item.data.deadline) {
            if (item.data.deadline === t) {
              results.push({ item, category: cat, type: 'task-today' });
            }
          }
        }
      }
    }

    return results;
  }

  function _addDays(dateStr, days) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function daysUntil(dateStr) {
    const now = new Date(today());
    const target = new Date(dateStr);
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  }

  return { get, set, on, getCategory, getCategoryItems, today, getTodayItems, daysUntil };
})();
