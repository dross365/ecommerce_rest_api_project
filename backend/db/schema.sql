-- db/schema.sql

--users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(50) UNIQUE,
  password TEXT,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  google JSON,
  facebook JSON,
  CHECK (
    password IS NOT NULL
    OR google IS NOT NULL
    OR facebook IS NOT NULL
  )
);

-- products
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  price_cents INT NOT NULL CHECK (price_cents >= 0), --account for free items
  description TEXT NOT NULL
);

-- order_status type
CREATE TYPE order_status AS ENUM (
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded'
);

-- orders
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status order_status NOT NULL DEFAULT 'pending', -- will grab status from type order_status
  created_at TIMESTAMPTZ DEFAULT NOW(),
  modified_at TIMESTAMPTZ DEFAULT NOW()
);

-- idx_orders_user_id
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- modified_at function
CREATE OR REPLACE FUNCTION set_modified_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.modified_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- orders modified_at trigger
CREATE TRIGGER orders_set_modified_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION set_modified_at();

-- order_items
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  quantity INT NOT NULL CHECK (quantity > 0),
  price_cents INT NOT NULL CHECK (price_cents >= 0), -- account for free items
  product_id INT,
  product_name TEXT NOT NULL,
  product_description TEXT
);

-- idx_order_items_order_id
CREATE INDEX idx_order_items_order_id
ON order_items(order_id);

-- carts
CREATE TABLE carts (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  modified_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id) -- make sure each user has only 1 cart at a time
);

-- carts modified_at trigger
CREATE TRIGGER carts_set_modified_at
BEFORE UPDATE ON carts
FOR EACH ROW
EXECUTE FUNCTION set_modified_at();

-- cart_items
CREATE TABLE cart_items (
  id SERIAL PRIMARY KEY,
  cart_id INT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id),
  quantity INT NOT NULL CHECK (quantity > 0),
  UNIQUE (cart_id, product_id)
);

-- idx_cart_items_cart_id
CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);