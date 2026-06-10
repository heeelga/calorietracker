CREATE TABLE IF NOT EXISTS profiles (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  height_cm INT,
  weight_kg DECIMAL(5,2),
  birth_year INT,
  gender ENUM('male','female','other') DEFAULT 'male',
  activity_level ENUM('sedentary','light','moderate','active','very_active') DEFAULT 'moderate',
  goal ENUM('lose','maintain','gain') DEFAULT 'maintain',
  target_weight_kg DECIMAL(5,2),
  calorie_target INT,
  protein_target_g INT,
  carbs_target_g INT,
  fat_target_g INT,
  xp INT DEFAULT 0,
  level INT DEFAULT 1,
  streak_days INT DEFAULT 0,
  last_log_date DATE,
  onboarding_done BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  is_banned BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS log_entries (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  log_date DATE NOT NULL,
  meal_type ENUM('breakfast','lunch','dinner','snack') NOT NULL,
  food_id VARCHAR(255),
  food_name VARCHAR(255) NOT NULL,
  food_brand VARCHAR(255),
  amount_grams DECIMAL(8,2) NOT NULL,
  portion_label VARCHAR(255),
  calories DECIMAL(8,2) DEFAULT 0,
  protein_g DECIMAL(8,2) DEFAULT 0,
  carbs_g DECIMAL(8,2) DEFAULT 0,
  fat_g DECIMAL(8,2) DEFAULT 0,
  fiber_g DECIMAL(8,2) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_date (user_id, log_date)
);

CREATE TABLE IF NOT EXISTS weight_log (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  log_date DATE NOT NULL,
  weight_kg DECIMAL(5,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_date (user_id, log_date)
);

CREATE TABLE IF NOT EXISTS meals (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  total_calories DECIMAL(8,2) DEFAULT 0,
  total_protein_g DECIMAL(8,2) DEFAULT 0,
  total_carbs_g DECIMAL(8,2) DEFAULT 0,
  total_fat_g DECIMAL(8,2) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id)
);

CREATE TABLE IF NOT EXISTS meal_ingredients (
  id VARCHAR(36) PRIMARY KEY,
  meal_id VARCHAR(36) NOT NULL,
  food_name VARCHAR(255) NOT NULL,
  food_brand VARCHAR(255),
  food_id VARCHAR(255),
  amount_grams DECIMAL(8,2) NOT NULL,
  portion_label VARCHAR(255),
  calories_per_100g DECIMAL(8,2) DEFAULT 0,
  protein_per_100g DECIMAL(8,2) DEFAULT 0,
  carbs_per_100g DECIMAL(8,2) DEFAULT 0,
  fat_per_100g DECIMAL(8,2) DEFAULT 0,
  fiber_per_100g DECIMAL(8,2) DEFAULT 0,
  calories DECIMAL(8,2) DEFAULT 0,
  protein_g DECIMAL(8,2) DEFAULT 0,
  carbs_g DECIMAL(8,2) DEFAULT 0,
  fat_g DECIMAL(8,2) DEFAULT 0,
  fiber_g DECIMAL(8,2) DEFAULT 0,
  INDEX idx_meal (meal_id)
);

CREATE TABLE IF NOT EXISTS badges (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  badge_key VARCHAR(100) NOT NULL,
  earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_badge (user_id, badge_key)
);

CREATE TABLE IF NOT EXISTS favorites (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  food_name VARCHAR(255) NOT NULL,
  food_brand VARCHAR(255),
  food_id VARCHAR(255),
  barcode VARCHAR(100),
  calories_per_100g DECIMAL(8,2) DEFAULT 0,
  protein_per_100g DECIMAL(8,2) DEFAULT 0,
  carbs_per_100g DECIMAL(8,2) DEFAULT 0,
  fat_per_100g DECIMAL(8,2) DEFAULT 0,
  fiber_per_100g DECIMAL(8,2) DEFAULT 0,
  image_url TEXT,
  package_weight_g DECIMAL(8,2),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id)
);
