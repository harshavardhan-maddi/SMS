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
    lab_id INTEGER REFERENCES labs(id) ON DELETE SET NULL,
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
    initiated_time TIME DEFAULT CURRENT_TIME,
    device_count INTEGER DEFAULT 1,
    completed_date DATE,
    completed_time TIME
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

CREATE TABLE IF NOT EXISTS electricians (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    specialization VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS assigned_electrician_name VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_inventory_dept ON inventory(department_id);
CREATE INDEX IF NOT EXISTS idx_inventory_lab ON inventory(lab_id);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(status);
CREATE INDEX IF NOT EXISTS idx_repairs_dept ON repair_requests(inventory_id);
CREATE INDEX IF NOT EXISTS idx_repairs_status ON repair_requests(status);
CREATE INDEX IF NOT EXISTS idx_repairs_requester ON repair_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_repairs_assigned ON repair_requests(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_history_request ON repair_history(request_id);

-- 8. Create Seminar Halls Table
CREATE TABLE IF NOT EXISTS seminar_halls (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100),
    block VARCHAR(100),
    capacity INTEGER DEFAULT 100,
    facilities TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS seminar_hall_id INTEGER REFERENCES seminar_halls(id) ON DELETE SET NULL;

-- 9. Create Seminar Hall Requests Table
CREATE TABLE IF NOT EXISTS seminar_hall_requests (
    id VARCHAR(50) PRIMARY KEY, -- e.g. SHR-101
    seminar_hall_id INTEGER REFERENCES seminar_halls(id) ON DELETE CASCADE,
    requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    resource_person_name VARCHAR(255) NOT NULL,
    participants_count INTEGER NOT NULL,
    event_title VARCHAR(255),
    event_description TEXT,
    no_of_days INTEGER NOT NULL DEFAULT 1,
    event_date DATE,
    time_slot VARCHAR(50), -- 'FN', 'AN', 'Full Day'
    start_date DATE,
    end_date DATE,
    selected_dates TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    allocator_remarks TEXT,
    allocated_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shr_hall ON seminar_hall_requests(seminar_hall_id);
CREATE INDEX IF NOT EXISTS idx_shr_requester ON seminar_hall_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_shr_status ON seminar_hall_requests(status);

-- 10. Create Stationary Items Catalog Table
CREATE TABLE IF NOT EXISTS stationary_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'General',
    unit VARCHAR(100) DEFAULT 'Nos',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stationary_items_cat ON stationary_items(category);

-- 11. Create Stationary Requests Table
CREATE TABLE IF NOT EXISTS stationary_requests (
    id VARCHAR(50) PRIMARY KEY, -- e.g. STR-1001
    requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    items_json TEXT NOT NULL, -- JSON array: [{ id, name, count, unit }]
    total_items INTEGER DEFAULT 1,
    total_quantity INTEGER DEFAULT 1,
    purpose TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_AO', -- PENDING_AO, FORWARDED_TO_STATIONARY, FULFILLED, REJECTED_AO, REJECTED_STATIONARY
    ao_remarks TEXT,
    ao_action_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ao_action_at TIMESTAMP,
    stationary_remarks TEXT,
    stationary_action_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    stationary_action_at TIMESTAMP,
    decrease_remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE stationary_requests ADD COLUMN IF NOT EXISTS decrease_remarks TEXT;

CREATE INDEX IF NOT EXISTS idx_str_requester ON stationary_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_str_dept ON stationary_requests(department_id);
-- 12. Create Refreshment & Accommodation Requests Table
CREATE TABLE IF NOT EXISTS refreshment_accommodation_requests (
    id VARCHAR(32) PRIMARY KEY, -- e.g. RA-1001
    requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    
    -- Accommodation Options
    has_accommodation BOOLEAN DEFAULT FALSE,
    accommodation_type VARCHAR(32), -- 'Boys Hostel', 'Girls Hostel', 'Hotel'
    accommodation_purpose TEXT,
    accommodation_persons_count INTEGER DEFAULT 0,
    accommodation_rooms_count INTEGER DEFAULT 0,
    accommodation_from_date VARCHAR(32),
    accommodation_to_date VARCHAR(32),

    -- Target Hostel (when Hostel Food or Tea & Snacks is routed to a hostel)
    target_hostel VARCHAR(32), -- 'Boys Hostel', 'Girls Hostel'
    
    -- Tea & Snacks Options
    has_tea_snacks BOOLEAN DEFAULT FALSE,
    tea_snacks_from_date VARCHAR(32),
    tea_snacks_to_date VARCHAR(32),
    tea_count INTEGER DEFAULT 0,
    snacks_count INTEGER DEFAULT 0,
    tea_snacks_purpose TEXT,

    -- Hostel Food Options
    has_hostel_food BOOLEAN DEFAULT FALSE,
    hostel_food_persons_count INTEGER DEFAULT 0,
    hostel_food_rooms_count INTEGER DEFAULT 0,
    hostel_food_from_date VARCHAR(32),
    hostel_food_to_date VARCHAR(32),
    hostel_food_purpose TEXT,

    -- Restaurant Food Options
    has_restaurant_food BOOLEAN DEFAULT FALSE,
    restaurant_food_persons_count INTEGER DEFAULT 0,
    restaurant_food_from_date VARCHAR(32),
    restaurant_food_to_date VARCHAR(32),
    veg_count INTEGER DEFAULT 0,
    non_veg_count INTEGER DEFAULT 0,
    restaurant_food_purpose TEXT,

    -- Workflow Status & Tracking
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING_AO',
    total_guests INTEGER DEFAULT 0,
    checked_out_count INTEGER DEFAULT 0,
    checked_out_at TIMESTAMP,

    -- AO Actions
    ao_remarks TEXT,
    ao_assigned_hotel TEXT,
    ao_assigned_restaurant TEXT,
    ao_action_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ao_action_at TIMESTAMP,

    -- Warden Actions
    warden_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    warden_assigned_rooms TEXT,
    warden_remarks TEXT,
    warden_action_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ra_requester ON refreshment_accommodation_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_ra_dept ON refreshment_accommodation_requests(department_id);
CREATE INDEX IF NOT EXISTS idx_ra_status ON refreshment_accommodation_requests(status);


