export interface Role {
  id: number;
  name: string; // ROLE_PRINCIPAL, ROLE_HOD, ROLE_DEAN, ROLE_TECHNICIAN, ROLE_PROGRAMMER, ROLE_EEE_ASSET_MANAGER, ROLE_ELEC_COMPLAINTER
}

export interface Department {
  id: number;
  name: string;
  code: string;
  hod?: User;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  department?: Department;
  active: boolean;
  createdAt: string;
}

export interface Inventory {
  id: string; // Asset ID
  department: Department;
  type: 'CPU' | 'Monitor' | 'Keyboard' | 'Mouse' | string;
  brand: string;
  model: string;
  serialNumber: string;
  purchaseDate: string;
  warrantyMonths: number;
  status: 'Working' | 'New Stock' | 'Repairing' | 'Dead Stock';
}

export interface RepairRequest {
  id: string; // REQ-101
  inventory: Inventory;
  requester?: User;
  assignedTo?: User;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Initiated' | 'Accepted' | 'In Progress' | 'Approval pending' | 'Approved' | 'Items ordered' | 'Resolved' | 'Dead Stock';
  initiatedDate: string;
  initiatedTime: string;
}

export interface RepairHistory {
  id: number;
  status: string;
  statusDate: string;
  statusTime: string;
  description: string;
  updatedBy?: User;
  partsReplaced?: string;
  expectedCompletionDays?: number;
  requiredParts?: string;
  problemFound?: string;
  solution?: string;
  reasonForDelay?: string;
  remarks?: string;
}

export interface Notification {
  id: number;
  message: string;
  type: 'NEW_REPAIR' | 'REPAIR_STARTED' | 'REPAIR_COMPLETED' | 'DEAD_STOCK_ADDED' | 'SHR_NEW_REQUEST' | 'SHR_STATUS_APPROVED' | 'SHR_STATUS_REJECTED';
  readStatus: boolean;
  createdAt: string;
}

export interface SeminarHall {
  id: number;
  name: string;
  code: string;
  block: string;
  capacity: number;
  facilities?: string;
  active: boolean;
  createdAt?: string;
  allocatorName?: string;
  allocatorEmail?: string;
}

export interface SeminarHallRequest {
  id: string; // SHR-101
  seminarHall: SeminarHall;
  requester: User;
  department?: Department | null;
  resourcePersonName: string;
  participantsCount: number;
  eventTitle?: string;
  eventDescription?: string;
  noOfDays: number;
  eventDate?: string;
  timeSlot?: 'FN' | 'AN' | 'Full Day' | string;
  startDate?: string;
  endDate?: string;
  selectedDates?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  allocatorRemarks?: string;
  allocatedBy?: { id: number; name: string } | null;
  createdAt: string;
  updatedAt?: string;
}

export interface StationaryItem {
  id: number;
  name: string;
  category: string;
  unit: string;
  active: boolean;
  createdAt?: string;
}

export interface StationaryRequestItem {
  id: number;
  name: string;
  category?: string;
  count: number;
  allottedCount?: number;
  unit?: string;
}

export interface StationaryRequest {
  id: string; // STR-1001
  requester: User;
  department?: Department | null;
  items: StationaryRequestItem[];
  totalItems: number;
  totalQuantity: number;
  purpose?: string;
  status: 'PENDING_AO' | 'FORWARDED_TO_STATIONARY' | 'FULFILLED' | 'REJECTED_AO' | 'REJECTED_STATIONARY';
  aoRemarks?: string;
  aoActionBy?: { id: number; name: string } | null;
  aoActionAt?: string;
  stationaryRemarks?: string;
  stationaryActionBy?: { id: number; name: string } | null;
  stationaryActionAt?: string;
  decreaseRemarks?: string;
  createdAt: string;
  updatedAt?: string;
}

export type TransportType = 'BUS' | 'Car' | 'Bike';

export type TransportRequestStatus =
  | 'PENDING_AO'
  | 'APPROVED'
  | 'REJECTED'
  | 'STARTED'
  | 'COMPLETED';

export interface TransportRequest {
  id: string; // TR-1001
  requester: User;
  department?: Department | null;
  transportType: TransportType;
  purpose: string;
  personCount: number;
  startDate: string;
  startTime: string;
  status: TransportRequestStatus;
  aoRemarks?: string;
  aoActionBy?: { id: number; name: string } | null;
  aoActionAt?: string;
  allocatedVehicle?: string;
  allocatedVehicleCount?: number;
  tripStartedAt?: string;
  tripEndedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

