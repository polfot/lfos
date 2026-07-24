/* ============================================
   Life OS — Database Layer (Supabase)
   ============================================ */

const DB = (() => {
  let supabase = null;

  function init(url, key) {
    supabase = window.supabase.createClient(url, key);
    return supabase;
  }

  function client() {
    if (!supabase) throw new Error('DB not initialized. Call DB.init(url, key) first.');
    return supabase;
  }

  // --- Auth ---
  async function getUser() {
    const { data } = await client().auth.getUser();
    return data?.user || null;
  }

  async function signIn(email, password) {
    return client().auth.signInWithPassword({ email, password });
  }

  async function signUp(email, password) {
    return client().auth.signUp({ email, password });
  }

  async function signOut() {
    return client().auth.signOut();
  }

  function onAuthChange(callback) {
    return client().auth.onAuthStateChange(callback);
  }

  // --- Categories ---
  async function getCategories() {
    const { data, error } = await client()
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function createCategory(category) {
    const user = await getUser();
    if (!user) throw new Error('Not authenticated. Please sign in again.');
    const { data, error } = await client()
      .from('categories')
      .insert({ ...category, user_id: user.id })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function updateCategory(id, updates) {
    const { data, error } = await client()
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function deleteCategory(id) {
    const { error } = await client()
      .from('categories')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async function reorderCategories(orderedIds) {
    const updates = orderedIds.map((id, i) => ({
      id,
      sort_order: i,
    }));
    for (const u of updates) {
      await client()
        .from('categories')
        .update({ sort_order: u.sort_order })
        .eq('id', u.id);
    }
  }

  // --- Items ---
  async function getItems(categoryId, options = {}) {
    let query = client()
      .from('items')
      .select('*')
      .eq('category_id', categoryId);

    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? true });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async function getAllItems() {
    const { data, error } = await client()
      .from('items')
      .select('*, categories(name, icon, schema)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function createItem(categoryId, itemData) {
    const user = await getUser();
    if (!user) throw new Error('Not authenticated. Please sign in again.');
    const { data, error } = await client()
      .from('items')
      .insert({
        category_id: categoryId,
        user_id: user.id,
        data: itemData,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function updateItem(id, itemData) {
    const { data, error } = await client()
      .from('items')
      .update({ data: itemData })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function deleteItem(id) {
    const { error } = await client()
      .from('items')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // --- Habit Logs ---
  async function getHabitLogs(itemId, fromDate, toDate) {
    const { data, error } = await client()
      .from('habit_logs')
      .select('*')
      .eq('item_id', itemId)
      .gte('log_date', fromDate)
      .lte('log_date', toDate)
      .order('log_date', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function toggleHabitLog(itemId, date) {
    const user = await getUser();
    // Check if exists
    const { data: existing } = await client()
      .from('habit_logs')
      .select('*')
      .eq('item_id', itemId)
      .eq('log_date', date)
      .single();

    if (existing) {
      const done = !existing.value?.done;
      const { data, error } = await client()
        .from('habit_logs')
        .update({ value: { done } })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await client()
        .from('habit_logs')
        .insert({
          item_id: itemId,
          user_id: user.id,
          log_date: date,
          value: { done: true },
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  }

  // --- Widget Layout ---
  async function getWidgetLayout() {
    const { data, error } = await client()
      .from('widget_layout')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function saveWidgetLayout(layouts) {
    const user = await getUser();
    for (const layout of layouts) {
      await client()
        .from('widget_layout')
        .upsert({
          user_id: user.id,
          category_id: layout.category_id,
          sort_order: layout.sort_order,
          visible: layout.visible ?? true,
          collapsed: layout.collapsed ?? false,
        }, { onConflict: 'user_id,category_id' });
    }
  }

  return {
    init, client, getUser,
    signIn, signUp, signOut, onAuthChange,
    getCategories, createCategory, updateCategory, deleteCategory, reorderCategories,
    getItems, getAllItems, createItem, updateItem, deleteItem,
    getHabitLogs, toggleHabitLog,
    getWidgetLayout, saveWidgetLayout,
  };
})();
