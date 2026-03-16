CREATE DATABASE inventory_system;
USE inventory_system;

-- ENUMS
CREATE TABLE balance_type_enum (
    value ENUM('credit','debit') PRIMARY KEY
);

CREATE TABLE adjustment_type_enum (
    value ENUM('increase','decrease') PRIMARY KEY
);

-- COMPANIES
CREATE TABLE companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    address TEXT,
    contact VARCHAR(100),
    email VARCHAR(100),
    logo VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ROLES
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(100),
    description TEXT
);

-- USERS
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150),
    email VARCHAR(150) UNIQUE,
    password VARCHAR(255),
    role_id INT,
    phone VARCHAR(50),
    status BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- PERMISSIONS
CREATE TABLE permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    module VARCHAR(150),
    permission_name VARCHAR(150)
);

-- ROLE PERMISSIONS
CREATE TABLE role_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT,
    permission_id INT,
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (permission_id) REFERENCES permissions(id)
);

-- CATEGORIES
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(150),
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

-- PRODUCTS
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT,
    product_code VARCHAR(100),
    product_name VARCHAR(255),
    description TEXT,
    image VARCHAR(255),
    has_expire_date BOOLEAN DEFAULT FALSE,
    expire_date DATETIME,
    opening_quantity INT,
    purchase_cost DECIMAL(10,2),
    sale_cost DECIMAL(10,2),
    reorder_level INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- SUPPLIERS
CREATE TABLE suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255),
    address TEXT,
    mobile_no VARCHAR(50),
    email VARCHAR(100),
    opening_balance DECIMAL(10,2),
    balance_type ENUM('credit','debit'),
    registered_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- SUPPLIER PAYMENTS
CREATE TABLE supplier_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_id INT,
    purchase_id INT,
    payment_mode VARCHAR(100),
    amount DECIMAL(10,2),
    remarks TEXT,
    payment_date DATETIME,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

-- SPONSORS
CREATE TABLE sponsors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255),
    gender VARCHAR(20),
    address TEXT,
    mobile_no VARCHAR(50),
    email VARCHAR(100),
    registered_date DATETIME
);

-- CUSTOMERS
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255),
    gender VARCHAR(20),
    address TEXT,
    mobile_no VARCHAR(50),
    email VARCHAR(100),
    customer_type VARCHAR(100),
    sponsor_id INT,
    opening_balance DECIMAL(10,2),
    balance_type ENUM('credit','debit'),
    registered_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sponsor_id) REFERENCES sponsors(id)
);

-- CUSTOMER RECEIPTS
CREATE TABLE customer_receipts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT,
    invoice_no INT,
    payment_mode VARCHAR(100),
    amount DECIMAL(10,2),
    remarks TEXT,
    created_at DATETIME,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- PURCHASES
CREATE TABLE purchases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_number VARCHAR(100),
    supplier_id INT,
    purchase_date DATETIME,
    payment_mode VARCHAR(100),
    cash_amount DECIMAL(10,2),
    total DECIMAL(10,2),
    discount DECIMAL(10,2),
    grand_total DECIMAL(10,2),
    paid DECIMAL(10,2),
    rest DECIMAL(10,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

-- PURCHASE ITEMS
CREATE TABLE purchase_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    purchase_id INT,
    product_id INT,
    expire_date DATETIME,
    cost DECIMAL(10,2),
    quantity INT,
    price DECIMAL(10,2),
    amount DECIMAL(10,2),
    FOREIGN KEY (purchase_id) REFERENCES purchases(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- SALES
CREATE TABLE sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_no VARCHAR(100),
    customer_id INT,
    invoice_date DATETIME,
    total DECIMAL(10,2),
    discount DECIMAL(10,2),
    grand_total DECIMAL(10,2),
    paid DECIMAL(10,2),
    rest DECIMAL(10,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- SALE ITEMS
CREATE TABLE sale_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT,
    product_id INT,
    quantity INT,
    price DECIMAL(10,2),
    total DECIMAL(10,2),
    FOREIGN KEY (sale_id) REFERENCES sales(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- EXPENSE TYPES
CREATE TABLE expense_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type_name VARCHAR(150),
    created_at DATETIME
);

-- EXPENSE BILLS
CREATE TABLE expense_bills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    expense_type_id INT,
    invoice_date DATETIME,
    receiver_name VARCHAR(255),
    amount DECIMAL(10,2),
    remarks TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (expense_type_id) REFERENCES expense_types(id)
);

-- EXPENSE PAYMENTS
CREATE TABLE expense_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    expense_bill_id INT,
    payment_mode VARCHAR(100),
    cash DECIMAL(10,2),
    amount DECIMAL(10,2),
    remarks TEXT,
    payment_date DATETIME,
    FOREIGN KEY (expense_bill_id) REFERENCES expense_bills(id)
);

-- STOCK ADJUSTMENTS
CREATE TABLE stock_adjustments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT,
    product_code VARCHAR(100),
    product_name VARCHAR(255),
    quantity INT,
    expire_date DATETIME,
    adjustment_type ENUM('increase','decrease'),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- CASH DEPOSITS
CREATE TABLE cash_deposits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    amount DECIMAL(10,2),
    deposit_date DATETIME,
    remarks TEXT
);

-- TRANSACTION CLOSING
CREATE TABLE transaction_closing (
    id INT AUTO_INCREMENT PRIMARY KEY,
    closing_date DATETIME,
    total_sales DECIMAL(10,2),
    total_expense DECIMAL(10,2),
    cash_balance DECIMAL(10,2),
    created_by INT
);

-- REPORT LOGS
CREATE TABLE report_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_name VARCHAR(255),
    generated_by INT,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (generated_by) REFERENCES users(id)
);

-- AUDIT LOGS
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(255),
    table_name VARCHAR(255),
    record_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);