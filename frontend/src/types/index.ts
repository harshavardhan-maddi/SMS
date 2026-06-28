export interface Role {
  id: number;
  name: string; // ROLE_PRINCIPAL, ROLE_HOD, ROLE_DEAN, ROLE_TECHNICIAN
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
  status: 'Initiated' | 'Accepted' | 'In Progress' | 'Parts Requested' | 'Resolved' | 'Dead Stock';
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
  type: 'NEW_REPAIR' | 'REPAIR_STARTED' | 'REPAIR_COMPLETED' | 'DEAD_STOCK_ADDED';
  readStatus: boolean;
  createdAt: string;
}
