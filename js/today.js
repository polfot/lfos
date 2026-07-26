/* ============================================
   Life OS — Today View
   ============================================ */

const Today = (() => {
  const DAYS = [
    "Sunday", "Monday", "Tuesday", "Wednesday",
    "Thursday", "Friday", "Saturday",
  ];
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  function render() {
    const now = new Date();
    const day = now.getDate();
    const monthStr = MONTHS[now.getMonth()];
    const year = now.getFullYear();
    const dayName = DAYS[now.getDay()];

    const categories = State.get("categories");
    const allItems = State.get("items");
    const today = State.today();

    let taskCount = 0;
    let habitCount = 0;
    let todayEvents = [];
    let alerts = [];

    for (const cat of categories) {
      const items = allItems[cat.id] || [];

      if (cat.name === "Tasks") {
        const todayTasks = items.filter(
          (i) =>
            !i.data.done &&
            (i.data.deadline === today || i.data.deadline < today),
        );
        taskCount = todayTasks.length;
        todayTasks.forEach((t) => {
          todayEvents.push({
            icon: cat.icon,
            title: t.data.title,
            time: t.data.deadline < today ? "Overdue" : "",
            type: t.data.deadline < today ? "overdue" : "today",
            priority: t.data.priority,
          });
        });
      }

      if (cat.name === "Habits") {
        habitCount = items.length;
      }

      if (cat.name === "Subscriptions") {
        items.forEach((i) => {
          if (i.data.status === "Free Trial" && i.data.trial_end) {
            const days = State.daysUntil(i.data.trial_end);
            if (days >= 0 && days <= 3) {
              alerts.push({
                icon: "⚠️",
                title: `${i.data.service} trial ends in ${days}d`,
                type: "urgent",
              });
            }
          }
        });
      }

      if (cat.name === "Contacts") {
        items.forEach((i) => {
          if (i.data.birthday) {
            const bday = i.data.birthday.slice(5);
            const todayMD = today.slice(5);
            if (bday === todayMD) {
              alerts.push({
                icon: "🎂",
                title: `${i.data.name}'s birthday`,
                type: "birthday",
              });
            }
          }
        });
      }

      if (!["Tasks", "Habits", "Subscriptions", "Contacts"].includes(cat.name)) {
        const schema = cat.schema || [];
        items.forEach((item) => {
          schema.forEach((field) => {
            if (field.type === "date" && item.data[field.key] === today) {
              const titleField = schema[0];
              todayEvents.push({
                icon: cat.icon,
                title: titleField ? item.data[titleField.key] || cat.name : cat.name,
                time: "",
                type: "today",
              });
            }
          });
        });
      }
    }

    const hour = now.getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

    const parts = [];
    if (taskCount > 0)
      parts.push(`☑ <strong>${taskCount} task${taskCount > 1 ? "s" : ""}</strong>`);
    if (habitCount > 0)
      parts.push(`◉ <strong>${habitCount} habit${habitCount > 1 ? "s" : ""}</strong>`);
    if (alerts.length > 0)
      parts.push(`⚠ <strong>${alerts.length} alert${alerts.length > 1 ? "s" : ""}</strong>`);

    const summaryText = parts.length
      ? `You have ${parts.join(", ")} today.`
      : "Nothing planned today.";

    return `
      <div class="header">
        <div class="header-meta">${dayName}, ${monthStr} ${day}</div>
        <div class="header-greeting">${greeting}, Foivos! 👋</div>
        <div class="header-summary">${summaryText}</div>
      </div>

      ${alerts.length ? `
        <div style="padding:0;margin-bottom:var(--space-sm)">
          ${alerts.map(a => `
            <div style="display:flex;align-items:center;gap:var(--space-sm);padding:var(--space-md) var(--space-lg);background:var(--bg-surface);border-radius:var(--radius-md);font-size:var(--font-md);margin-bottom:var(--space-sm)">
              <span>${a.icon}</span>
              <span>${a.title}</span>
            </div>
          `).join("")}
        </div>
      ` : ""}

      ${todayEvents.length ? `
        <div style="padding:0;margin-bottom:var(--space-sm)">
          <div style="background:var(--bg-surface);border-radius:var(--radius-md);overflow:hidden">
            ${todayEvents.map(ev => `
              <div style="display:flex;align-items:center;gap:var(--space-md);padding:var(--space-md) var(--space-lg);border-bottom:0.5px solid var(--border-subtle)">
                <div class="timeline-dot" style="background:var(--priority-${ev.priority === "High" ? "high" : ev.priority === "Low" ? "low" : "medium"})"></div>
                <div style="flex:1;font-size:var(--font-md)">${ev.title}</div>
                ${ev.time ? `<span class="deadline-tag ${ev.type === "overdue" ? "urgent" : "soon"}">${ev.time}</span>` : ""}
              </div>
            `).join("")}
          </div>
        </div>
      ` : ""}
    `;
  }

  return { render };
})();
