-- College Systems Management System (SMS) PostgreSQL Schema & Seed Data

-- 1. Create Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

-- 2. Create Departments Table (without HOD FK to avoid circular dependency initially)
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL
);

-- 2b. Create Labs Table
CREATE TABLE IF NOT EXISTS labs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    lab_number VARCHAR(50) NOT NULL,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE
);

-- 3. Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add HOD reference to Departments to link them properly
ALTER TABLE departments ADD COLUMN IF NOT EXISTS hod_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- 4. Create Inventory Table
CREATE TABLE IF NOT EXISTS inventory (
    id VARCHAR(50) PRIMARY KEY, -- Asset ID like AST-001
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    lab_id INTEGER REFERENCES labs(id) ON DELETE SET NULL,
    workstation_number INTEGER DEFAULT 1,
    type VARCHAR(50) NOT NULL, -- CPU, Monitor, Keyboard, Mouse, Hotspot
    brand VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100) UNIQUE,
    purchase_date DATE,
    warranty_months INTEGER,
    status VARCHAR(50) NOT NULL DEFAULT 'Working' -- Working, New Stock, Repairing, Dead Stock
);

-- 5. Create Repair Requests Table
CREATE TABLE IF NOT EXISTS repair_requests (
    id VARCHAR(50) PRIMARY KEY, -- REQ-101
    inventory_id VARCHAR(50) REFERENCES inventory(id) ON DELETE CASCADE,
    requester_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_to_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    priority VARCHAR(20) NOT NULL, -- Low, Medium, High
    status VARCHAR(50) NOT NULL DEFAULT 'Initiated', -- Initiated, In Progress, Resolved
    initiated_date DATE DEFAULT CURRENT_DATE,
    initiated_time TIME DEFAULT CURRENT_TIME
);

-- 6. Create Repair History Table
CREATE TABLE IF NOT EXISTS repair_history (
    id SERIAL PRIMARY KEY,
    request_id VARCHAR(50) REFERENCES repair_requests(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    status_date DATE DEFAULT CURRENT_DATE,
    status_time TIME DEFAULT CURRENT_TIME,
    description TEXT,
    updated_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    parts_replaced VARCHAR(255),
    expected_completion_days INTEGER,
    required_parts VARCHAR(255),
    problem_found VARCHAR(255),
    solution VARCHAR(255),
    reason_for_delay VARCHAR(255),
    remarks VARCHAR(255)
);

-- 7. Create Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    message VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- NEW_REPAIR, REPAIR_STARTED, REPAIR_COMPLETED, DEAD_STOCK_ADDED
    read_status BOOLEAN DEFAULT FALSE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SEED DATA
-- Insert default roles
INSERT INTO roles (id, name) VALUES 
(1, 'ROLE_PRINCIPAL'),
(2, 'ROLE_HOD'),
(3, 'ROLE_DEAN'),
(4, 'ROLE_TECHNICIAN')
ON CONFLICT (id) DO NOTHING;

-- Insert default departments
INSERT INTO departments (id, name, code) VALUES
(1, 'Computer Science Engineering', 'CSE'),
(2, 'Electronics & Communication', 'ECE'),
(3, 'Electrical & Electronics', 'EEE'),
(4, 'Mechanical Engineering', 'MECH'),
(5, 'Civil Engineering', 'CIVIL'),
(6, 'Information Technology', 'IT')
ON CONFLICT (id) DO NOTHING;

-- Insert default labs
INSERT INTO labs (id, name, lab_number, department_id) VALUES
(1, 'Programming Lab 1', 'LAB-101', 1),
(2, 'Networking Lab', 'LAB-102', 1),
(3, 'VLSI Lab', 'LAB-201', 2)
ON CONFLICT (id) DO NOTHING;

-- Insert default users
-- Note: passwords are bcrypt-hashed. Password is 'password' for all.
INSERT INTO users (id, name, email, password, role_id, department_id, active) VALUES
(1, 'Principal Office', 'principal@sms.edu', '$2a$10$w0f5u1mBqjKqfD8WvJ6c/u8x4e.i4v4q0rB.D2c9M3B/5Vj4dDKea', 1, NULL, TRUE), -- Principal
(2, 'HOD CSE', 'hod.cse@sms.edu', '$2a$10$w0f5u1mBqjKqfD8WvJ6c/u8x4e.i4v4q0rB.D2c9M3B/5Vj4dDKea', 2, 1, TRUE),         -- HOD CSE
(3, 'HOD ECE', 'hod.ece@sms.edu', '$2a$10$w0f5u1mBqjKqfD8WvJ6c/u8x4e.i4v4q0rB.D2c9M3B/5Vj4dDKea', 2, 2, TRUE),         -- HOD ECE
(4, 'Computer Dean', 'dean@sms.edu', '$2a$10$w0f5u1mBqjKqfD8WvJ6c/u8x4e.i4v4q0rB.D2c9M3B/5Vj4dDKea', 3, NULL, TRUE),   -- Dean
(5, 'Hardware Technician', 'tech@sms.edu', '$2a$10$w0f5u1mBqjKqfD8WvJ6c/u8x4e.i4v4q0rB.D2c9M3B/5Vj4dDKea', 4, NULL, TRUE) -- Technician
ON CONFLICT (id) DO NOTHING;

-- Set HOD references in departments
UPDATE departments SET hod_id = 2 WHERE id = 1;
UPDATE departments SET hod_id = 3 WHERE id = 2;

CREATE TABLE IF NOT EXISTS finalized_hardware_counts (
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    lab_id INTEGER REFERENCES labs(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    total INTEGER NOT NULL DEFAULT 0,
    working INTEGER NOT NULL DEFAULT 0,
    not_working INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (department_id, lab_id, type)
);

