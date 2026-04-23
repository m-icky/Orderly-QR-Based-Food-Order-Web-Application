-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK (role IN ('super_admin', 'admin')) DEFAULT 'admin',
    shop_id UUID, -- This will be linked to shops table
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Shops Table
CREATE TABLE IF NOT EXISTS shops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    logo TEXT,
    cover_image TEXT,
    qr_code TEXT,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    address TEXT,
    phone TEXT,
    upi_id TEXT,
    is_open BOOLEAN DEFAULT true,
    categories TEXT[] DEFAULT '{}',
    theme TEXT DEFAULT '#FF6B35',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraint to shops if not named (optional but good for consistency)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_shop_owner') THEN
    ALTER TABLE shops ADD CONSTRAINT fk_shop_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key constraint to users (after shops table is created)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_shop') THEN
    ALTER TABLE users ADD CONSTRAINT fk_user_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Food Items Table
CREATE TABLE IF NOT EXISTS food_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID CONSTRAINT fk_food_shop REFERENCES shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    image TEXT,
    category TEXT NOT NULL,
    is_veg BOOLEAN DEFAULT true,
    is_available BOOLEAN DEFAULT true,
    tags TEXT[] DEFAULT '{}',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id TEXT UNIQUE NOT NULL, -- 5-digit unique ID
    shop_id UUID CONSTRAINT fk_order_shop REFERENCES shops(id) ON DELETE CASCADE,
    items JSONB NOT NULL,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    customer_name TEXT DEFAULT 'Guest',
    customer_phone TEXT,
    table_number TEXT,
    special_instructions TEXT,
    payment_method TEXT CHECK (payment_method IN ('cod', 'upi')) NOT NULL,
    payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'failed')) DEFAULT 'pending',
    order_status TEXT CHECK (order_status IN ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')) DEFAULT 'pending',
    upi_transaction_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure fk_order_shop exists and is named correctly
DO $$ 
BEGIN
  -- Drop default constraint if it exists to avoid ambiguity
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_shop_id_fkey') THEN
    ALTER TABLE orders DROP CONSTRAINT orders_shop_id_fkey;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_order_shop') THEN
    ALTER TABLE orders ADD CONSTRAINT fk_order_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_shops_owner ON shops(owner_id);
CREATE INDEX IF NOT EXISTS idx_food_items_shop ON food_items(shop_id);
CREATE INDEX IF NOT EXISTS idx_food_items_category ON food_items(category);
CREATE INDEX IF NOT EXISTS idx_orders_shop ON orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_shops_updated_at ON shops;
CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_food_items_updated_at ON food_items;
CREATE TRIGGER update_food_items_updated_at BEFORE UPDATE ON food_items FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Seed Super Admin (Password: superadmin123)
-- Hash generated via bcryptjs (12 rounds)
INSERT INTO users (name, email, password, role, is_active)
VALUES ('Super Admin', 'superadmin@orderly.com', '$2a$12$rfneTWcwHonq2DoI3mMF8.AsBW66sIOttkQu6vwq9uyJQsECXnooS', 'super_admin', true)
ON CONFLICT (email) DO NOTHING;
