/* ============================================
   Life OS — Modal System
   ============================================ */

const Modal = (() => {
  let _overlay = null;
  let _onClose = null;

  function _ensureOverlay() {
    if (_overlay) return _overlay;
    _overlay = document.createElement('div');
    _overlay.className = 'modal-overlay';
    _overlay.innerHTML = '<div class="modal"></div>';
    _overlay.addEventListener('click', (e) => {
      if (e.target === _overlay) close();
    });
    document.body.appendChild(_overlay);
    return _overlay;
  }

  function open({ title, body, footer, onClose }) {
    _ensureOverlay();
    _onClose = onClose || null;

    const modal = _overlay.querySelector('.modal');
    modal.innerHTML = `
      <div class="modal-handle"></div>
      <div class="modal-header">
        <h3 class="modal-title">${title || ''}</h3>
        <button class="modal-close" onclick="Modal.close()">✕</button>
      </div>
      <div class="modal-body">${body || ''}</div>
      ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
    `;

    // Touch swipe down to close
    let startY = 0;
    const handle = modal.querySelector('.modal-handle');
    handle.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
    });
    handle.addEventListener('touchmove', (e) => {
      const diff = e.touches[0].clientY - startY;
      if (diff > 80) close();
    });

    requestAnimationFrame(() => {
      _overlay.classList.add('open');
    });

    // Focus first input
    setTimeout(() => {
      const firstInput = modal.querySelector('input, textarea, select');
      if (firstInput) firstInput.focus();
    }, 300);
  }

  function close() {
    if (!_overlay) return;
    _overlay.classList.remove('open');
    if (_onClose) _onClose();
    _onClose = null;
  }

  function confirm({ title, message, confirmText, confirmClass, onConfirm }) {
    open({
      title: title || 'Confirm',
      body: `
        <div class="confirm-dialog">
          <p>${message}</p>
          <div class="confirm-actions">
            <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
            <button class="btn ${confirmClass || 'btn-danger'}" id="modal-confirm-btn">${confirmText || 'Delete'}</button>
          </div>
        </div>
      `,
    });

    document.getElementById('modal-confirm-btn').addEventListener('click', () => {
      close();
      if (onConfirm) onConfirm();
    });
  }

  // Build a form from schema fields
  function buildForm(schema, data = {}, options = {}) {
    return schema.map(field => {
      const value = data[field.key] ?? field.default ?? '';
      let input = '';

      switch (field.type) {
        case 'text':
          input = field.long
            ? `<textarea id="field-${field.key}" placeholder="${field.placeholder || ''}" rows="3">${value}</textarea>`
            : `<input type="text" id="field-${field.key}" value="${_esc(value)}" placeholder="${field.placeholder || ''}">`;
          break;

        case 'number':
          input = `<input type="number" id="field-${field.key}" value="${value}" step="${field.step || 'any'}" placeholder="${field.placeholder || '0'}">`;
          break;

        case 'date':
          input = `<input type="date" id="field-${field.key}" value="${value || State.today()}">`;
          break;

        case 'checkbox':
          input = `
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" id="field-${field.key}" ${value ? 'checked' : ''} style="width:20px;height:20px">
              <span style="font-size:var(--font-sm);color:var(--text-secondary)">${field.checkLabel || 'Yes'}</span>
            </label>`;
          break;

        case 'rating':
          input = `
            <div class="rating" id="field-${field.key}" data-value="${value || 0}">
              ${[1,2,3,4,5].map(n => `<span class="star ${n <= value ? 'active' : ''}" data-n="${n}">★</span>`).join('')}
            </div>`;
          break;

        case 'dropdown':
          const opts = (field.options || []).map(o =>
            `<option value="${_esc(o)}" ${o === value ? 'selected' : ''}>${o}</option>`
          ).join('');
          input = `<select id="field-${field.key}"><option value="">— Select —</option>${opts}</select>`;
          break;

        case 'tags':
          input = `<input type="text" id="field-${field.key}" value="${_esc(Array.isArray(value) ? value.join(', ') : value)}" placeholder="tag1, tag2, tag3">`;
          break;

        case 'image':
          input = `
            <div class="image-upload ${value ? 'has-image' : ''}" id="field-${field.key}-upload"
                 style="${value ? `background-image:url(${value})` : ''}"
                 onclick="document.getElementById('field-${field.key}-file').click()">
              ${value ? '' : '📷 Tap to upload'}
            </div>
            <input type="file" id="field-${field.key}-file" accept="image/*" class="hidden"
                   onchange="Modal._handleImageUpload('${field.key}', this)">
            <input type="hidden" id="field-${field.key}" value="${_esc(value)}">`;
          break;

        case 'url':
          input = `<input type="url" id="field-${field.key}" value="${_esc(value)}" placeholder="https://...">`;
          break;

        case 'emoji':
          input = `<input type="text" id="field-${field.key}" value="${_esc(value)}" placeholder="😊" maxlength="2" style="width:60px;text-align:center;font-size:24px">`;
          break;

        case 'mood':
          input = `
            <div class="mood-selector" id="field-${field.key}" data-value="${value || ''}">
              <button type="button" class="mood-btn ${value === 'bad' ? 'selected-bad' : ''}" data-mood="bad" onclick="Modal._selectMood('${field.key}','bad')">
                <span class="mood-emoji">😔</span>
                <span class="mood-label">Bad</span>
              </button>
              <button type="button" class="mood-btn ${value === 'ok' ? 'selected-ok' : ''}" data-mood="ok" onclick="Modal._selectMood('${field.key}','ok')">
                <span class="mood-emoji">😐</span>
                <span class="mood-label">OK</span>
              </button>
              <button type="button" class="mood-btn ${value === 'good' ? 'selected-good' : ''}" data-mood="good" onclick="Modal._selectMood('${field.key}','good')">
                <span class="mood-emoji">😄</span>
                <span class="mood-label">Good</span>
              </button>
            </div>`;
          break;

        default:
          input = `<input type="text" id="field-${field.key}" value="${_esc(value)}">`;
      }

      return `
        <div class="form-group">
          <label class="form-label">${field.label || field.key}</label>
          ${input}
        </div>`;
    }).join('');
  }

  // Collect form values from a schema
  function collectFormData(schema) {
    const data = {};
    for (const field of schema) {
      const el = document.getElementById(`field-${field.key}`);
      if (!el) continue;

      switch (field.type) {
        case 'checkbox':
          data[field.key] = el.checked;
          break;
        case 'rating':
          data[field.key] = parseInt(el.dataset.value) || 0;
          break;
        case 'number':
          data[field.key] = el.value ? parseFloat(el.value) : null;
          break;
        case 'tags':
          data[field.key] = el.value.split(',').map(t => t.trim()).filter(Boolean);
          break;
        case 'mood':
          data[field.key] = el.dataset.value || '';
          break;
        default:
          data[field.key] = el.value;
      }
    }
    return data;
  }

  // Rating star click handler (delegated)
  document.addEventListener('click', (e) => {
    const star = e.target.closest('.rating .star');
    if (!star) return;
    const rating = star.closest('.rating');
    const n = parseInt(star.dataset.n);
    rating.dataset.value = n;
    rating.querySelectorAll('.star').forEach(s => {
      s.classList.toggle('active', parseInt(s.dataset.n) <= n);
    });
  });

  // Mood selector
  function _selectMood(fieldKey, mood) {
    const container = document.getElementById(`field-${fieldKey}`);
    if (!container) return;
    container.dataset.value = mood;
    container.querySelectorAll('.mood-btn').forEach(btn => {
      btn.className = 'mood-btn';
      if (btn.dataset.mood === mood) {
        btn.classList.add(`selected-${mood}`);
      }
    });
  }

  // Image upload handler
  function _handleImageUpload(fieldKey, fileInput) {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 800;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        document.getElementById(`field-${fieldKey}`).value = dataUrl;
        const upload = document.getElementById(`field-${fieldKey}-upload`);
        upload.style.backgroundImage = `url(${dataUrl})`;
        upload.classList.add('has-image');
        upload.textContent = '';
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  return {
    open, close, confirm, buildForm, collectFormData,
    _selectMood, _handleImageUpload,
  };
})();
