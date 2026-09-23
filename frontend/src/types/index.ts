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

export interface CalendarBooking {
  id: string;
  seminarHallId: number;
  seminarHallName: string;
  seminarHallCode?: string;
  seminarHallBlock?: string;
  eventDate?: string;
  timeSlot?: 'FN' | 'AN' | 'Full Day' | string;
  noOfDays: number;
  startDate?: string;
  endDate?: string;
  selectedDates?: string;
  status: 'Pending' | 'Approved';
  hodName: string;
  requesterEmail?: string;
  departmentCode?: string;
  departmentName?: string;
  eventTitle?: string;
  resourcePersonName?: string;
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

export type AccommodationType = 'Boys Hostel' | 'Girls Hostel' | 'Hotel';

export type RAStatus =
  | 'PENDING_AO'
  | 'APPROVED_AO'
  | 'FORWARDED_WARDEN'
  | 'WARDEN_ASSIGNED'
  | 'PARTIALLY_CHECKED_OUT'
  | 'COMPLETED'
  | 'REJECTED';

export interface RefreshmentAccommodationRequest {
  id: string; // RA-1001
  requester: User;
  department?: Department | null;

  // Accommodation
  hasAccommodation: boolean;
  accommodationType?: AccommodationType | null;
  accommodationPurpose?: string | null;
  accommodationPersonsCount: number;
  accommodationRoomsCount: number;
  accommodationFromDate?: string | null;
  accommodationToDate?: string | null;

  // Target Hostel for Warden routing
  targetHostel?: 'Boys Hostel' | 'Girls Hostel' | null;

  // Tea & Snacks
  hasTeaSnacks: boolean;
  teaSnacksFromDate?: string | null;
  teaSnacksToDate?: string | null;
  teaCount: number;
  snacksCount: number;
  teaSnacksPurpose?: string | null;

  // Hostel Food
  hasHostelFood: boolean;
  hostelFoodPersonsCount: number;
  hostelFoodRoomsCount: number;
  hostelFoodFromDate?: string | null;
  hostelFoodToDate?: string | null;
  hostelFoodPurpose?: string | null;

  // Restaurant Food
  hasRestaurantFood: boolean;
  restaurantFoodPersonsCount: number;
  restaurantFoodFromDate?: string | null;
  restaurantFoodToDate?: string | null;
  vegCount: number;
  nonVegCount: number;
  restaurantFoodPurpose?: string | null;

  // Workflow & Status
  status: RAStatus;

  // AO Actions
  aoActionBy?: { id: number; name: string } | null;
  aoRemarks?: string | null;
  aoAssignedHotel?: string | null;
  aoAssignedRestaurant?: string | null;
  aoActionAt?: string | null;

  // Warden Actions
  warden?: { id: number; name: string } | null;
  wardenAssignedRooms?: string | null;
  wardenRemarks?: string | null;
  wardenActionAt?: string | null;

  // Guest Checkout Tracker
  totalGuests: number;
  checkedOutCount: number;
  stillInHostel: number;
  checkedOutAt?: string | null;

  createdAt: string;
  updatedAt?: string;
}

