/* ============================================
   Life OS — Schema Builder
   ============================================ */

const Schema = (() => {
  const FIELD_TYPES = [
    { value: "text", label: "Text", icon: "Aa" },
    { value: "number", label: "Number", icon: "#" },
    { value: "date", label: "Date", icon: "📅" },
    { value: "checkbox", label: "Checkbox", icon: "☑" },
    { value: "rating", label: "Rating ★", icon: "★" },
    { value: "dropdown", label: "Dropdown", icon: "▼" },
    { value: "tags", label: "Tags", icon: "🏷" },
    { value: "image", label: "Image", icon: "📷" },
    { value: "url", label: "URL", icon: "🔗" },
    { value: "emoji", label: "Emoji", icon: "😊" },
    { value: "mood", label: "Mood", icon: "🎭" },
  ];

  const ICONS = [
    "📋",
    "◉",
    "💰",
    "✎",
    "📚",
    "🎬",
    "🏋️",
    "🍽️",
    "👥",
    "🔄",
    "💊",
    "🎯",
    "🧠",
    "🏠",
    "✈️",
    "🎓",
    "🛒",
    "👔",
    "💡",
    "📊",
    "⏱️",
    "🌊",
    "🎲",
    "🌟",
    "📦",
    "🔖",
    "🎵",
    "🎮",
    "🐾",
    "🚗",
    "💼",
    "❤️",
  ];

  let _fields = [];
  let _editingCategory = null;

  function openCategoryEditor(category = null) {
    _editingCategory = category;
    _fields = category ? [...category.schema] : [];

    const isEdit = !!category;
    const title = isEdit ? "Edit Category" : "New Category";

    Modal.open({
      title,
      body: _renderEditor(category),
      footer: `
        ${isEdit ? '<button class="btn btn-danger" onclick="Schema._deleteCategory()">Delete</button>' : ""}
        <div style="flex:1"></div>
        <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="Schema._save()">Save</button>
      `,
    });

    _bindFieldEvents();
  }

  function _renderEditor(cat) {
    const name = cat?.name || "";
    const icon = cat?.icon || "📁";
    const color = cat?.color || "#6aab73";
    const viewType = cat?.view_type || "list";

    return `
      <div class="form-group">
        <label class="form-label">Name</label>
        <input type="text" id="cat-name" value="${name}" placeholder="π.χ. Βιβλία, Ταινίες...">
      </div>

      <div class="form-group">
        <label class="form-label">Icon</label>
        <div style="display:flex;flex-wrap:wrap;gap:6px" id="cat-icon-picker">
          ${ICONS.map(
            (ic) => `
            <button type="button" class="btn-icon ${ic === icon ? "selected" : ""}"
                    style="${ic === icon ? "background:var(--accent-primary);color:white" : ""}"
                    onclick="Schema._pickIcon(this,'${ic}')">${ic}</button>
          `,
          ).join("")}
        </div>
        <input type="hidden" id="cat-icon" value="${icon}">
      </div>

      <div class="flex gap-md" style="margin-bottom:var(--space-lg)">
        <div class="form-group" style="flex:1;margin-bottom:0">
          <label class="form-label">Color</label>
          <input type="color" id="cat-color" value="${color}" style="width:100%;height:40px;border:none;border-radius:var(--radius-sm);cursor:pointer">
        </div>
        <div class="form-group" style="flex:1;margin-bottom:0">
          <label class="form-label">View</label>
          <select id="cat-view">
            <option value="list" ${viewType === "list" ? "selected" : ""}>List</option>
            <option value="cards" ${viewType === "cards" ? "selected" : ""}>Cards</option>
            <option value="table" ${viewType === "table" ? "selected" : ""}>Table</option>
            <option value="calendar" ${viewType === "calendar" ? "selected" : ""}>Calendar</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Fields (Schema)</label>
        <div id="schema-fields">
          ${_renderFields()}
        </div>
        <button type="button" class="add-field-btn" onclick="Schema._addField()">
          + Add Field
        </button>
      </div>
    `;
  }

  function _renderFields() {
    return _fields
      .map(
        (field, i) => `
      <div class="schema-field-row" data-index="${i}">
        <input type="text" value="${field.label || ""}" placeholder="Field name"
               onchange="Schema._updateField(${i},'label',this.value)">
        <select onchange="Schema._updateField(${i},'type',this.value)">
          ${FIELD_TYPES.map((t) => `<option value="${t.value}" ${t.value === field.type ? "selected" : ""}>${t.icon} ${t.label}</option>`).join("")}
        </select>
        <button class="remove-field" onclick="Schema._removeField(${i})">✕</button>
      </div>
      ${field.type === "dropdown" ? _renderDropdownOptions(i, field.options || []) : ""}
      ${
        field.type === "text"
          ? `
        <div style="padding:0 var(--space-md) var(--space-sm)">
          <label style="display:flex;align-items:center;gap:6px;font-size:var(--font-xs);color:var(--text-tertiary);cursor:pointer">
            <input type="checkbox" ${field.long ? "checked" : ""} onchange="Schema._updateField(${i},'long',this.checked)" style="width:14px;height:14px">
            Long text (textarea)
          </label>
        </div>
      `
          : ""
      }
    `,
      )
      .join("");
  }

  function _renderDropdownOptions(fieldIndex, options) {
    return `
      <div class="dropdown-options-editor" data-field-index="${fieldIndex}">
        <div style="font-size:var(--font-xs);color:var(--text-tertiary);margin-bottom:4px">Options:</div>
        ${options
          .map(
            (opt, oi) => `
          <div class="dropdown-option-row">
            <input type="text" value="${opt}" placeholder="Option ${oi + 1}"
                   onchange="Schema._updateDropdownOption(${fieldIndex},${oi},this.value)">
            <button class="remove-field" onclick="Schema._removeDropdownOption(${fieldIndex},${oi})" style="font-size:14px">✕</button>
          </div>
        `,
          )
          .join("")}
        <button type="button" class="add-field-btn" style="padding:6px;font-size:var(--font-xs)"
                onclick="Schema._addDropdownOption(${fieldIndex})">+ Option</button>
      </div>
    `;
  }

  function _addField() {
    _fields.push({
      key: "field_" + Date.now(),
      label: "",
      type: "text",
    });
    _refreshFields();
  }

  function _removeField(index) {
    _fields.splice(index, 1);
    _refreshFields();
  }

  function _updateField(index, prop, value) {
    _fields[index][prop] = value;
    // Auto-generate key from label
    if (prop === "label") {
      _fields[index].key =
        value
          .toLowerCase()
          .replace(/\s+/g, "_")
          .replace(/[^a-z0-9_\u0370-\u03FF]/g, "") || "field_" + index;
    }
    if (prop === "type") {
      if (value === "dropdown" && !_fields[index].options) {
        _fields[index].options = [""];
      }
      _refreshFields();
    }
  }

  function _addDropdownOption(fieldIndex) {
    if (!_fields[fieldIndex].options) _fields[fieldIndex].options = [];
    _fields[fieldIndex].options.push("");
    _refreshFields();
  }

  function _removeDropdownOption(fieldIndex, optionIndex) {
    _fields[fieldIndex].options.splice(optionIndex, 1);
    _refreshFields();
  }

  function _updateDropdownOption(fieldIndex, optionIndex, value) {
    _fields[fieldIndex].options[optionIndex] = value;
  }

  function _refreshFields() {
    const container = document.getElementById("schema-fields");
    if (container) container.innerHTML = _renderFields();
  }

  function _bindFieldEvents() {
    // Already using inline event handlers for simplicity
  }

  function _pickIcon(btn, icon) {
    document.getElementById("cat-icon").value = icon;
    document.querySelectorAll("#cat-icon-picker .btn-icon").forEach((b) => {
      b.style.background = "";
      b.style.color = "";
      b.classList.remove("selected");
    });
    btn.style.background = "var(--accent-primary)";
    btn.style.color = "white";
    btn.classList.add("selected");
  }

  async function _save() {
    const name = document.getElementById("cat-name").value.trim();
    if (!name) return alert("Please enter a name!");

    const categoryData = {
      name,
      icon: document.getElementById("cat-icon").value,
      color: document.getElementById("cat-color").value,
      schema: _fields.filter((f) => f.label),
      view_type: document.getElementById("cat-view").value,
    };

    try {
      if (_editingCategory) {
        await DB.updateCategory(_editingCategory.id, categoryData);
      } else {
        categoryData.sort_order = State.get("categories").length;
        const newCat = await DB.createCategory(categoryData);
        // Initialize items state for the new category
        if (newCat && newCat.id) {
          const allItems = State.get("items");
          allItems[newCat.id] = [];
          State.set("items", allItems);
        }
      }
      Modal.close();
      await App.loadCategories();
      // Full re-render so all pages update
      App.render();
    } catch (err) {
      console.error("Save category error:", err);
      alert("Save error: " + err.message);
    }
  }

  async function _deleteCategory() {
    if (!_editingCategory) return;
    Modal.confirm({
      title: "Delete Category",
      message: `Are you sure you want to delete "${_editingCategory.name}" and ALL its data;`,
      confirmText: "Delete",
      onConfirm: async () => {
        try {
          await DB.deleteCategory(_editingCategory.id);
          // Remove from items state too
          const allItems = State.get("items");
          delete allItems[_editingCategory.id];
          State.set("items", allItems);
          await App.loadCategories();
          App.render();
        } catch (err) {
          console.error("Delete error:", err);
          alert("Delete error: " + err.message);
        }
      },
    });
  }

  // --- Built-in category templates ---
  function getBuiltinTemplates() {
    return [
      {
        name: "Tasks",
        icon: "📋",
        color: "#5b9bd5",
        is_builtin: true,
        view_type: "list",
        schema: [
          { key: "title", label: "Title", type: "text" },
          {
            key: "priority",
            label: "Priority",
            type: "dropdown",
            options: ["Low", "Medium", "High"],
          },
          { key: "deadline", label: "Deadline", type: "date" },
          { key: "done", label: "Done", type: "checkbox" },
          { key: "notes", label: "Notes", type: "text", long: true },
        ],
      },
      {
        name: "Habits",
        icon: "◉",
        color: "#6aab73",
        is_builtin: true,
        view_type: "list",
        schema: [
          { key: "name", label: "Habit", type: "text" },
          {
            key: "type",
            label: "Type",
            type: "dropdown",
            options: ["Build", "Quit"],
          },
          {
            key: "frequency",
            label: "Frequency",
            type: "dropdown",
            options: ["Daily", "Weekly"],
          },
        ],
      },
      {
        name: "Expenses",
        icon: "💰",
        color: "#e8a94a",
        is_builtin: true,
        view_type: "list",
        schema: [
          { key: "amount", label: "Amount (€)", type: "number" },
          { key: "description", label: "Description", type: "text" },
          {
            key: "category",
            label: "Category",
            type: "dropdown",
            options: [
              "Food",
              "Transport",
              "Entertainment",
              "Bills",
              "Shopping",
              "Other",
            ],
          },
          { key: "date", label: "Date", type: "date" },
          { key: "recurring", label: "Recurring", type: "checkbox" },
        ],
      },
      {
        name: "Journal",
        icon: "✎",
        color: "#a78bfa",
        is_builtin: true,
        view_type: "list",
        schema: [
          { key: "mood", label: "Mood", type: "mood" },
          { key: "energy", label: "Energy", type: "rating" },
          {
            key: "text",
            label: "What happened today",
            type: "text",
            long: true,
          },
          { key: "gratitude", label: "Gratitude", type: "text" },
          { key: "date", label: "Date", type: "date" },
        ],
      },
      {
        name: "Books",
        icon: "📚",
        color: "#c06aab",
        is_builtin: true,
        view_type: "cards",
        schema: [
          { key: "cover", label: "Cover", type: "image" },
          { key: "title", label: "Title", type: "text" },
          { key: "author", label: "Author", type: "text" },
          {
            key: "status",
            label: "Status",
            type: "dropdown",
            options: ["Want to Read", "Reading", "Finished", "Dropped"],
          },
          { key: "rating", label: "Rating", type: "rating" },
          { key: "notes", label: "Notes", type: "text", long: true },
        ],
      },
      {
        name: "Movies",
        icon: "🎬",
        color: "#e85d4a",
        is_builtin: true,
        view_type: "cards",
        schema: [
          { key: "poster", label: "Poster", type: "image" },
          { key: "title", label: "Title", type: "text" },
          {
            key: "type",
            label: "Type",
            type: "dropdown",
            options: ["Movie", "Series", "Documentary"],
          },
          {
            key: "status",
            label: "Status",
            type: "dropdown",
            options: ["Want to Watch", "Watching", "Watched"],
          },
          { key: "rating", label: "Rating", type: "rating" },
          { key: "comments", label: "Comments", type: "text", long: true },
        ],
      },
      {
        name: "Subscriptions",
        icon: "🔄",
        color: "#4ecdc4",
        is_builtin: true,
        view_type: "list",
        schema: [
          { key: "service", label: "Service", type: "text" },
          { key: "cost", label: "Cost (€)", type: "number" },
          {
            key: "cycle",
            label: "Cycle",
            type: "dropdown",
            options: ["Monthly", "Yearly"],
          },
          { key: "renewal_date", label: "Renewal Date", type: "date" },
          {
            key: "status",
            label: "Status",
            type: "dropdown",
            options: ["Active", "Free Trial", "Cancelled", "Paused"],
          },
          { key: "trial_end", label: "Trial End", type: "date" },
          { key: "cancel_url", label: "Cancel URL", type: "url" },
        ],
      },
      {
        name: "Contacts",
        icon: "👥",
        color: "#5b9bd5",
        is_builtin: true,
        view_type: "cards",
        schema: [
          { key: "name", label: "Name", type: "text" },
          { key: "photo", label: "Photo", type: "image" },
          {
            key: "relationship",
            label: "Relationship",
            type: "dropdown",
            options: ["Friend", "Family", "Colleague", "Acquaintance"],
          },
          { key: "birthday", label: "Birthday", type: "date" },
          { key: "last_contact", label: "Last Contact", type: "date" },
          { key: "gift_ideas", label: "Gift Ideas", type: "text", long: true },
          { key: "notes", label: "Notes", type: "text", long: true },
        ],
      },
      {
        name: "Goals",
        icon: "🎯",
        color: "#e8a94a",
        is_builtin: true,
        view_type: "list",
        schema: [
          { key: "goal", label: "Goal", type: "text" },
          {
            key: "life_area",
            label: "Life Area",
            type: "dropdown",
            options: [
              "Health",
              "Career",
              "Relationships",
              "Finances",
              "Learning",
              "Personal",
            ],
          },
          {
            key: "timeframe",
            label: "Timeframe",
            type: "dropdown",
            options: ["Weekly", "Monthly", "Quarterly", "Yearly"],
          },
          { key: "deadline", label: "Deadline", type: "date" },
          { key: "progress", label: "Progress %", type: "number" },
          {
            key: "status",
            label: "Status",
            type: "dropdown",
            options: ["In Progress", "Completed", "Postponed"],
          },
        ],
      },
      {
        name: "Projects",
        icon: "📦",
        color: "#a78bfa",
        is_builtin: true,
        view_type: "list",
        schema: [
          { key: "title", label: "Title", type: "text" },
          {
            key: "description",
            label: "Description",
            type: "text",
            long: true,
          },
          {
            key: "status",
            label: "Status",
            type: "dropdown",
            options: ["Todo", "Idea", "In Progress", "Completed", "On Hold"],
          },
          { key: "deadline", label: "Deadline", type: "date" },
          { key: "progress", label: "Progress %", type: "number" },
          {
            key: "life_area",
            label: "Life Area",
            type: "dropdown",
            options: ["Personal", "Work", "Side Project"],
          },
        ],
      },
      {
        name: "Travel",
        icon: "✈️",
        color: "#93B2BB",
        is_builtin: true,
        view_type: "cards",
        schema: [
          { key: "destination", label: "Destination", type: "text" },
          { key: "country", label: "Country", type: "text" },
          { key: "photo", label: "Photo", type: "image" },
          {
            key: "status",
            label: "Status",
            type: "dropdown",
            options: ["Want to Go", "Completed"],
          },
          {
            key: "latitude",
            label: "Latitude",
            type: "number",
            step: "any",
            placeholder: "37.9838",
          },
          {
            key: "longitude",
            label: "Longitude",
            type: "number",
            step: "any",
            placeholder: "23.7275",
          },
          { key: "date_from", label: "From", type: "date" },
          { key: "date_to", label: "To", type: "date" },
          { key: "budget", label: "Budget (€)", type: "number" },
          {
            key: "notes",
            label: "Notes / Highlights",
            type: "text",
            long: true,
          },
        ],
      },
      {
        name: "Wardrobe",
        icon: "👔",
        color: "#D1745D",
        is_builtin: true,
        view_type: "cards",
        schema: [
          { key: "item", label: "Item", type: "text" },
          { key: "photo", label: "Photo", type: "image" },
          {
            key: "type",
            label: "Type",
            type: "dropdown",
            options: [
              "Top",
              "Bottom",
              "Shoes",
              "Outerwear",
              "Accessory",
              "Other",
            ],
          },
          { key: "season", label: "Season", type: "tags" },
          { key: "color", label: "Color", type: "text" },
          { key: "times_worn", label: "Times Worn", type: "number" },
          { key: "price", label: "Price (€)", type: "number" },
        ],
      },
      {
        name: "Ideas & Bucket List",
        icon: "💡",
        color: "#DDAB63",
        is_builtin: true,
        view_type: "list",
        schema: [
          { key: "idea", label: "Idea", type: "text" },
          { key: "category", label: "Category", type: "tags" },
          { key: "priority", label: "Priority", type: "rating" },
          { key: "done", label: "Done", type: "checkbox" },
          { key: "completed_date", label: "Completed On", type: "date" },
          { key: "notes", label: "Notes", type: "text", long: true },
        ],
      },
      {
        name: "Wishlists",
        icon: "🛒",
        color: "#98AA6D",
        is_builtin: true,
        view_type: "list",
        schema: [
          { key: "item", label: "Item", type: "text" },
          { key: "image", label: "Image", type: "image" },
          { key: "price", label: "Price (€)", type: "number" },
          {
            key: "category",
            label: "Category",
            type: "dropdown",
            options: ["Tech", "Clothing", "Home", "Books", "Other"],
          },
          { key: "priority", label: "Priority", type: "rating" },
          { key: "url", label: "Link", type: "url" },
          {
            key: "status",
            label: "Status",
            type: "dropdown",
            options: ["Want", "Purchased"],
          },
        ],
      },
      {
        name: "Stadiums",
        icon: "🏟️",
        color: "#455546",
        is_builtin: true,
        view_type: "cards",
        schema: [
          { key: "stadium", label: "Stadium", type: "text" },
          { key: "team", label: "Team", type: "text" },
          {
            key: "country",
            label: "Country",
            type: "dropdown",
            options: [
              "Albania",
              "Argentina",
              "Armenia",
              "Australia",
              "Austria",
              "Azerbaijan",
              "Belgium",
              "Bolivia",
              "Bosnia and Herzegovina",
              "Brazil",
              "Bulgaria",
              "Cambodia",
              "Canada",
              "Chile",
              "China",
              "Colombia",
              "Costa Rica",
              "Croatia",
              "Cuba",
              "Cyprus",
              "Czech Republic",
              "Denmark",
              "Dominican Republic",
              "Ecuador",
              "Egypt",
              "Estonia",
              "Ethiopia",
              "Finland",
              "France",
              "Georgia",
              "Germany",
              "Ghana",
              "Greece",
              "Guatemala",
              "Hungary",
              "Iceland",
              "India",
              "Indonesia",
              "Iran",
              "Iraq",
              "Ireland",
              "Israel",
              "Italy",
              "Jamaica",
              "Japan",
              "Jordan",
              "Kazakhstan",
              "Kenya",
              "Kosovo",
              "Kuwait",
              "Latvia",
              "Lebanon",
              "Lithuania",
              "Luxembourg",
              "Malaysia",
              "Malta",
              "Mexico",
              "Moldova",
              "Monaco",
              "Mongolia",
              "Montenegro",
              "Morocco",
              "Mozambique",
              "Namibia",
              "Nepal",
              "Netherlands",
              "New Zealand",
              "Nigeria",
              "North Macedonia",
              "Norway",
              "Oman",
              "Pakistan",
              "Panama",
              "Paraguay",
              "Peru",
              "Philippines",
              "Poland",
              "Portugal",
              "Qatar",
              "Romania",
              "Russia",
              "Saudi Arabia",
              "Senegal",
              "Serbia",
              "Singapore",
              "Slovakia",
              "Slovenia",
              "South Africa",
              "South Korea",
              "Spain",
              "Sri Lanka",
              "Sweden",
              "Switzerland",
              "Taiwan",
              "Tanzania",
              "Thailand",
              "Trinidad and Tobago",
              "Tunisia",
              "Turkey",
              "Uganda",
              "Ukraine",
              "United Arab Emirates",
              "United Kingdom",
              "United States of America",
              "Uruguay",
              "Uzbekistan",
              "Venezuela",
              "Vietnam",
              "Zambia",
              "Zimbabwe",
            ],
          },
          { key: "photo", label: "Photo", type: "image" },
          { key: "date", label: "Date Visited", type: "date" },
          { key: "latitude", label: "Latitude", type: "number" },
          { key: "longitude", label: "Longitude", type: "number" },
          { key: "capacity", label: "Capacity", type: "number" },
          {
            key: "status",
            label: "Status",
            type: "dropdown",
            options: ["Want to Go", "Visited"],
          },
          { key: "match", label: "Match", type: "text" },
          { key: "notes", label: "Notes", type: "text", long: true },
        ],
      },
      {
        name: "Bookmarks",
        icon: "🔖",
        color: "#455546",
        is_builtin: true,
        view_type: "list",
        schema: [
          { key: "title", label: "Title", type: "text" },
          { key: "url", label: "URL", type: "url" },
          { key: "tags", label: "Tags", type: "tags" },
          {
            key: "type",
            label: "Type",
            type: "dropdown",
            options: ["Article", "Video", "Tool", "Podcast", "Other"],
          },
          {
            key: "status",
            label: "Status",
            type: "dropdown",
            options: ["Unread", "Read"],
          },
          { key: "notes", label: "Notes", type: "text", long: true },
        ],
      },
    ];
  }

  return {
    FIELD_TYPES,
    ICONS,
    openCategoryEditor,
    getBuiltinTemplates,
    _addField,
    _removeField,
    _updateField,
    _addDropdownOption,
    _removeDropdownOption,
    _updateDropdownOption,
    _pickIcon,
    _save,
    _deleteCategory,
    _refreshFields,
  };
})();
