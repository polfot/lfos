-- ============================================
-- Life OS — Supabase Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categories: user-defined collections with custom schemas
CREATE TABLE categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📁',
  color TEXT DEFAULT '#6aab73',
  schema JSONB NOT NULL DEFAULT '[]',
  view_type TEXT DEFAULT 'list' CHECK (view_type IN ('list', 'cards', 'table', 'calendar')),
  sort_order INT DEFAULT 0,
  visible BOOLEAN DEFAULT true,
  is_builtin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Items: entries in any category (flexible JSONB data)
CREATE TABLE items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habit logs: daily check-ins for habit items
CREATE TABLE habit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  value JSONB DEFAULT '{"done": false}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, log_date)
);

-- Widget layout: dashboard order & visibility
CREATE TABLE widget_layout (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0,
  visible BOOLEAN DEFAULT true,
  collapsed BOOLEAN DEFAULT false,
  UNIQUE(user_id, category_id)
);

-- Indexes for performance
CREATE INDEX idx_items_category ON items(category_id);
CREATE INDEX idx_items_user ON items(user_id);
CREATE INDEX idx_items_data ON items USING GIN(data);
CREATE INDEX idx_habit_logs_item_date ON habit_logs(item_id, log_date);
CREATE INDEX idx_widget_layout_user ON widget_layout(user_id, sort_order);
CREATE INDEX idx_categories_user ON categories(user_id, sort_order);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_layout ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own categories"
  ON categories FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own items"
  ON items FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own habit_logs"
  ON habit_logs FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own widget_layout"
  ON widget_layout FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- Seed: Built-in category templates
-- ============================================
-- These get inserted per user on first login (handled in JS)
