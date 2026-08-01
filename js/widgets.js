/* ============================================
   Life OS — Widget Renderer
   ============================================ */

const Widgets = (() => {
  const EXPENSE_COLORS = {
    Food: "#DDAB63",
    Transport: "#93B2BB",
    Entertainment: "#D1745D",
    Bills: "#455546",
    Shopping: "#98AA6D",
    Other: "#E5DECF",
  };

  const GREEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // ---- Main render function ----
  function renderWidget(category, items) {
    const cat = category;
    const widgetId = `widget-${cat.id}`;

    const collapsed = _getCollapsedState()[cat.id] ? " collapsed" : "";

    const html = `
      <div class="widget${collapsed}" id="${widgetId}" data-cat-id="${cat.id}" draggable="true">
        <div class="widget-header" ondblclick="Schema.openCategoryEditor(State.getCategory('${cat.id}'))">
          <div class="widget-header-left">
            <span class="widget-title">${cat.name}</span>
            <span class="widget-badge">${items.length}</span>
          </div>
          <div class="widget-actions">
            <button class="btn-icon" onclick="Widgets.moveWidget('${cat.id}',-1)" title="Move up">↑</button>
            <button class="btn-icon" onclick="Widgets.moveWidget('${cat.id}',1)" title="Move down">↓</button>
            <button class="btn-icon" onclick="Widgets.toggleCollapse('${widgetId}')" title="Collapse">▾</button>
            <button class="btn-icon" onclick="Widgets.hideWidget('${cat.id}')" title="Hide">✕</button>
          </div>
        </div>
        <div class="widget-body">
          ${_renderCategoryBody(cat, items)}
          <button class="add-item-btn" onclick="Widgets.addItem('${cat.id}')">+ Add New</button>
        </div>
      </div>
    `;
    return html;
  }

  function _renderCategoryBody(cat, items) {
    // Special renderers for built-in categories
    switch (cat.name) {
      case "Tasks":
        return _renderTasks(cat, items);
      case "Habits":
        return _renderHabits(cat, items);
      case "Expenses":
        return _renderExpenses(cat, items);
      case "Journal":
        return _renderJournal(cat, items);
      case "Subscriptions":
        return _renderSubscriptions(cat, items);
      case "Travel":
        return _renderTravel(cat, items);
      case "Stadiums":
        return _renderTravel(cat, items);
      default:
        return _renderGeneric(cat, items);
    }
  }

  // ---- Tasks ----
  function _renderTasks(cat, items) {
    const today = State.today();
    const active = items
      .filter((i) => !i.data.done)
      .sort((a, b) => {
        const po = { High: 0, Medium: 1, Low: 2 };
        const pDiff = (po[a.data.priority] || 1) - (po[b.data.priority] || 1);
        if (pDiff !== 0) return pDiff;
        return (a.data.deadline || "9999").localeCompare(
          b.data.deadline || "9999",
        );
      });
    const done = items.filter((i) => i.data.done);
    const sorted = [
      ...active.slice(0, 5),
      ...(done.length ? [{ _separator: true, count: done.length }] : []),
    ];

    if (!sorted.length) return _emptyState("No tasks yet");

    const doneCount = done.length;
    const total = items.length;
    const pct = total ? Math.round((doneCount / total) * 100) : 0;

    let html = `
      <div class="flex items-center gap-md" style="margin-bottom:var(--space-md)">
        <div class="progress-bar" style="flex:1"><div class="progress-fill" style="width:${pct}%"></div></div>
        <span class="text-sm text-secondary">${doneCount}/${total}</span>
      </div>
    `;

    for (const item of sorted) {
      if (item._separator) {
        html += `<div style="text-align:center;padding:var(--space-sm)"><button class="btn-ghost" style="font-size:var(--font-xs);color:var(--text-tertiary)" onclick="Widgets.showCompleted('${cat.id}')">${item.count} completed task${item.count > 1 ? "s" : ""} — tap to view</button></div>`;
        continue;
      }
      const d = item.data;
      const prClass =
        d.priority === "High"
          ? "priority-high"
          : d.priority === "Low"
            ? "priority-low"
            : "priority-medium";
      const deadlineTag = d.deadline ? _deadlineTag(d.deadline) : "";

      html += `
        <div class="item-row ${d.done ? "done" : ""}">
          <div class="checkbox ${prClass} ${d.done ? "checked" : ""}"
               onclick="Widgets.toggleTaskDone('${cat.id}','${item.id}',${!d.done})">✓</div>
          <div class="item-content" onclick="Widgets.editItem('${cat.id}','${item.id}')">
            <div class="item-title" style="${d.done ? "text-decoration:line-through" : ""}">${_esc(d.title || "Untitled")}</div>
            ${d.notes ? `<div class="item-subtitle">${_esc(d.notes).substring(0, 50)}</div>` : ""}
          </div>
          ${deadlineTag}
          <div class="item-actions">
            <button class="btn-icon" style="width:28px;height:28px;font-size:14px" onclick="Widgets.deleteItem('${cat.id}','${item.id}')">✕</button>
          </div>
        </div>
      `;
    }
    return html;
  }

  // ---- Habits ----
  function _renderHabits(cat, items) {
    if (!items.length) return _emptyState("Add a habit to get started");

    const today = State.today();
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    });

    let html = "";
    for (const item of items) {
      const d = item.data;
      const logs = State.get("habitLogs")[item.id] || {};
      const streak = _calcStreak(logs);

      html += `
        <div class="item-row" style="flex-direction:column;align-items:stretch;gap:var(--space-md)">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-sm">
              <span style="font-weight:600">${_esc(d.name)}</span>
              ${d.type === "quit" ? '<span class="deadline-tag soon" style="font-size:10px">QUIT</span>' : ""}
            </div>
            <div class="flex items-center gap-sm">
              ${streak > 0 ? `<span class="streak-badge">🔥 ${streak}d</span>` : ""}
              <button class="btn-icon" style="width:24px;height:24px;font-size:12px" onclick="Widgets.editItem('${cat.id}','${item.id}')">✎</button>
              <button class="btn-icon" style="width:24px;height:24px;font-size:12px" onclick="Widgets.deleteItem('${cat.id}','${item.id}')">✕</button>
            </div>
          </div>
          <div class="habit-grid">
            ${last7
              .map((day) => {
                const isToday = day === today;
                const done = logs[day]?.done;
                const dayName = GREEK_DAYS[new Date(day).getDay()];
                return `
                <div class="habit-day">
                  <span class="day-label">${dayName}</span>
                  <div class="day-cell ${isToday ? "today" : ""} ${done ? "done" : ""}"
                       onclick="${isToday ? `Widgets.toggleHabit('${item.id}','${day}','${cat.id}')` : ""}">✓</div>
                </div>
              `;
              })
              .join("")}
          </div>
        </div>
      `;
    }
    return html;
  }

  function _calcStreak(logs) {
    let streak = 0;
    let d = new Date();
    while (true) {
      const key = d.toISOString().slice(0, 10);
      if (logs[key]?.done) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    return streak;
  }

  // ---- Expenses ----
  function _renderExpenses(cat, items) {
    const today = State.today();
    const month = today.slice(0, 7);
    const monthItems = items.filter(
      (i) => (i.data.date || "").slice(0, 7) === month,
    );
    const total = monthItems.reduce(
      (s, i) => s + (parseFloat(i.data.amount) || 0),
      0,
    );

    const byCat = {};
    monthItems.forEach((i) => {
      const c = i.data.category || "Άλλο";
      byCat[c] = (byCat[c] || 0) + (parseFloat(i.data.amount) || 0);
    });

    const todayItems = items.filter((i) => i.data.date === today);

    let html = `
      <div class="expense-summary">
        <div class="expense-label">Month Total</div>
        <div class="expense-total">€${total.toFixed(2)}</div>
        ${
          Object.keys(byCat).length
            ? `
          <div class="expense-bar">
            ${Object.entries(byCat)
              .map(
                ([c, v]) =>
                  `<div class="expense-bar-segment" style="flex:${v};background:${EXPENSE_COLORS[c] || "#98989e"}"></div>`,
              )
              .join("")}
          </div>
          <div class="expense-legend">
            ${Object.entries(byCat)
              .map(
                ([c, v]) =>
                  `<span class="expense-legend-item"><span class="expense-legend-dot" style="background:${EXPENSE_COLORS[c] || "#98989e"}"></span>${c} €${v.toFixed(2)}</span>`,
              )
              .join("")}
          </div>
        `
            : ""
        }
      </div>
    `;

    for (const item of todayItems) {
      const d = item.data;
      html += `
        <div class="item-row">
          <span class="cat-dot" style="background:${EXPENSE_COLORS[d.category] || "#98989e"}"></span>
          <div class="item-content" onclick="Widgets.editItem('${cat.id}','${item.id}')">
            <div class="item-title">${_esc(d.description || d.category)}</div>
          </div>
          <span class="sub-price">€${parseFloat(d.amount || 0).toFixed(2)}</span>
          <div class="item-actions">
            <button class="btn-icon" style="width:24px;height:24px;font-size:12px" onclick="Widgets.deleteItem('${cat.id}','${item.id}')">✕</button>
          </div>
        </div>
      `;
    }

    if (!todayItems.length && !monthItems.length) {
      html += _emptyState("No expenses yet");
    }

    if (items.length) {
      html += `<div style="text-align:center;padding:var(--space-sm)"><button class="btn-ghost" style="font-size:var(--font-xs);color:var(--text-tertiary)" onclick="Widgets.showAllExpenses('${cat.id}')">View all expenses</button></div>`;
    }

    return html;
  }

  // ---- Journal ----
  function _renderJournal(cat, items) {
    const sorted = [...items].sort((a, b) =>
      (b.data.date || "").localeCompare(a.data.date || ""),
    );
    const recent = sorted.slice(0, 5);

    if (!recent.length) return _emptyState("Start your journal");

    let html = "";
    for (const item of recent) {
      const d = item.data;
      const moodClass =
        d.mood === "bad"
          ? "mood-bad"
          : d.mood === "ok"
            ? "mood-ok"
            : d.mood === "good"
              ? "mood-good"
              : "";
      const moodEmoji =
        d.mood === "bad"
          ? "😔"
          : d.mood === "ok"
            ? "😐"
            : d.mood === "good"
              ? "😄"
              : "·";

      html += `
        <div class="item-row" style="border-left:3px solid var(--${moodClass ? moodClass.replace("mood-", "mood-") : "border-subtle"})">
          <div class="mood-dot ${moodClass}"></div>
          <div class="item-content" onclick="Widgets.editItem('${cat.id}','${item.id}')">
            <div class="item-title">${_esc((d.text || "").substring(0, 60))}${(d.text || "").length > 60 ? "..." : ""}</div>
            <div class="item-subtitle">${d.date || ""} ${d.gratitude ? `· 🙏 ${_esc(d.gratitude).substring(0, 30)}` : ""}</div>
          </div>
          <span style="font-size:20px">${moodEmoji}</span>
          <div class="item-actions">
            <button class="btn-icon" style="width:24px;height:24px;font-size:12px" onclick="Widgets.deleteItem('${cat.id}','${item.id}')">✕</button>
          </div>
        </div>
      `;
    }
    return html;
  }

  // ---- Subscriptions ----
  function _renderSubscriptions(cat, items) {
    if (!items.length) return _emptyState("Add your subscriptions");

    const active = items.filter(
      (i) => i.data.status === "ενεργό" || i.data.status === "free trial",
    );
    const monthlyTotal = active.reduce((s, i) => {
      const cost = parseFloat(i.data.cost) || 0;
      return s + (i.data.cycle === "ετήσιο" ? cost / 12 : cost);
    }, 0);

    let html = `
      <div style="text-align:center;margin-bottom:var(--space-md)">
        <span class="text-xs text-secondary">Monthly Cost</span>
        <div style="font-size:var(--font-xl);font-weight:800">€${monthlyTotal.toFixed(2)}</div>
      </div>
    `;

    for (const item of items) {
      const d = item.data;
      const isTrial = d.status === "free trial";
      const trialTag = isTrial && d.trial_end ? _deadlineTag(d.trial_end) : "";

      html += `
        <div class="item-row">
          <div class="item-content" onclick="Widgets.editItem('${cat.id}','${item.id}')">
            <div class="item-title">${_esc(d.service)}</div>
            <div class="item-subtitle">${isTrial ? "🆓 Free trial" : d.cycle || ""}</div>
          </div>
          ${trialTag}
          <span class="sub-price">${d.status === "ακυρωμένο" ? "—" : `€${parseFloat(d.cost || 0).toFixed(2)}`}</span>
          <span class="sub-cycle">/${d.cycle === "ετήσιο" ? "yr" : "mo"}</span>
          <div class="item-actions">
            <button class="btn-icon" style="width:24px;height:24px;font-size:12px" onclick="Widgets.editItem('${cat.id}','${item.id}')">✎</button>
            <button class="btn-icon" style="width:24px;height:24px;font-size:12px" onclick="Widgets.deleteItem('${cat.id}','${item.id}')">✕</button>
          </div>
        </div>
      `;
    }
    return html;
  }

  // ---- Travel ----
  function _renderTravel(cat, items) {
    if (!items.length) return _emptyState("Add your first travel destination");

    const mapContainerId = `travel-map-${cat.id}`;

    let html = `
      <div class="map-toggle">
        <button class="map-toggle-btn active" onclick="Widgets._toggleTravelView('${cat.id}','cards',this)">Cards</button>
        <button class="map-toggle-btn" onclick="Widgets._toggleTravelView('${cat.id}','map',this)">Map</button>
      </div>
      <div id="travel-cards-${cat.id}">
        ${_renderTravelCards(cat, items)}
      </div>
      <div id="${mapContainerId}" style="display:none"></div>
    `;

    return html;
  }

  function _renderTravelCards(cat, items) {
    items = [...items].sort((a, b) =>
      (b.data.date_from || b.data.date || "").localeCompare(
        a.data.date_from || a.data.date || "",
      ),
    );
    let html =
      '<div style="display:flex;gap:var(--space-sm);overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:var(--space-sm);-webkit-overflow-scrolling:touch">';
    for (const item of items) {
      const d = item.data;
      const statusColor = {
        Completed: "#98AA6D",
        Planned: "#93B2BB",
        "Want to Go": "#DDAB63",
      };
      const color = statusColor[d.status] || "#93B2BB";

      html += `
<div style="background:var(--bg-card);border-radius:var(--radius-sm);overflow:hidden;cursor:pointer;position:relative;min-width:160px;max-width:160px;scroll-snap-align:start;flex-shrink:0"             onclick="Widgets.editItem('${cat.id}','${item.id}')">
          ${
            d.photo
              ? `<div style="width:100%;aspect-ratio:1;background:url('${d.photo}') center/cover"></div>`
              : `<div style="width:100%;aspect-ratio:1;background:${color}20;display:flex;align-items:center;justify-content:center;font-size:40px">✈️</div>`
          }
          <div style="padding:var(--space-sm)">
            <div style="font-size:var(--font-sm);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_esc(d.destination || d.stadium || d.title || "")}</div>
            <div style="font-size:var(--font-xs);color:var(--text-tertiary);display:flex;justify-content:space-between;margin-top:2px">
              <span>${_esc(d.country || "")}</span>
              <span style="color:${color};font-weight:600">${d.status || ""}</span>
            </div>
          </div>
          <button class="btn-icon" style="position:absolute;top:4px;right:4px;width:24px;height:24px;font-size:12px;background:rgba(0,0,0,0.4);color:#fff"
                  onclick="event.stopPropagation();Widgets.deleteItem('${cat.id}','${item.id}')">✕</button>
        </div>
      `;
    }
    html += "</div>";
    return html;
  }

  function _toggleTravelView(catId, view, btn) {
    const cardsEl = document.getElementById(`travel-cards-${catId}`);
    const mapEl = document.getElementById(`travel-map-${catId}`);
    if (!cardsEl || !mapEl) return;

    // Toggle buttons
    btn.parentElement
      .querySelectorAll(".map-toggle-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    if (view === "map") {
      cardsEl.style.display = "none";
      mapEl.style.display = "block";
      const items = State.getCategoryItems(catId);
      const cat = State.getCategory(catId);
      TravelMap.render(`travel-map-${catId}`, items, cat);
    } else {
      cardsEl.style.display = "block";
      mapEl.style.display = "none";
    }
  }

  // ---- Generic renderer (for custom categories) ----
  function _renderGeneric(cat, items) {
    if (!items.length) return _emptyState(`Empty category`);

    const schema = cat.schema || [];
    const titleField = schema.find((f) => f.type === "text") || schema[0];
    const isCards = cat.view_type === "cards";
    const imageField = schema.find((f) => f.type === "image");

    if (isCards && imageField) {
      return _renderCards(cat, items, schema, titleField, imageField);
    }

    let html = "";
    for (const item of items) {
      const d = item.data;
      const title = titleField ? d[titleField.key] || "Untitled" : "Item";
      const subtitle = schema
        .slice(1, 3)
        .map((f) => {
          const v = d[f.key];
          if (!v) return null;
          if (f.type === "rating") return "★".repeat(v);
          if (f.type === "checkbox") return v ? "✓" : "";
          if (f.type === "tags") return (Array.isArray(v) ? v : []).join(", ");
          if (f.type === "mood")
            return v === "bad" ? "😔" : v === "ok" ? "😐" : "😄";
          return v;
        })
        .filter(Boolean)
        .join(" · ");

      // Check for counter fields (wardrobe wear count etc)
      const numberField = schema.find(
        (f) => f.type === "number" && f.label && f.label.includes("φορ"),
      );
      const hasCounter = numberField && d[numberField.key] !== undefined;

      // Check deadline
      const dateField = schema.find(
        (f) => f.type === "date" && f.key !== "date",
      );
      const deadlineTag =
        dateField && d[dateField.key] ? _deadlineTag(d[dateField.key]) : "";

      html += `
        <div class="item-row">
          <div class="item-content" onclick="Widgets.editItem('${cat.id}','${item.id}')">
            <div class="item-title">${_esc(title)}</div>
            ${subtitle ? `<div class="item-subtitle">${subtitle}</div>` : ""}
          </div>
          ${
            hasCounter
              ? `
            <div class="counter-controls">
              <button class="counter-btn" onclick="Widgets.adjustCounter('${cat.id}','${item.id}','${numberField.key}',-1)">−</button>
              <span class="counter-value">${d[numberField.key] || 0}</span>
              <button class="counter-btn" onclick="Widgets.adjustCounter('${cat.id}','${item.id}','${numberField.key}',1)">+</button>
            </div>
          `
              : ""
          }
          ${deadlineTag}
          <div class="item-actions">
            <button class="btn-icon" style="width:24px;height:24px;font-size:12px" onclick="Widgets.editItem('${cat.id}','${item.id}')">✎</button>
            <button class="btn-icon" style="width:24px;height:24px;font-size:12px" onclick="Widgets.deleteItem('${cat.id}','${item.id}')">✕</button>
          </div>
        </div>
      `;
    }
    return html;
  }

  // ---- Card view ----
  function _renderCards(cat, items, schema, titleField, imageField) {
    let html =
      '<div style="display:flex;gap:var(--space-sm);overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:var(--space-sm);-webkit-overflow-scrolling:touch">';
    for (const item of items) {
      const d = item.data;
      const title = titleField ? d[titleField.key] || "" : "";
      const img = d[imageField.key] || "";
      const ratingField = schema.find((f) => f.type === "rating");
      const statusField = schema.find(
        (f) => f.type === "dropdown" && f.key.includes("status"),
      );
      const rating = ratingField ? d[ratingField.key] : 0;
      const status = statusField ? d[statusField.key] || "" : "";

      html += `
        <div style="background:var(--bg-card);border-radius:var(--radius-sm);overflow:hidden;cursor:pointer;position:relative;min-width:160px;max-width:160px;scroll-snap-align:start;flex-shrink:0"
             onclick="Widgets.editItem('${cat.id}','${item.id}')">
          ${
            img
              ? `<div style="width:100%;aspect-ratio:1;background:url('${img}') center/cover;"></div>`
              : `<div style="width:100%;aspect-ratio:1;background:${cat.color}20;display:flex;align-items:center;justify-content:center;font-size:32px">${cat.icon}</div>`
          }
          <div style="padding:var(--space-sm)">
            <div style="font-size:var(--font-sm);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_esc(title)}</div>
            <div style="font-size:var(--font-xs);color:var(--text-tertiary);display:flex;justify-content:space-between;margin-top:2px">
              <span>${status}</span>
              <span style="color:var(--accent-orange)">${rating ? "★".repeat(rating) : ""}</span>
            </div>
          </div>
          <button class="btn-icon" style="position:absolute;top:4px;right:4px;width:24px;height:24px;font-size:12px;background:rgba(0,0,0,0.5)"
                  onclick="event.stopPropagation();Widgets.deleteItem('${cat.id}','${item.id}')">✕</button>
        </div>
      `;
    }
    html += "</div>";
    return html;
  }

  // ---- Helpers ----
  function _deadlineTag(dateStr) {
    const days = State.daysUntil(dateStr);
    let cls, text;
    if (days < 0) {
      cls = "urgent";
      text = `${Math.abs(days)}d πριν!`;
    } else if (days === 0) {
      cls = "urgent";
      text = "Today";
    } else if (days <= 3) {
      cls = "soon";
      text = `${days}d`;
    } else {
      cls = "ok";
      text = `${days}d`;
    }
    return `<span class="deadline-tag ${cls}">${text}</span>`;
  }

  function _emptyState(text) {
    return `<div class="empty-state"><p>${text}</p></div>`;
  }

  // ---- Actions ----
  function addItem(categoryId) {
    const cat = State.getCategory(categoryId);
    if (!cat) {
      console.error("Category not found in state:", categoryId);
      console.log(
        "Available categories:",
        State.get("categories").map((c) => ({ id: c.id, name: c.name })),
      );
      // Try to reload and retry
      App.loadCategories().then(() => {
        const retry = State.getCategory(categoryId);
        if (retry) {
          addItem(categoryId);
        } else {
          alert("Category not found. Try refreshing.");
        }
      });
      return;
    }

    const formHtml = Modal.buildForm(cat.schema || []);
    Modal.open({
      title: `${cat.icon} New: ${cat.name}`,
      body: formHtml,
      footer: `
        <div style="flex:1"></div>
        <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="Widgets._saveNewItem('${categoryId}')">Save</button>
      `,
    });
  }

  async function _saveNewItem(categoryId) {
    const cat = State.getCategory(categoryId);
    if (!cat) {
      alert("Category not found. Try refreshing.");
      Modal.close();
      return;
    }
    const data = Modal.collectFormData(cat.schema || []);

    try {
      await DB.createItem(categoryId, data);
      Modal.close();
      await App.loadCategoryItems(categoryId);
      App.renderDashboard();
    } catch (err) {
      console.error("Save item error:", err);
      alert("Error: " + err.message);
    }
  }

  function editItem(categoryId, itemId) {
    const cat = State.getCategory(categoryId);
    if (!cat) {
      alert("Category not found. Try refreshing.");
      return;
    }
    const items = State.getCategoryItems(categoryId);
    const item = items.find((i) => i.id === itemId);
    if (!item) {
      alert("Item not found.");
      return;
    }

    const formHtml = Modal.buildForm(cat.schema, item.data);
    Modal.open({
      title: `✎ ${cat.name}`,
      body: formHtml,
      footer: `
        <button class="btn btn-danger" onclick="Widgets.deleteItem('${categoryId}','${itemId}')">Delete</button>
        <div style="flex:1"></div>
        <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="Widgets._saveEditItem('${categoryId}','${itemId}')">Save</button>
      `,
    });
  }

  async function _saveEditItem(categoryId, itemId) {
    const cat = State.getCategory(categoryId);
    if (!cat) {
      alert("Category not found.");
      Modal.close();
      return;
    }
    const data = Modal.collectFormData(cat.schema || []);

    try {
      await DB.updateItem(itemId, data);
      Modal.close();
      await App.loadCategoryItems(categoryId);
      App.renderDashboard();
    } catch (err) {
      console.error("Update item error:", err);
      alert("Error: " + err.message);
    }
  }

  function deleteItem(categoryId, itemId) {
    Modal.confirm({
      message: "Are you sure you want to delete this item?",
      onConfirm: async () => {
        try {
          await DB.deleteItem(itemId);
          await App.loadCategoryItems(categoryId);
          App.renderDashboard();
        } catch (err) {
          console.error("Delete error:", err);
        }
      },
    });
  }

  async function toggleTaskDone(categoryId, itemId, done) {
    const items = State.getCategoryItems(categoryId);
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    item.data.done = done;
    try {
      await DB.updateItem(itemId, item.data);
      await App.loadCategoryItems(categoryId);
      App.renderDashboard();
    } catch (err) {
      console.error("Toggle error:", err);
    }
  }

  async function toggleHabit(itemId, date, categoryId) {
    try {
      await DB.toggleHabitLog(itemId, date);
      // Update local state
      const logs = State.get("habitLogs");
      if (!logs[itemId]) logs[itemId] = {};
      const current = logs[itemId][date]?.done || false;
      logs[itemId][date] = { done: !current };
      State.set("habitLogs", logs);
      App.renderDashboard();
    } catch (err) {
      console.error("Toggle habit error:", err);
    }
  }

  async function adjustCounter(categoryId, itemId, fieldKey, delta) {
    const items = State.getCategoryItems(categoryId);
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const current = parseInt(item.data[fieldKey]) || 0;
    item.data[fieldKey] = Math.max(0, current + delta);

    try {
      await DB.updateItem(itemId, item.data);
      await App.loadCategoryItems(categoryId);
      App.renderDashboard();
    } catch (err) {
      console.error("Counter error:", err);
    }
  }

  async function moveWidget(catId, direction) {
    const cats = State.get("categories");
    const idx = cats.findIndex((c) => c.id === catId);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= cats.length) return;
    [cats[idx], cats[newIdx]] = [cats[newIdx], cats[idx]];
    cats.forEach((c, i) => (c.sort_order = i));
    State.set("categories", [...cats]);
    App.renderDashboard();
    const orderedIds = cats.map((c) => c.id);
    try {
      await DB.reorderCategories(orderedIds);
    } catch (e) {
      console.error(e);
    }
  }

  async function hideWidget(catId) {
    try {
      await DB.updateCategory(catId, { visible: false });
      const cats = State.get("categories");
      const cat = cats.find((c) => c.id === catId);
      if (cat) cat.visible = false;
      State.set("categories", [...cats]);
      App.renderDashboard();
    } catch (e) {
      console.error(e);
    }
  }

  function showCompleted(categoryId) {
    const cat = State.getCategory(categoryId);
    const items = State.getCategoryItems(categoryId);
    const done = items.filter((i) => i.data.done);
    let html = "";
    for (const item of done) {
      const d = item.data;
      html += `
        <div class="item-row done">
          <div class="checkbox priority-low checked" onclick="Widgets.toggleTaskDone('${categoryId}','${item.id}',false)">✓</div>
          <div class="item-content">
            <div class="item-title" style="text-decoration:line-through">${_esc(d.title || "Untitled")}</div>
          </div>
          <button class="btn-icon" style="width:24px;height:24px;font-size:12px" onclick="Widgets.deleteItem('${categoryId}','${item.id}')">✕</button>
        </div>`;
    }
    Modal.open({
      title: `${cat.icon} Completed Tasks`,
      body: html || '<div class="empty-state"><p>No completed tasks</p></div>',
    });
  }

  function showAllExpenses(categoryId) {
    const cat = State.getCategory(categoryId);
    const items = State.getCategoryItems(categoryId);
    const COLORS = EXPENSE_COLORS;

    // Group by month
    const months = {};
    for (const item of items) {
      const m = (item.data.date || "No date").slice(0, 7);
      if (!months[m]) months[m] = [];
      months[m].push(item);
    }

    // Sort months newest first
    const sortedMonths = Object.keys(months).sort((a, b) => b.localeCompare(a));

    let html = "";
    for (const month of sortedMonths) {
      const monthItems = months[month];
      const total = monthItems.reduce(
        (s, i) => s + (parseFloat(i.data.amount) || 0),
        0,
      );
      const label = month === "No date" ? "No date" : month;

      html += `
        <div style="margin-bottom:var(--space-lg)">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-sm) 0;margin-bottom:var(--space-sm)">
            <span style="font-weight:700;font-size:var(--font-md)">${label}</span>
            <span style="font-weight:800;font-size:var(--font-md)">€${total.toFixed(2)}</span>
          </div>`;

      for (const item of monthItems.sort((a, b) =>
        (b.data.date || "").localeCompare(a.data.date || ""),
      )) {
        const d = item.data;
        html += `
          <div class="item-row">
            <span class="cat-dot" style="background:${COLORS[d.category] || "#98989e"}"></span>
            <div class="item-content" onclick="Widgets.editItem('${categoryId}','${item.id}')">
              <div class="item-title">${_esc(d.description || d.category)}</div>
              <div class="item-subtitle">${d.date || ""}</div>
            </div>
            <span style="font-weight:700">€${parseFloat(d.amount || 0).toFixed(2)}</span>
            <button class="btn-icon" style="width:24px;height:24px;font-size:12px" onclick="Widgets.deleteItem('${categoryId}','${item.id}')">✕</button>
          </div>`;
      }
      html += "</div>";
    }

    const grandTotal = items.reduce(
      (s, i) => s + (parseFloat(i.data.amount) || 0),
      0,
    );
    Modal.open({
      title: `${cat.icon} All Expenses`,
      body:
        `<div style="text-align:center;margin-bottom:var(--space-lg);padding:var(--space-md);background:var(--bg-input);border-radius:var(--radius-sm)"><div style="font-size:var(--font-xs);color:var(--text-tertiary)">All Time Total</div><div style="font-size:var(--font-2xl);font-weight:800">€${grandTotal.toFixed(2)}</div></div>` +
        html,
    });
  }

  function _getCollapsedState() {
    try { return JSON.parse(localStorage.getItem("lifeos_collapsed") || "{}"); } catch { return {}; }
  }

  function toggleCollapse(widgetId) {
    const widget = document.getElementById(widgetId);
    if (!widget) return;
    widget.classList.toggle("collapsed");
    const catId = widget.dataset.catId;
    if (catId) {
      const state = _getCollapsedState();
      state[catId] = widget.classList.contains("collapsed");
      localStorage.setItem("lifeos_collapsed", JSON.stringify(state));
    }
  }

  // ---- Drag & drop reordering ----
  let _draggedWidget = null;

  function initDragDrop(container) {
    container.addEventListener("dragstart", (e) => {
      const widget = e.target.closest(".widget");
      if (!widget) return;
      _draggedWidget = widget;
      widget.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });

    container.addEventListener("dragend", (e) => {
      if (_draggedWidget) _draggedWidget.classList.remove("dragging");
      document
        .querySelectorAll(".widget.drag-over")
        .forEach((w) => w.classList.remove("drag-over"));
      _draggedWidget = null;
      _saveOrder(container);
    });

    container.addEventListener("dragover", (e) => {
      e.preventDefault();
      const widget = e.target.closest(".widget");
      if (!widget || widget === _draggedWidget) return;

      document
        .querySelectorAll(".widget.drag-over")
        .forEach((w) => w.classList.remove("drag-over"));
      widget.classList.add("drag-over");

      const rect = widget.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (e.clientY < midY) {
        widget.parentNode.insertBefore(_draggedWidget, widget);
      } else {
        widget.parentNode.insertBefore(_draggedWidget, widget.nextSibling);
      }
    });

    // Touch support for mobile
    let _touchWidget = null;
    let _touchClone = null;
    let _touchStartY = 0;
    let _longPressTimer = null;

    container.addEventListener(
      "touchstart",
      (e) => {
        const header = e.target.closest(".widget-header");
        if (!header) return;
        const widget = header.closest(".widget");
        _touchStartY = e.touches[0].clientY;

        _longPressTimer = setTimeout(() => {
          _touchWidget = widget;
          widget.style.opacity = "0.5";
          navigator.vibrate?.(50);
        }, 500);
      },
      { passive: true },
    );

    container.addEventListener(
      "touchmove",
      (e) => {
        if (_longPressTimer) {
          clearTimeout(_longPressTimer);
          _longPressTimer = null;
        }
        if (!_touchWidget) return;

        const touch = e.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        const overWidget = target?.closest(".widget");

        if (overWidget && overWidget !== _touchWidget) {
          const rect = overWidget.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          if (touch.clientY < midY) {
            overWidget.parentNode.insertBefore(_touchWidget, overWidget);
          } else {
            overWidget.parentNode.insertBefore(
              _touchWidget,
              overWidget.nextSibling,
            );
          }
        }
      },
      { passive: true },
    );

    container.addEventListener("touchend", () => {
      if (_longPressTimer) {
        clearTimeout(_longPressTimer);
        _longPressTimer = null;
      }
      if (_touchWidget) {
        _touchWidget.style.opacity = "1";
        _saveOrder(container);
        _touchWidget = null;
      }
    });
  }

  async function _saveOrder(container) {
    const widgets = container.querySelectorAll(".widget[data-cat-id]");
    const orderedIds = Array.from(widgets).map((w) => w.dataset.catId);
    try {
      await DB.reorderCategories(orderedIds);
      // Update local state
      const cats = State.get("categories");
      orderedIds.forEach((id, i) => {
        const c = cats.find((c) => c.id === id);
        if (c) c.sort_order = i;
      });
      State.set(
        "categories",
        [...cats].sort((a, b) => a.sort_order - b.sort_order),
      );
    } catch (err) {
      console.error("Reorder error:", err);
    }
  }

  return {
    renderWidget,
    addItem,
    editItem,
    deleteItem,
    toggleTaskDone,
    toggleHabit,
    adjustCounter,
    showAllExpenses,
    toggleCollapse,
    moveWidget,
    hideWidget,
    showCompleted,
    _toggleTravelView,
    initDragDrop,
    _saveNewItem,
    _saveEditItem,
  };
})();
