-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  birth_year INTEGER,
  height_cm INTEGER,
  weight_kg NUMERIC(5,1),
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')) DEFAULT 'moderate',
  goal TEXT CHECK (goal IN ('lose', 'maintain', 'gain')) DEFAULT 'maintain',
  calorie_target INTEGER DEFAULT 2000,
  protein_target_g INTEGER DEFAULT 150,
  carbs_target_g INTEGER DEFAULT 250,
  fat_target_g INTEGER DEFAULT 65,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak_days INTEGER DEFAULT 0,
  last_log_date DATE,
  onboarding_done BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CUSTOM FOODS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS custom_foods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT,
  calories_per_100g NUMERIC(7,2) NOT NULL,
  protein_per_100g NUMERIC(6,2) DEFAULT 0,
  carbs_per_100g NUMERIC(6,2) DEFAULT 0,
  fat_per_100g NUMERIC(6,2) DEFAULT 0,
  fiber_per_100g NUMERIC(6,2) DEFAULT 0,
  barcode TEXT,
  package_weight_g INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MEALS TABLE (Gerichte / Rezepte)
-- ============================================================
CREATE TABLE IF NOT EXISTS meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  total_calories NUMERIC(7,2) DEFAULT 0,
  total_protein_g NUMERIC(6,2) DEFAULT 0,
  total_carbs_g NUMERIC(6,2) DEFAULT 0,
  total_fat_g NUMERIC(6,2) DEFAULT 0,
  total_fiber_g NUMERIC(6,2) DEFAULT 0,
  servings INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MEAL INGREDIENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS meal_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  food_id TEXT NOT NULL,
  food_name TEXT NOT NULL,
  food_brand TEXT,
  amount_grams NUMERIC(7,2) NOT NULL,
  portion_label TEXT,
  calories NUMERIC(7,2) DEFAULT 0,
  protein_g NUMERIC(6,2) DEFAULT 0,
  carbs_g NUMERIC(6,2) DEFAULT 0,
  fat_g NUMERIC(6,2) DEFAULT 0,
  fiber_g NUMERIC(6,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LOG ENTRIES TABLE (Daily Food Log)
-- ============================================================
CREATE TABLE IF NOT EXISTS log_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  food_id TEXT NOT NULL,
  food_name TEXT NOT NULL,
  food_brand TEXT,
  amount_grams NUMERIC(7,2) NOT NULL,
  portion_label TEXT,
  calories NUMERIC(7,2) NOT NULL,
  protein_g NUMERIC(6,2) DEFAULT 0,
  carbs_g NUMERIC(6,2) DEFAULT 0,
  fat_g NUMERIC(6,2) DEFAULT 0,
  fiber_g NUMERIC(6,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WEIGHT LOG TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS weight_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg NUMERIC(5,1) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);

-- ============================================================
-- BADGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_key)
);

-- ============================================================
-- FAVORITES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_id TEXT NOT NULL,
  food_name TEXT NOT NULL,
  food_brand TEXT,
  calories_per_100g NUMERIC(7,2) NOT NULL,
  protein_per_100g NUMERIC(6,2) DEFAULT 0,
  carbs_per_100g NUMERIC(6,2) DEFAULT 0,
  fat_per_100g NUMERIC(6,2) DEFAULT 0,
  fiber_per_100g NUMERIC(6,2) DEFAULT 0,
  barcode TEXT,
  package_weight_g INTEGER,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, food_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Custom foods policies
CREATE POLICY "Users can view own custom foods" ON custom_foods FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own custom foods" ON custom_foods FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own custom foods" ON custom_foods FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own custom foods" ON custom_foods FOR DELETE USING (auth.uid() = user_id);

-- Meals policies
CREATE POLICY "Users can view own meals" ON meals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meals" ON meals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meals" ON meals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own meals" ON meals FOR DELETE USING (auth.uid() = user_id);

-- Meal ingredients policies
CREATE POLICY "Users can view own meal ingredients" ON meal_ingredients FOR SELECT
  USING (EXISTS (SELECT 1 FROM meals WHERE meals.id = meal_ingredients.meal_id AND meals.user_id = auth.uid()));
CREATE POLICY "Users can insert own meal ingredients" ON meal_ingredients FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM meals WHERE meals.id = meal_ingredients.meal_id AND meals.user_id = auth.uid()));
CREATE POLICY "Users can delete own meal ingredients" ON meal_ingredients FOR DELETE
  USING (EXISTS (SELECT 1 FROM meals WHERE meals.id = meal_ingredients.meal_id AND meals.user_id = auth.uid()));

-- Log entries policies
CREATE POLICY "Users can view own log entries" ON log_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own log entries" ON log_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own log entries" ON log_entries FOR DELETE USING (auth.uid() = user_id);

-- Weight log policies
CREATE POLICY "Users can view own weight log" ON weight_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own weight log" ON weight_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own weight log" ON weight_log FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own weight log" ON weight_log FOR DELETE USING (auth.uid() = user_id);

-- Badges policies
CREATE POLICY "Users can view own badges" ON badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own badges" ON badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Favorites policies
CREATE POLICY "Users can view own favorites" ON favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favorites" ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON favorites FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meals_updated_at BEFORE UPDATE ON meals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_log_entries_user_date ON log_entries(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_weight_log_user_date ON weight_log(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_custom_foods_user ON custom_foods(user_id);
CREATE INDEX IF NOT EXISTS idx_meals_user ON meals(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_badges_user ON badges(user_id);
