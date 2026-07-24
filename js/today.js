/* ============================================
   Life OS — Today View
   ============================================ */

const Today = (() => {
  const GREEK_DAYS = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const GREEK_MONTHS_SHORT = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  function render() {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, "0");
    const monthStr = GREEK_MONTHS_SHORT[now.getMonth()];
    const year = now.getFullYear().toString();
    const dayName = GREEK_DAYS[now.getDay()];

    // Gather today's data
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
            time: t.data.deadline < today ? "Overdue!" : "",
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
                title: `${i.data.service} trial ends in ${days}d!`,
                type: "urgent",
              });
            }
          }
        });
      }

      if (cat.name === "Contacts") {
        items.forEach((i) => {
          if (i.data.birthday) {
            const bday = i.data.birthday.slice(5); // MM-DD
            const todayMD = today.slice(5);
            if (bday === todayMD) {
              alerts.push({
                icon: "🎂",
                title: `Birthday: ${i.data.name}!`,
                type: "birthday",
              });
            }
          }
        });
      }

      // Generic: check for any date field matching today
      if (
        !["Tasks", "Habits", "Subscriptions", "Contacts"].includes(cat.name)
      ) {
        const schema = cat.schema || [];
        items.forEach((item) => {
          schema.forEach((field) => {
            if (field.type === "date" && item.data[field.key] === today) {
              const titleField = schema[0];
              todayEvents.push({
                icon: cat.icon,
                title: titleField
                  ? item.data[titleField.key] || cat.name
                  : cat.name,
                time: "",
                type: "today",
              });
            }
          });
        });
      }
    }

    // Greeting based on time
    const hour = now.getHours();
    const mornings = [
      "Good morning",
      "Rise and shine",
      "Morning, champ",
      "Top of the morning",
      "Fresh start today",
    ];
    const afternoons = [
      "Good afternoon",
      "Hope your day is going well",
      "Afternoon check-in",
      "Keep it up today",
      "Halfway through the day",
    ];
    const evenings = [
      "Good evening",
      "Winding down",
      "Evening vibes",
      "Almost done for today",
      "Time to recharge",
    ];
    const pool = hour < 12 ? mornings : hour < 18 ? afternoons : evenings;
    const dayOfYear = Math.floor(
      (new Date() - new Date(now.getFullYear(), 0, 0)) / 86400000,
    );
    const greeting = pool[dayOfYear % pool.length];

    // Build summary text
    const parts = [];
    if (taskCount > 0)
      parts.push(
        `<span class="icon-inline">☑</span> <strong>${taskCount} task${taskCount > 1 ? "s" : ""}</strong>`,
      );
    if (habitCount > 0)
      parts.push(
        `<span class="icon-inline">◉</span> <strong>${habitCount} habit${habitCount > 1 ? "s" : ""}</strong>`,
      );
    if (alerts.length > 0)
      parts.push(
        `<span class="icon-inline">⚠️</span> <strong>${alerts.length} alert${alerts.length > 1 ? "s" : ""}</strong>`,
      );

    const summaryText = parts.length
      ? `You have ${parts.join(", ")} today.`
      : "Clear day! 🎉";

    // Render
    return `
      <div class="header">
        <div class="header-top">
          <div class="header-date-big">
            ${day}<span class="dot"></span>
          </div>
          <div class="header-date-right">
            <div class="month">${monthStr} ${year}</div>
            <div>${dayName}</div>
          </div>
        </div>

        <div class="header-greeting">
          ${greeting} 👋, <b>Foivos!</b><br>
          ${summaryText}
        </div>

        ${
          alerts.length
            ? `
          <div style="display:flex;flex-direction:column;gap:var(--space-sm);margin-bottom:var(--space-md)">
            ${alerts
              .map(
                (a) => `
              <div style="display:flex;align-items:center;gap:var(--space-sm);padding:var(--space-sm) var(--space-md);background:rgba(232,93,74,0.1);border-radius:var(--radius-sm);font-size:var(--font-sm)">
                <span>${a.icon}</span>
                <span>${a.title}</span>
              </div>
            `,
              )
              .join("")}
          </div>
        `
            : ""
        }
      </div>

      ${
        todayEvents.length
          ? `
        <div style="padding:0 var(--space-lg);margin-bottom:var(--space-md)">
          ${todayEvents
            .map(
              (ev) => `
            <div class="item-row" style="background:var(--bg-surface)">
              <div class="timeline-dot" style="background:var(--priority-${ev.priority === "High" ? "high" : ev.priority === "Low" ? "low" : "medium"})"></div>
              <div class="item-content">
                <div class="item-title">${ev.title}</div>
              </div>
              ${ev.time ? `<span class="deadline-tag ${ev.type === "overdue" ? "urgent" : "soon"}">${ev.time}</span>` : ""}
            </div>
          `,
            )
            .join("")}
        </div>
      `
          : ""
      }
    `;
  }

  return { render };
})();
