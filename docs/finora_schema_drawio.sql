-- =======================================================================
-- FINORA CLEAN DOMAIN ERD SCHEMA (FOR DRAW.IO)
-- Đã loại bỏ: created_at, updated_at, deleted_at và các bảng Auth/RBAC kỹ thuật.
-- Chuẩn hóa đúng theo biểu đồ lớp thực thể nghiệp vụ (Domain Entities).
-- =======================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(30),
    full_name VARCHAR(150) NOT NULL,
    avatar_url VARCHAR(500)
);

CREATE TABLE user_settings (
    id UUID PRIMARY KEY,
    user_id UUID UNIQUE REFERENCES users(id),
    default_currency VARCHAR(10) DEFAULT 'VND',
    language VARCHAR(10) DEFAULT 'vi',
    app_lock_enabled BOOLEAN DEFAULT FALSE,
    pin_hash VARCHAR(255),
    show_mascot BOOLEAN DEFAULT TRUE,
    biometric_enabled BOOLEAN DEFAULT FALSE,
    notification_preferences JSONB,
    default_transaction_visibility VARCHAR(50) DEFAULT 'PRIVATE'
);

CREATE TABLE asset_tiers (
    id UUID PRIMARY KEY,
    tier_name VARCHAR(100) UNIQUE NOT NULL,
    min_net_worth DECIMAL(15,2) DEFAULT 0,
    max_net_worth DECIMAL(15,2),
    mascot_asset_url VARCHAR(500),
    display_name VARCHAR(100) NOT NULL,
    display_order INT DEFAULT 0
);

CREATE TABLE ai_personas (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    tone_description TEXT,
    system_prompt_snippet TEXT,
    is_active BOOLEAN DEFAULT FALSE
);

CREATE TABLE wallets (
    id UUID PRIMARY KEY,
    owner_id UUID REFERENCES users(id),
    name VARCHAR(150) NOT NULL,
    icon VARCHAR(255),
    color VARCHAR(10),
    description TEXT,
    default_currency VARCHAR(10) DEFAULT 'VND',
    type VARCHAR(50) DEFAULT 'PERSONAL',
    is_shared BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE
);

CREATE TABLE wallet_members (
    id UUID PRIMARY KEY,
    wallet_id UUID REFERENCES wallets(id),
    user_id UUID REFERENCES users(id),
    role VARCHAR(50) DEFAULT 'VIEWER'
);

CREATE TABLE accounts (
    id UUID PRIMARY KEY,
    wallet_id UUID REFERENCES wallets(id),
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50) DEFAULT 'CASH',
    currency VARCHAR(10) DEFAULT 'VND',
    balance DECIMAL(15,2) DEFAULT 0,
    available_balance DECIMAL(15,2) DEFAULT 0,
    account_number_last4 VARCHAR(4),
    bank_code VARCHAR(50),
    color VARCHAR(10),
    is_archived BOOLEAN DEFAULT FALSE,
    exclude_from_net_worth BOOLEAN DEFAULT FALSE
);

CREATE TABLE categories (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    parent_id UUID REFERENCES categories(id),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) DEFAULT 'EXPENSE',
    color VARCHAR(10),
    icon VARCHAR(255),
    display_order INT DEFAULT 0,
    is_system BOOLEAN DEFAULT FALSE
);

CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    account_id UUID REFERENCES accounts(id),
    created_by UUID REFERENCES users(id),
    category_id UUID REFERENCES categories(id),
    receipt_id UUID,
    chat_message_id UUID,
    recurring_transaction_id UUID,
    type VARCHAR(50) DEFAULT 'EXPENSE',
    amount DECIMAL(15,2) DEFAULT 0,
    fee DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'VND',
    name VARCHAR(200) NOT NULL,
    note TEXT,
    source VARCHAR(50) DEFAULT 'MANUAL',
    status VARCHAR(50) DEFAULT 'CONFIRMED',
    visibility VARCHAR(50) DEFAULT 'PRIVATE',
    amount_hidden BOOLEAN DEFAULT FALSE,
    is_recurring BOOLEAN DEFAULT FALSE,
    exclude_from_report BOOLEAN DEFAULT FALSE,
    location_name VARCHAR(255),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    transaction_date TIMESTAMP
);

CREATE TABLE transaction_photos (
    id UUID PRIMARY KEY,
    transaction_id UUID REFERENCES transactions(id),
    photo_url VARCHAR(500) NOT NULL,
    type VARCHAR(50) DEFAULT 'RECEIPT',
    is_cover BOOLEAN DEFAULT FALSE
);

CREATE TABLE receipts (
    id UUID PRIMARY KEY,
    account_id UUID REFERENCES accounts(id),
    image_url VARCHAR(500) NOT NULL,
    merchant_name VARCHAR(200),
    total_amount DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2),
    tip_amount DECIMAL(15,2),
    ocr_raw_data JSONB
);

CREATE TABLE receipt_items (
    id UUID PRIMARY KEY,
    receipt_id UUID REFERENCES receipts(id),
    category_id UUID REFERENCES categories(id),
    item_name VARCHAR(200) NOT NULL,
    quantity DECIMAL(10,3) DEFAULT 1,
    unit_price DECIMAL(15,2) DEFAULT 0,
    total_price DECIMAL(15,2) DEFAULT 0
);

