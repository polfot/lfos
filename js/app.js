/* ============================================
   Life OS — Main Application
   ============================================ */

const App = (() => {
  let _initialized = false;

  async function init() {
    // Read config
    const config = getConfig();
    if (!config.supabaseUrl || !config.supabaseKey) {
      showSetup();
      return;
    }

    // Init Supabase
    DB.init(config.supabaseUrl, config.supabaseKey);

    // Check auth
    DB.onAuthChange(async (event, session) => {
      if (session?.user) {
        State.set("user", session.user);
        if (!_initialized) {
          _initialized = true;
          await loadAll();
          render();
        }
      } else {
        State.set("user", null);
        showAuth();
      }
    });
  }

  // ---- Config ----
  function getConfig() {
    try {
      return JSON.parse(localStorage.getItem("lifeos_config") || "{}");
    } catch {
      return {};
    }
  }

  function saveConfig(config) {
    localStorage.setItem("lifeos_config", JSON.stringify(config));
  }

  // ---- Setup screen ----
  function showSetup() {
    document.getElementById("app").innerHTML = `
      <div style="padding:var(--space-2xl) var(--space-lg);max-width:380px;margin:0 auto">
        <div style="text-align:center;margin-bottom:var(--space-2xl)">
          <div style="font-size:48px;margin-bottom:var(--space-md)">🧬</div>
          <h1 style="font-size:var(--font-xl);margin-bottom:var(--space-sm)">Life OS</h1>
          <p class="text-secondary text-sm">Connect to Supabase</p>
        </div>
        <div class="form-group">
          <label class="form-label">Supabase URL</label>
          <input type="url" id="setup-url" placeholder="https://xxxxx.supabase.co">
        </div>
        <div class="form-group">
          <label class="form-label">Anon Key</label>
          <input type="text" id="setup-key" placeholder="eyJhbGciOiJ...">
        </div>
        <button class="btn btn-primary btn-full" onclick="App.saveSetup()">Connect</button>
        <p class="text-xs text-secondary" style="margin-top:var(--space-md);text-align:center">
          Create a project at supabase.com,<br>run schema.sql, and paste your credentials here.
        </p>
      </div>
    `;
  }

  function saveSetup() {
    const url = document.getElementById("setup-url").value.trim();
    const key = document.getElementById("setup-key").value.trim();
    if (!url || !key) return alert("Please fill in both fields");
    saveConfig({ supabaseUrl: url, supabaseKey: key });
    location.reload();
  }

  // ---- Auth screen ----
  function showAuth() {
    document.getElementById("app").innerHTML = `
      <div style="padding:var(--space-2xl) var(--space-lg);max-width:380px;margin:0 auto">
        <div style="text-align:center;margin-bottom:var(--space-2xl)">
          <div style="font-size:48px;margin-bottom:var(--space-md)">🧬</div>
          <h1 style="font-size:var(--font-xl);margin-bottom:var(--space-sm)">Life OS</h1>
          <p class="text-secondary text-sm">Sign in or sign up</p>
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" id="auth-email" placeholder="you@example.com">
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input type="password" id="auth-password" placeholder="••••••••">
        </div>
        <div id="auth-error" style="color:var(--accent-red);font-size:var(--font-sm);margin-bottom:var(--space-md);display:none"></div>
        <div style="display:flex;gap:var(--space-sm)">
          <button class="btn btn-secondary" style="flex:1" onclick="App.handleAuth('signup')">Sign Up</button>
          <button class="btn btn-primary" style="flex:1" onclick="App.handleAuth('login')">Connect</button>
        </div>
        <button class="btn btn-ghost btn-full" style="margin-top:var(--space-lg)" onclick="App.resetConfig()">↻ Change Supabase Config</button>
      </div>
    `;
  }

  async function handleAuth(mode) {
    const email = document.getElementById("auth-email").value.trim();
    const password = document.getElementById("auth-password").value;
    const errorEl = document.getElementById("auth-error");
    errorEl.style.display = "none";

    if (!email || !password) {
      errorEl.textContent = "Please enter email and password";
      errorEl.style.display = "block";
      return;
    }

    try {
      const { data, error } =
        mode === "signup"
          ? await DB.signUp(email, password)
          : await DB.signIn(email, password);

      if (error) throw error;
      if (mode === "signup") {
        errorEl.textContent = "Check your email to confirm, then sign in!";
        errorEl.style.display = "block";
        errorEl.style.color = "var(--accent-primary)";
      }
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = "block";
    }
  }

  function resetConfig() {
    localStorage.removeItem("lifeos_config");
    location.reload();
  }

  // ---- Data loading ----
  async function loadAll() {
    State.set("loading", true);
    try {
      await loadCategories();

      // Seed built-in categories if none exist
      const cats = State.get("categories");
      if (cats.length === 0) {
        await seedBuiltins();
        await loadCategories();
      }

      // Load items for all categories
      for (const cat of State.get("categories")) {
        await loadCategoryItems(cat.id);
      }

      // Load habit logs for last 7 days
      await loadHabitLogs();
    } catch (err) {
      console.error("Load error:", err);
    }
    State.set("loading", false);
  }

  async function loadCategories() {
    const categories = await DB.getCategories();
    State.set("categories", categories);

    // Ensure all categories have an items entry in state
    const allItems = State.get("items");
    for (const cat of categories) {
      if (!allItems[cat.id]) {
        allItems[cat.id] = [];
      }
    }
    State.set("items", allItems);
  }

  async function loadCategoryItems(categoryId) {
    const items = await DB.getItems(categoryId);
    const allItems = State.get("items");
    allItems[categoryId] = items;
    State.set("items", allItems);
  }

  async function loadHabitLogs() {
    const cats = State.get("categories");
    const habitCat = cats.find((c) => c.name === "Habits");
    if (!habitCat) return;

    const items = State.getCategoryItems(habitCat.id);
    const logs = {};
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);
    const fromStr = fromDate.toISOString().slice(0, 10);
    const toStr = State.today();

    for (const item of items) {
      const itemLogs = await DB.getHabitLogs(item.id, fromStr, toStr);
      logs[item.id] = {};
      for (const log of itemLogs) {
        logs[item.id][log.log_date] = log.value;
      }
    }
    State.set("habitLogs", logs);
  }

  async function seedBuiltins() {
    const templates = Schema.getBuiltinTemplates();
    for (let i = 0; i < templates.length; i++) {
      templates[i].sort_order = i;
      await DB.createCategory(templates[i]);
    }
  }

  // ---- Rendering ----
  function render() {
    const app = document.getElementById("app");
    const currentPage = State.get("currentPage");

    app.innerHTML = `
      <div id="page-home" class="page ${currentPage === "home" ? "active" : ""}"></div>
      <div id="page-categories" class="page ${currentPage === "categories" ? "active" : ""}"></div>
      <div id="page-search" class="page ${currentPage === "search" ? "active" : ""}"></div>
      <div id="page-settings" class="page ${currentPage === "settings" ? "active" : ""}"></div>

      <nav class="bottom-nav">
        <button class="nav-item ${currentPage === "home" ? "active" : ""}" onclick="App.navigate('home')">
          <svg viewBox="0 0 24 24"><path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>
        </button>
        <button class="nav-item ${currentPage === "categories" ? "active" : ""}" onclick="App.navigate('categories')">
          <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
        </button>
        <button class="nav-item nav-add" onclick="App.quickAdd()">
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <button class="nav-item ${currentPage === "search" ? "active" : ""}" onclick="App.navigate('search')">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>
        </button>
        <button class="nav-item ${currentPage === "settings" ? "active" : ""}" onclick="App.navigate('settings')">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 16 0v1"/></svg>
        </button>
      </nav>
    `;

    switch (currentPage) {
      case "home":
        renderDashboard();
        break;
      case "categories":
        renderCategoriesPage();
        break;
      case "search":
        renderSearchPage();
        break;
      case "settings":
        renderSettingsPage();
        break;
    }
  }

  function renderDashboard() {
    const container = document.getElementById("page-home");
    if (!container) return;

    const categories = State.get("categories");
    const allItems = State.get("items");

    let html = Today.render();

    // Widgets for each category
    html += '<div id="widgets-container" style="padding:0">';
    for (const cat of categories) {
      if (cat.visible === false) continue;
      const items = allItems[cat.id] || [];
      html += Widgets.renderWidget(cat, items);
    }

    // Add category button
    html += `
      <button class="add-category-btn" onclick="Schema.openCategoryEditor()">
        + Add Category
      </button>
    `;

    html += "</div>";
    container.innerHTML = html;

    // Init drag & drop
    const widgetsContainer = document.getElementById("widgets-container");
    if (widgetsContainer) Widgets.initDragDrop(widgetsContainer);
  }

  function renderCategoriesPage() {
    const container = document.getElementById("page-categories");
    const categories = State.get("categories");
    const allItems = State.get("items");

    let html = `<h2 class="page-title">Categories</h2>`;
    html += `<div style="background:var(--bg-surface);border-radius:var(--radius-md);overflow:hidden">`;

    for (const cat of categories) {
      const items = allItems[cat.id] || [];
      html += `
        <div class="item-row" style="padding:var(--space-md) var(--space-lg)" onclick="App.openCategoryView('${cat.id}')">
          <span style="font-size:24px">${cat.icon}</span>
          <div class="item-content">
            <div class="item-title">${cat.name}</div>
            <div class="item-subtitle">${items.length} items · ${cat.view_type}</div>
          </div>
          <span class="cat-dot" style="background:${cat.color}"></span>
          <button class="btn-icon" style="width:28px;height:28px;font-size:14px"
                  onclick="event.stopPropagation();App.toggleCategoryVisibility('${cat.id}')">${cat.visible === false ? "👁" : "👁‍🗨"}</button>
          <button class="btn-icon" style="width:28px;height:28px;font-size:14px"
                  onclick="event.stopPropagation();Schema.openCategoryEditor(State.getCategory('${cat.id}'))">✎</button>
        </div>
      `;
    }

    html += `</div>`;
    html += `
      <button class="add-category-btn" style="margin-top:var(--space-lg)" onclick="Schema.openCategoryEditor()">
        + New Category
      </button>
    `;

    container.innerHTML = html;
  }

  function openCategoryView(categoryId) {
    const cat = State.getCategory(categoryId);
    const items = State.getCategoryItems(categoryId);
    if (!cat) return;

    Modal.open({
      title: `${cat.icon} ${cat.name}`,
      body: `
        
        ${Widgets.renderWidget(cat, items)
          .replace(/<div class="widget[^>]*>/, "<div>")
          .replace(/<div class="widget-header[\s\S]*?<\/div>\s*<\/div>/, "")}
      `,
    });
  }

  function renderSearchPage() {
    const container = document.getElementById("page-search");
    container.innerHTML = `
      <h2 class="page-title">Search</h2>
      <div style="display:flex;gap:var(--space-sm)">
        <input type="text" id="search-input" placeholder="Search anything..." oninput="App.runSearch()" style="flex:1">
        <div style="position:relative;width:44px;flex-shrink:0">
          <input type="date" id="search-date" onchange="App.runSearch()" style="width:100%;height:100%;padding:0;opacity:0;position:absolute;inset:0;cursor:pointer">
          <div style="width:44px;height:44px;background:var(--bg-surface);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;pointer-events:none">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
        </div>
      </div>
      <div id="search-results" style="margin-top:var(--space-lg)"></div>
    `;
  }

  function runSearch() {
    const query = (document.getElementById("search-input")?.value || "").trim();
    const dateFilter = document.getElementById("search-date")?.value || "";
    const results = document.getElementById("search-results");
    if (!query && !dateFilter) {
      results.innerHTML = "";
      return;
    }

    const q = query.toLowerCase();
    const categories = State.get("categories");
    const allItems = State.get("items");
    let html = "";
    let count = 0;

    for (const cat of categories) {
      const items = allItems[cat.id] || [];
      const schema = cat.schema || [];
      const titleField = schema.find((f) => f.type === "text") || schema[0];

      const matches = items.filter((item) => {
        let textMatch = true;
        let dateMatch = true;

        // Text filter
        if (q.length >= 2) {
          textMatch = Object.values(item.data).some((v) => {
            if (typeof v === "string") return v.toLowerCase().includes(q);
            if (Array.isArray(v))
              return v.some((t) => t.toLowerCase().includes(q));
            return false;
          });
        }

        // Date filter
        if (dateFilter) {
          dateMatch = Object.entries(item.data).some(([key, val]) => {
            const field = schema.find((f) => f.key === key);
            return field && field.type === "date" && val === dateFilter;
          });
          // Also check created_at
          if (!dateMatch && item.created_at) {
            dateMatch = item.created_at.slice(0, 10) === dateFilter;
          }
        }

        return textMatch && dateMatch;
      });

      for (const item of matches) {
        const title = titleField ? item.data[titleField.key] || "" : "Item";
        count++;

        html += `
          <div class="item-row" style="padding:var(--space-md) var(--space-lg)" onclick="Widgets.editItem('${cat.id}','${item.id}')">
            <span>${cat.icon}</span>
            <div class="item-content">
              <div class="item-title">${_esc(title)}</div>
              <div class="item-subtitle">${cat.name}</div>
            </div>
          </div>
        `;
      }
    }

    const header = dateFilter
      ? `<div style="font-size:var(--font-sm);color:var(--text-secondary);margin-bottom:var(--space-md)">${count} item${count !== 1 ? "s" : ""} on ${dateFilter}</div>`
      : "";
    const wrapped = html
      ? `<div style="background:var(--bg-surface);border-radius:var(--radius-md);overflow:hidden">${html}</div>`
      : '<div class="empty-state"><p>No results</p></div>';
    results.innerHTML = header + wrapped;
  }

  function renderSettingsPage() {
    const container = document.getElementById("page-settings");
    const user = State.get("user");

    container.innerHTML = `
      <h2 class="page-title">Settings</h2>

      <div style="background:var(--bg-surface);border-radius:var(--radius-md);padding:var(--space-lg);margin-bottom:var(--space-lg)">
        <div class="text-sm text-secondary" style="margin-bottom:var(--space-xs)">Signed in as</div>
        <div style="font-weight:600">${user?.email || "—"}</div>
      </div>

      <div style="display:flex;flex-direction:column;gap:var(--space-sm)">
        <button class="btn btn-secondary btn-full" onclick="App.exportData()">📦 Export Data</button>
        <button class="btn btn-secondary btn-full" onclick="App.resetConfig()">🔧 Change Supabase Config</button>
        <button class="btn btn-danger btn-full" onclick="App.logout()">🚪 Sign Out</button>
      </div>
    `;
  }

  // ---- Navigation ----
  function navigate(page) {
    State.set("currentPage", page);
    render();
    window.scrollTo(0, 0);
  }

  // ---- Quick Add ----
  function quickAdd() {
    const categories = State.get("categories");
    let html = '<div style="display:flex;flex-direction:column;gap:var(--space-xs)">';
    for (const cat of categories) {
      html += `
        <button class="menu-nav-btn" onclick="Modal.close();Widgets.addItem('${cat.id}')">
          <span>${cat.icon}</span> ${cat.name}
        </button>
      `;
    }
    html += `
        <button class="menu-nav-btn" style="color:var(--accent-primary)" onclick="Modal.close();Schema.openCategoryEditor()">
          <span>+</span> New Category
        </button>
      </div>
    `;
    Modal.open({ title: "Quick Add", body: html });
  }

  // ---- Export ----
  async function exportData() {
    const categories = State.get("categories");
    const items = State.get("items");
    const data = { categories, items, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lifeos-export-${State.today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function logout() {
    await DB.signOut();
    _initialized = false;
    location.reload();
  }

  async function toggleCategoryVisibility(catId) {
    const cats = State.get("categories");
    const cat = cats.find((c) => c.id === catId);
    if (!cat) return;
    const newVisible = cat.visible === false ? true : false;
    try {
      await DB.updateCategory(catId, { visible: newVisible });
      cat.visible = newVisible;
      State.set("categories", [...cats]);
      renderCategoriesPage();
    } catch (e) {
      console.error(e);
    }
  }

  return {
    init,
    render,
    renderDashboard,
    navigate,
    quickAdd,
    loadCategories,
    loadCategoryItems,
    loadHabitLogs,
    loadAll,
    saveSetup,
    handleAuth,
    resetConfig,
    runSearch,
    toggleCategoryVisibility,
    openCategoryView,
    exportData,
    logout,
  };
})();

// Boot
document.addEventListener("DOMContentLoaded", () => App.init());