CREATE TABLE transfers (
    id UUID PRIMARY KEY,
    from_account_id UUID REFERENCES accounts(id),
    to_account_id UUID REFERENCES accounts(id),
    created_by UUID REFERENCES users(id),
    fee_account_id UUID REFERENCES accounts(id),
    fee DECIMAL(15,2) DEFAULT 0,
    from_amount DECIMAL(15,2) NOT NULL,
    from_currency VARCHAR(10) DEFAULT 'VND',
    to_amount DECIMAL(15,2) NOT NULL,
    to_currency VARCHAR(10) DEFAULT 'VND',
    exchange_rate DECIMAL(15,6) DEFAULT 1.0,
    note TEXT,
    transfer_date TIMESTAMP
);

CREATE TABLE budgets (
    id UUID PRIMARY KEY,
    wallet_id UUID REFERENCES wallets(id),
    category_id UUID REFERENCES categories(id),
    amount_limit DECIMAL(15,2) NOT NULL,
    period VARCHAR(50) DEFAULT 'MONTHLY',
    used_amount DECIMAL(15,2) DEFAULT 0,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    rollover_enabled BOOLEAN DEFAULT FALSE,
    notify_threshold INT DEFAULT 80,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE recurring_transactions (
    id UUID PRIMARY KEY,
    wallet_id UUID REFERENCES wallets(id),
    account_id UUID REFERENCES accounts(id),
    category_id UUID REFERENCES categories(id),
    created_by UUID REFERENCES users(id),
    name VARCHAR(200) NOT NULL,
    amount DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'VND',
    type VARCHAR(50) DEFAULT 'EXPENSE',
    frequency VARCHAR(50) DEFAULT 'MONTHLY',
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    next_run_date TIMESTAMP NOT NULL,
    is_paused BOOLEAN DEFAULT FALSE
);

CREATE TABLE savings_goals (
    id UUID PRIMARY KEY,
    wallet_id UUID REFERENCES wallets(id),
    account_id UUID REFERENCES accounts(id),
    name VARCHAR(150) NOT NULL,
    icon VARCHAR(255),
    color VARCHAR(10),
    is_favorite BOOLEAN DEFAULT FALSE,
    target_amount DECIMAL(15,2) NOT NULL,
    current_amount DECIMAL(15,2) DEFAULT 0,
    target_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'ACTIVE'
);

CREATE TABLE savings_contributions (
    id UUID PRIMARY KEY,
    goal_id UUID REFERENCES savings_goals(id),
    account_id UUID REFERENCES accounts(id),
    amount DECIMAL(15,2) NOT NULL,
    note TEXT,
    contribution_date TIMESTAMP
);

CREATE TABLE loans (
    id UUID PRIMARY KEY,
    wallet_id UUID REFERENCES wallets(id),
    account_id UUID REFERENCES accounts(id),
    created_by UUID REFERENCES users(id),
    type VARCHAR(50) DEFAULT 'LENT',
    contact_name VARCHAR(150) NOT NULL,
    contact_info VARCHAR(255),
    principal_amount DECIMAL(15,2) NOT NULL,
    remaining_amount DECIMAL(15,2) NOT NULL,
    is_interest_bearing BOOLEAN DEFAULT FALSE,
    interest_rate DECIMAL(5,2),
    interest_period VARCHAR(50),
    currency VARCHAR(10) DEFAULT 'VND',
    note TEXT,
    loan_date TIMESTAMP NOT NULL,
    due_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'ACTIVE'
);

CREATE TABLE loan_payments (
    id UUID PRIMARY KEY,
    loan_id UUID REFERENCES loans(id),
    account_id UUID REFERENCES accounts(id),
    amount DECIMAL(15,2) NOT NULL,
    note TEXT,
    payment_date TIMESTAMP
);

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    wallet_id UUID REFERENCES wallets(id),
    role VARCHAR(50) DEFAULT 'USER',
    message_type VARCHAR(50) DEFAULT 'TEXT',
    text_content TEXT NOT NULL,
    payload_json JSONB
);

CREATE TABLE friendships (
    id UUID PRIMARY KEY,
    requester_id UUID REFERENCES users(id),
    addressee_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'PENDING'
);

CREATE TABLE post_reactions (
    id UUID PRIMARY KEY,
    transaction_id UUID REFERENCES transactions(id),
    user_id UUID REFERENCES users(id),
    emoji VARCHAR(20) NOT NULL
);

CREATE TABLE direct_messages (
    id UUID PRIMARY KEY,
    sender_id UUID REFERENCES users(id),
    receiver_id UUID REFERENCES users(id),
    type VARCHAR(50) DEFAULT 'TEXT',
    content TEXT NOT NULL,
    media_url VARCHAR(500),
    reply_to_message_id UUID REFERENCES direct_messages(id),
    related_transaction_id UUID REFERENCES transactions(id),
    is_read BOOLEAN DEFAULT FALSE
);

CREATE TABLE message_reactions (
    id UUID PRIMARY KEY,
    message_id UUID REFERENCES direct_messages(id),
    user_id UUID REFERENCES users(id),
    emoji VARCHAR(20) NOT NULL
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    related_entity_type VARCHAR(100),
    related_entity_id UUID,
    metadata JSONB,
    action_url VARCHAR(500)
);

ALTER TABLE transactions ADD CONSTRAINT fk_transactions_receipt FOREIGN KEY (receipt_id) REFERENCES receipts(id);
ALTER TABLE transactions ADD CONSTRAINT fk_transactions_chat FOREIGN KEY (chat_message_id) REFERENCES chat_messages(id);
ALTER TABLE transactions ADD CONSTRAINT fk_transactions_recurring FOREIGN KEY (recurring_transaction_id) REFERENCES recurring_transactions(id);
