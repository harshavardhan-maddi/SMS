import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/db';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';
import { notificationService } from '../services/notificationService';
import { sendToTopic } from '../ws/broker';

export const hallsRouter = Router();
export const requestsRouter = Router();

// ==========================================
// 1. SEMINAR HALLS CRUD (hallsRouter)
// ==========================================

// Get all active seminar halls
hallsRouter.get('/', authenticateJWT, async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT sh.id, sh.name, sh.code, sh.block, sh.capacity, sh.facilities, sh.active, sh.created_at,
              u.name as allocator_name, u.email as allocator_email
       FROM seminar_halls sh
       LEFT JOIN users u ON u.seminar_hall_id = sh.id AND u.active = true
       ORDER BY sh.id ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Failed to get seminar halls:', err);
    res.status(500).send('Internal server error');
  }
});

// Add new seminar hall (Principal only)
hallsRouter.post('/', authenticateJWT, authorizeRoles('ROLE_PRINCIPAL'), async (req, res) => {
  const { name, code, block, capacity, facilities } = req.body;

  if (!name || !block) {
    return res.status(400).send('Seminar hall name and block are required');
  }

  try {
    const hallCode = code ? code.trim() : `HALL-${name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase()}`;
    const hallCapacity = parseInt(capacity) || 100;
    const hallFacilities = facilities || 'Standard AV setup, Projector, Audio system';

    const result = await db.run(
      `INSERT INTO seminar_halls (name, code, block, capacity, facilities, active)
       VALUES (?, ?, ?, ?, ?, true)`,
      [name.trim(), hallCode, block.trim(), hallCapacity, hallFacilities]
    );

    const created = await db.get('SELECT * FROM seminar_halls WHERE id = ?', [result.lastID]);
    res.json(created);
  } catch (err) {
    console.error('Failed to add seminar hall:', err);
    res.status(400).send((err as Error).message);
  }
});

// Update seminar hall (Principal only)
hallsRouter.put('/:id', authenticateJWT, authorizeRoles('ROLE_PRINCIPAL'), async (req, res) => {
  const { id } = req.params;
  const { name, code, block, capacity, facilities, active } = req.body;

  try {
    const existing = await db.get('SELECT * FROM seminar_halls WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).send('Seminar hall not found');
    }

    const updatedName = name !== undefined ? name.trim() : existing.name;
    const updatedCode = code !== undefined ? code.trim() : existing.code;
    const updatedBlock = block !== undefined ? block.trim() : existing.block;
    const updatedCapacity = capacity !== undefined ? parseInt(capacity) : existing.capacity;
    const updatedFacilities = facilities !== undefined ? facilities : existing.facilities;
    const updatedActive = active !== undefined ? (active ? 1 : 0) : existing.active;

    await db.run(
      `UPDATE seminar_halls
       SET name = ?, code = ?, block = ?, capacity = ?, facilities = ?, active = ?
       WHERE id = ?`,
      [updatedName, updatedCode, updatedBlock, updatedCapacity, updatedFacilities, updatedActive, id]
    );

    const updated = await db.get('SELECT * FROM seminar_halls WHERE id = ?', [id]);
    res.json(updated);
  } catch (err) {
    console.error('Failed to update seminar hall:', err);
    res.status(400).send((err as Error).message);
  }
});

// Delete seminar hall (Principal only)
hallsRouter.delete('/:id', authenticateJWT, authorizeRoles('ROLE_PRINCIPAL'), async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await db.get('SELECT * FROM seminar_halls WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).send('Seminar hall not found');
    }

    await db.transaction(async () => {
      // 1. Safely unlink any users assigned to this seminar hall
      await db.run('UPDATE users SET seminar_hall_id = NULL WHERE seminar_hall_id = ?', [id]);
      // 2. Remove requests for this seminar hall
      await db.run('DELETE FROM seminar_hall_requests WHERE seminar_hall_id = ?', [id]);
      // 3. Delete the seminar hall
      await db.run('DELETE FROM seminar_halls WHERE id = ?', [id]);
    });

    res.json({ message: `Seminar hall "${existing.name}" deleted successfully` });
  } catch (err) {
    console.error('Failed to delete seminar hall:', err);
    res.status(400).send((err as Error).message);
  }
});

// Delete allocator account (Principal only)
hallsRouter.delete('/allocators/:id', authenticateJWT, authorizeRoles('ROLE_PRINCIPAL'), async (req, res) => {
  const { id } = req.params;
  try {
    await db.run(
      `DELETE FROM users 
       WHERE id = ? AND role_id = (SELECT id FROM roles WHERE name = 'ROLE_SEMINAR_HALL_ALLOCATOR')`,
      [id]
    );
    res.json({ message: 'Allocator account deleted successfully' });
  } catch (err) {
    console.error('Failed to delete allocator:', err);
    res.status(400).send((err as Error).message);
  }
});


// Get all allocators (Principal only)
hallsRouter.get('/allocators', authenticateJWT, authorizeRoles('ROLE_PRINCIPAL'), async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT u.id, u.name, u.email, u.active, u.created_at, u.seminar_hall_id,
              sh.name as seminar_hall_name, sh.block as seminar_hall_block, sh.capacity as seminar_hall_capacity
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN seminar_halls sh ON u.seminar_hall_id = sh.id
       WHERE r.name = 'ROLE_SEMINAR_HALL_ALLOCATOR'
       ORDER BY u.id ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Failed to get allocators:', err);
    res.status(500).send('Internal server error');
  }
});

// Create new allocator (Principal only)
hallsRouter.post('/allocators', authenticateJWT, authorizeRoles('ROLE_PRINCIPAL'), async (req, res) => {
  const { name, email, password, seminarHallId } = req.body;

  if (!name || !email || !password || !seminarHallId) {
    return res.status(400).send('Name, email/ID, password, and assigned Seminar Hall are required');
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const existing = await db.get('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (existing) {
      return res.status(400).send(`User with email/ID ${email} already exists`);
    }

    const hall = await db.get('SELECT id, name FROM seminar_halls WHERE id = ?', [seminarHallId]);
    if (!hall) {
      return res.status(400).send('Assigned Seminar Hall not found');
    }

    let role = await db.get("SELECT id FROM roles WHERE name = 'ROLE_SEMINAR_HALL_ALLOCATOR'");
    if (!role) {
      await db.run("INSERT INTO roles (id, name) VALUES (8, 'ROLE_SEMINAR_HALL_ALLOCATOR')");
      role = await db.get("SELECT id FROM roles WHERE name = 'ROLE_SEMINAR_HALL_ALLOCATOR'");
    }

    const hashedPwd = await bcrypt.hash(password, 10);
    const activeVal = db.getDialect() === 'postgres' ? true : 1;

    const result = await db.run(
      `INSERT INTO users (name, email, password, role_id, seminar_hall_id, active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name.trim(), cleanEmail, hashedPwd, role.id, seminarHallId, activeVal]
    );

    const created = await db.get(
      `SELECT u.id, u.name, u.email, u.active, u.created_at, u.seminar_hall_id,
              sh.name as seminar_hall_name, sh.block as seminar_hall_block
       FROM users u
       LEFT JOIN seminar_halls sh ON u.seminar_hall_id = sh.id
       WHERE u.id = ?`,
      [result.lastID]
    );

    res.json(created);
  } catch (err) {
    console.error('Failed to create seminar hall allocator:', err);
    res.status(400).send((err as Error).message);
  }
});

// ==========================================
// 2. SEMINAR HALL REQUESTS (requestsRouter)
// ==========================================

function formatShrRow(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    resourcePersonName: row.resource_person_name,
    participantsCount: row.participants_count,
    eventTitle: row.event_title,
    eventDescription: row.event_description,
    noOfDays: row.no_of_days,
    eventDate: row.event_date,
    timeSlot: row.time_slot,
    startDate: row.start_date,
    endDate: row.end_date,
    selectedDates: row.selected_dates,
    status: row.status,
    allocatorRemarks: row.allocator_remarks,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    seminarHall: {
      id: row.seminar_hall_id,
      name: row.seminar_hall_name,
      code: row.seminar_hall_code,
      block: row.seminar_hall_block,
      capacity: row.seminar_hall_capacity,
    },
    requester: {
      id: row.requester_id,
      name: row.requester_name,
      email: row.requester_email,
    },
    department: row.department_id ? {
      id: row.department_id,
      name: row.dept_name,
      code: row.dept_code,
    } : null,
    allocatedBy: row.allocated_by_id ? {
      id: row.allocated_by_id,
      name: row.allocator_user_name,
    } : null
  };
}

// Get Seminar Hall Requests
requestsRouter.get('/', authenticateJWT, async (req, res) => {
  const userReq = (req as any).user;
  const userRole = userReq.role;
  const userId = userReq.userId || userReq.id;

  try {
    let sql = `
      SELECT r.*,
             sh.name as seminar_hall_name, sh.code as seminar_hall_code, sh.block as seminar_hall_block, sh.capacity as seminar_hall_capacity,
             u.name as requester_name, u.email as requester_email,
             d.name as dept_name, d.code as dept_code,
             alloc.name as allocator_user_name
      FROM seminar_hall_requests r
      JOIN seminar_halls sh ON r.seminar_hall_id = sh.id
      JOIN users u ON r.requester_id = u.id
      LEFT JOIN departments d ON r.department_id = d.id
      LEFT JOIN users alloc ON r.allocated_by_id = alloc.id
    `;
    const params: any[] = [];

    if (userRole === 'ROLE_HOD') {
      const deptId = userReq.departmentId;
      if (deptId) {
        sql += ` WHERE (r.department_id = ? OR (r.department_id IS NULL AND r.requester_id = ?))`;
        params.push(deptId, userId);
      } else {
        sql += ` WHERE r.requester_id = ?`;
        params.push(userId);
      }
    } else if (userRole === 'ROLE_SEMINAR_HALL_ALLOCATOR') {
      let hallId = userReq.seminarHallId;
      if (!hallId) {
        const uRow = await db.get('SELECT seminar_hall_id FROM users WHERE id = ?', [userId]);
        hallId = uRow?.seminar_hall_id;
      }
      sql += ` WHERE r.seminar_hall_id = ?`;
      params.push(hallId || 0);
    } else if (userRole === 'ROLE_PRINCIPAL' || userRole === 'ROLE_DEAN') {
      // All requests
    } else {
      sql += ` WHERE r.requester_id = ?`;
      params.push(userId);
    }

    sql += ` ORDER BY r.created_at DESC`;

    const rows = await db.all(sql, params);
    res.json(rows.map(formatShrRow));
  } catch (err) {
    console.error('Failed to get seminar hall requests:', err);
    res.status(500).send('Internal server error');
  }
});

// GET /api/seminar-requests/calendar-bookings - Get active bookings for calendar display
requestsRouter.get('/calendar-bookings', authenticateJWT, async (req, res) => {
  const { seminarHallId } = req.query;
  try {
    let sql = `
      SELECT r.id, r.seminar_hall_id, r.event_title, r.resource_person_name,
             r.no_of_days, r.event_date, r.time_slot, r.start_date, r.end_date, r.selected_dates,
             r.status, r.created_at,
             sh.name as seminar_hall_name, sh.code as seminar_hall_code, sh.block as seminar_hall_block,
             u.name as requester_name, u.email as requester_email,
             d.name as dept_name, d.code as dept_code
      FROM seminar_hall_requests r
      JOIN seminar_halls sh ON r.seminar_hall_id = sh.id
      JOIN users u ON r.requester_id = u.id
      LEFT JOIN departments d ON r.department_id = d.id
      WHERE r.status IN ('Pending', 'Approved')
    `;
    const params: any[] = [];
    if (seminarHallId) {
      sql += ` AND r.seminar_hall_id = ?`;
      params.push(Number(seminarHallId));
    }
    sql += ` ORDER BY COALESCE(r.event_date, r.start_date) ASC`;
    const rows = await db.all(sql, params);

    res.json(rows.map(r => ({
      id: r.id,
      seminarHallId: r.seminar_hall_id,
      seminarHallName: r.seminar_hall_name,
      seminarHallCode: r.seminar_hall_code,
      seminarHallBlock: r.seminar_hall_block,
      eventDate: r.event_date,
      timeSlot: r.time_slot,
      noOfDays: r.no_of_days,
      startDate: r.start_date,
      endDate: r.end_date,
      selectedDates: r.selected_dates,
      status: r.status,
      hodName: r.requester_name,
      requesterEmail: r.requester_email,
      departmentCode: r.dept_code,
      departmentName: r.dept_name,
      eventTitle: r.event_title,
      resourcePersonName: r.resource_person_name,
    })));
  } catch (err) {
    console.error('Failed to get calendar bookings:', err);
    res.status(500).send('Internal server error');
  }
});

// Helper to detect conflicting bookings
async function checkBookingConflicts(
  seminarHallId: number,
  noOfDays: number,
  eventDate?: string | null,
  timeSlot?: string | null,
  startDate?: string | null,
  endDate?: string | null
) {
  const activeBookings = await db.all(
    `SELECT r.*, u.name as requester_name, d.code as dept_code, d.name as dept_name
     FROM seminar_hall_requests r
     JOIN users u ON r.requester_id = u.id
     LEFT JOIN departments d ON r.department_id = d.id
     WHERE r.seminar_hall_id = ? AND r.status IN ('Pending', 'Approved')`,
    [seminarHallId]
  );

  const conflicts: any[] = [];

  const isCandidateMulti = noOfDays > 1;
  const candStart = isCandidateMulti ? startDate! : eventDate!;
  const candEnd = isCandidateMulti ? endDate! : eventDate!;
  const candSlot = isCandidateMulti ? 'Full Day' : (timeSlot || 'Full Day');

  for (const b of activeBookings) {
    const isExistingMulti = b.no_of_days > 1;
    const existStart = isExistingMulti ? b.start_date : b.event_date;
    const existEnd = isExistingMulti ? b.end_date : b.event_date;
    const existSlot = isExistingMulti ? 'Full Day' : (b.time_slot || 'Full Day');

    if (!existStart || !existEnd) continue;

    // Check date range intersection: [candStart, candEnd] overlaps [existStart, existEnd]
    const dateOverlap = candStart <= existEnd && existStart <= candEnd;
    if (!dateOverlap) continue;

    // If dates overlap, check slot intersection
    if (candStart === candEnd && existStart === existEnd && candStart === existStart) {
      // Exactly same single day
      if (candSlot === 'Full Day' || existSlot === 'Full Day') {
        conflicts.push(b);
      } else if (candSlot === existSlot) {
        conflicts.push(b);
      }
      // If one is FN and one is AN, no conflict
    } else {
      // Spans multiple dates
      conflicts.push(b);
    }
  }

  return conflicts;
}

// Get request statistics
requestsRouter.get('/stats', authenticateJWT, async (req, res) => {
  const userReq = (req as any).user;
  const userRole = userReq.role;
  const userId = userReq.userId || userReq.id;

  try {
    let whereClause = '';
    const params: any[] = [];

    if (userRole === 'ROLE_HOD') {
      const deptId = userReq.departmentId;
      if (deptId) {
        whereClause = ` WHERE (department_id = ? OR (department_id IS NULL AND requester_id = ?))`;
        params.push(deptId, userId);
      } else {
        whereClause = ` WHERE requester_id = ?`;
        params.push(userId);
      }
    } else if (userRole === 'ROLE_SEMINAR_HALL_ALLOCATOR') {
      let hallId = userReq.seminarHallId;
      if (!hallId) {
        const uRow = await db.get('SELECT seminar_hall_id FROM users WHERE id = ?', [userId]);
        hallId = uRow?.seminar_hall_id;
      }
      whereClause = ` WHERE seminar_hall_id = ?`;
      params.push(hallId || 0);
    }

    const rows = await db.all(
      `SELECT status, COUNT(*) as count FROM seminar_hall_requests ${whereClause} GROUP BY status`,
      params
    );

    const stats = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    };

    rows.forEach((r: any) => {
      const c = parseInt(r.count) || 0;
      stats.total += c;
      const s = (r.status || '').toLowerCase();
      if (s === 'pending') stats.pending += c;
      else if (s === 'approved') stats.approved += c;
      else if (s === 'rejected') stats.rejected += c;
    });

    res.json(stats);
  } catch (err) {
    console.error('Failed to get SHR stats:', err);
    res.status(500).send('Internal server error');
  }
});

// Submit a new Seminar Hall Request (POST /)
requestsRouter.post('/', authenticateJWT, async (req, res) => {
  const {
    seminarHallId,
    resourcePersonName,
    participantsCount,
    eventTitle,
    eventDescription,
    noOfDays,
    eventDate,
    timeSlot,
    startDate,
    endDate,
    selectedDates,
    override
  } = req.body;

  const userReq = (req as any).user;
  const userRole = userReq.role;
  const userId = userReq.userId || userReq.id;
  const deptId = userReq.departmentId || null;

  if (!seminarHallId || !resourcePersonName || !participantsCount) {
    return res.status(400).send('Seminar Hall, Resource Person Name, and Participants Count are required');
  }

  const days = parseInt(noOfDays) || 1;
  if (days === 1) {
    if (!eventDate) {
      return res.status(400).send('Event Date is required for a single day booking');
    }
    if (!timeSlot) {
      return res.status(400).send('Time slot (FN, AN, or Full Day) is required for a single day booking');
    }
  } else {
    if (!startDate || !endDate) {
      return res.status(400).send('Start date and end date are required for multi-day events');
    }
    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).send('Start date cannot be after end date');
    }
  }

  try {
    const hall = await db.get('SELECT id, name, block FROM seminar_halls WHERE id = ?', [seminarHallId]);
    if (!hall) {
      return res.status(404).send('Seminar Hall not found');
    }

    // Check for conflicting bookings on this hall
    const conflicts = await checkBookingConflicts(
      Number(seminarHallId),
      days,
      days === 1 ? eventDate : null,
      days === 1 ? timeSlot : null,
      days > 1 ? startDate : null,
      days > 1 ? endDate : null
    );

    const isPrincipal = userRole === 'ROLE_PRINCIPAL';

    if (conflicts.length > 0) {
      if (!isPrincipal) {
        const first = conflicts[0];
        const conflictHod = first.requester_name || 'Another department';
        const conflictDept = first.dept_code ? `(${first.dept_code})` : '';
        const conflictSlot = first.time_slot || (first.no_of_days > 1 ? 'Full Day Multi-day' : 'Full Day');
        const conflictTitle = first.event_title || first.resource_person_name;
        return res.status(409).send(
          `Slot already booked by ${conflictHod} ${conflictDept} for "${conflictTitle}" (${conflictSlot}). Only Principal can override existing bookings.`
        );
      } else {
        // Principal booking: Check if override was confirmed
        if (!override) {
          const conflictNames = conflicts.map(c => `${c.requester_name} (${c.dept_code || 'Dept'})`).join(', ');
          return res.status(409).json({
            canOverride: true,
            message: `This slot is already booked by ${conflictNames}. Do you want to override this booking?`,
            conflicts: conflicts.map(c => ({
              id: c.id,
              hodName: c.requester_name,
              departmentCode: c.dept_code,
              eventTitle: c.event_title,
              timeSlot: c.time_slot
            }))
          });
        }

        // Principal override confirmed: Cancel conflicting bookings and notify affected HODs
        for (const c of conflicts) {
          await db.run(
            `UPDATE seminar_hall_requests
             SET status = 'Cancelled', allocator_remarks = ?, allocated_by_id = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [`Overridden by Principal for "${eventTitle || resourcePersonName}"`, userId, c.id]
          );

          const timingStr = days === 1 ? `${eventDate} (${timeSlot})` : `${startDate} to ${endDate}`;
          const cancelMsg = `Your seminar hall booking ${c.id} for ${hall.name} on ${timingStr} has been overridden by the Principal for "${eventTitle || resourcePersonName}".`;
          await notificationService.sendToUser(c.requester_id, cancelMsg, 'SHR_OVERRIDDEN_BY_PRINCIPAL');
        }
      }
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const requestId = `SHR-${randomSuffix}`;
    const initialStatus = isPrincipal ? 'Approved' : 'Pending';
    const initialAllocatedBy = isPrincipal ? userId : null;
    const initialRemarks = isPrincipal
      ? (conflicts.length > 0 ? 'Approved by Principal (Overridden previous department booking)' : 'Directly Approved by Principal')
      : null;

    await db.run(
      `INSERT INTO seminar_hall_requests 
       (id, seminar_hall_id, requester_id, department_id, resource_person_name, participants_count,
        event_title, event_description, no_of_days, event_date, time_slot, start_date, end_date, selected_dates, status, allocated_by_id, allocator_remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        requestId,
        seminarHallId,
        userId,
        deptId,
        resourcePersonName.trim(),
        parseInt(participantsCount),
        eventTitle ? eventTitle.trim() : `Event by ${resourcePersonName}`,
        eventDescription ? eventDescription.trim() : '',
        days,
        eventDate || null,
        timeSlot || null,
        startDate || null,
        endDate || null,
        selectedDates || null,
        initialStatus,
        initialAllocatedBy,
        initialRemarks
      ]
    );

    // Notify the allocator assigned to this hall
    const allocators = await db.all(
      `SELECT u.id, u.name, u.email 
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.seminar_hall_id = ? AND r.name = 'ROLE_SEMINAR_HALL_ALLOCATOR'`,
      [seminarHallId]
    );

    const timingStr = days === 1 ? `${eventDate} (${timeSlot})` : `${startDate} to ${endDate} (${days} days)`;
    const notifMsg = isPrincipal
      ? `Principal created & approved booking ${requestId} for ${hall.name}: "${eventTitle || resourcePersonName}" on ${timingStr}`
      : `New booking request ${requestId} for ${hall.name} from ${userReq.name}: "${eventTitle || resourcePersonName}" on ${timingStr}`;

    for (const alloc of allocators) {
      await notificationService.sendToUser(alloc.id, notifMsg, 'SHR_NEW_REQUEST');
    }

    sendToTopic('/topic/dashboard-tick', { type: 'SHR_NEW_REQUEST', requestId, hallId: seminarHallId });

    const createdRow = await db.get(
      `SELECT r.*,
              sh.name as seminar_hall_name, sh.code as seminar_hall_code, sh.block as seminar_hall_block, sh.capacity as seminar_hall_capacity,
              u.name as requester_name, u.email as requester_email,
              d.name as dept_name, d.code as dept_code
       FROM seminar_hall_requests r
       JOIN seminar_halls sh ON r.seminar_hall_id = sh.id
       JOIN users u ON r.requester_id = u.id
       LEFT JOIN departments d ON r.department_id = d.id
       WHERE r.id = ?`,
      [requestId]
    );

    res.json(formatShrRow(createdRow));
  } catch (err) {
    console.error('Failed to create seminar hall request:', err);
    res.status(400).send((err as Error).message);
  }
});

// Principal direct override endpoint (POST /:id/override)
requestsRouter.post('/:id/override', authenticateJWT, authorizeRoles('ROLE_PRINCIPAL'), async (req, res) => {
  const { id } = req.params;
  const { remarks } = req.body;
  const userReq = (req as any).user;
  const userId = userReq.userId || userReq.id;

  try {
    const existing = await db.get(
      `SELECT r.*, sh.name as seminar_hall_name, u.id as req_user_id, u.name as req_name
       FROM seminar_hall_requests r
       JOIN seminar_halls sh ON r.seminar_hall_id = sh.id
       JOIN users u ON r.requester_id = u.id
       WHERE r.id = ?`,
      [id]
    );

    if (!existing) {
      return res.status(404).send('Seminar hall request not found');
    }

    const overrideReason = remarks ? remarks.trim() : 'Overridden by Principal decision';

    await db.run(
      `UPDATE seminar_hall_requests
       SET status = 'Cancelled', allocator_remarks = ?, allocated_by_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [overrideReason, userId, id]
    );

    const timingStr = existing.no_of_days === 1
      ? `${existing.event_date} (${existing.time_slot})`
      : `${existing.start_date} to ${existing.end_date}`;

    const notifMsg = `Your seminar hall booking ${id} for ${existing.seminar_hall_name} on ${timingStr} has been cancelled/overridden by Principal: "${overrideReason}"`;
    await notificationService.sendToUser(existing.req_user_id, notifMsg, 'SHR_OVERRIDDEN_BY_PRINCIPAL');

    sendToTopic('/topic/dashboard-tick', { type: 'SHR_STATUS_CHANGED', requestId: id, status: 'Cancelled' });

    res.json({ message: `Request ${id} overridden successfully` });
  } catch (err) {
    console.error('Failed to override seminar hall request:', err);
    res.status(400).send((err as Error).message);
  }
});

// Update request status (PATCH /:id/status)
requestsRouter.patch('/:id/status', authenticateJWT, authorizeRoles('ROLE_SEMINAR_HALL_ALLOCATOR', 'ROLE_PRINCIPAL'), async (req, res) => {
  const { id } = req.params;
  const { status, remarks } = req.body;
  const userReq = (req as any).user;
  const userId = userReq.userId || userReq.id;

  if (!status || !['Approved', 'Rejected', 'Cancelled'].includes(status)) {
    return res.status(400).send("Status must be 'Approved', 'Rejected', or 'Cancelled'");
  }

  try {
    const existing = await db.get(
      `SELECT r.*, sh.name as seminar_hall_name, u.id as req_user_id, u.name as req_name 
       FROM seminar_hall_requests r
       JOIN seminar_halls sh ON r.seminar_hall_id = sh.id
       JOIN users u ON r.requester_id = u.id
       WHERE r.id = ?`,
      [id]
    );

    if (!existing) {
      return res.status(404).send('Seminar hall request not found');
    }

    if (userReq.role === 'ROLE_SEMINAR_HALL_ALLOCATOR') {
      let hallId = userReq.seminarHallId;
      if (!hallId) {
        const uRow = await db.get('SELECT seminar_hall_id FROM users WHERE id = ?', [userId]);
        hallId = uRow?.seminar_hall_id;
      }
      if (Number(existing.seminar_hall_id) !== Number(hallId)) {
        return res.status(403).send('You can only allocate requests for your assigned seminar hall');
      }
    }

    await db.run(
      `UPDATE seminar_hall_requests
       SET status = ?, allocator_remarks = ?, allocated_by_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, remarks ? remarks.trim() : null, userId, id]
    );

    const notifMsg = `Your seminar hall request ${id} for ${existing.seminar_hall_name} has been ${status.toUpperCase()} by ${userReq.name}.${remarks ? ` Note: "${remarks}"` : ''}`;
    await notificationService.sendToUser(existing.req_user_id, notifMsg, `SHR_STATUS_${status.toUpperCase()}`);

    sendToTopic('/topic/dashboard-tick', { type: 'SHR_STATUS_CHANGED', requestId: id, status });

    const updated = await db.get(
      `SELECT r.*,
              sh.name as seminar_hall_name, sh.code as seminar_hall_code, sh.block as seminar_hall_block, sh.capacity as seminar_hall_capacity,
              u.name as requester_name, u.email as requester_email,
              d.name as dept_name, d.code as dept_code,
              alloc.name as allocator_user_name
       FROM seminar_hall_requests r
       JOIN seminar_halls sh ON r.seminar_hall_id = sh.id
       JOIN users u ON r.requester_id = u.id
       LEFT JOIN departments d ON r.department_id = d.id
       LEFT JOIN users alloc ON r.allocated_by_id = alloc.id
       WHERE r.id = ?`,
      [id]
    );

    res.json(formatShrRow(updated));
  } catch (err) {
    console.error('Failed to update SHR status:', err);
    res.status(400).send((err as Error).message);
  }
});

// DELETE /api/seminar-requests/:id - HOD (own request) or Principal deletes a request
requestsRouter.delete('/:id', authenticateJWT, async (req, res) => {
  const userReq = (req as any).user;
  const userRole = userReq.role;
  const userId = userReq.userId || userReq.id;
  const { id } = req.params;

  try {
    const existing = await db.get('SELECT requester_id FROM seminar_hall_requests WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).send('Seminar hall request not found');
    }

    if (userRole !== 'ROLE_PRINCIPAL' && existing.requester_id !== userId) {
      return res.status(403).send('Forbidden: You can only delete your own department requests');
    }

    await db.run('DELETE FROM seminar_hall_requests WHERE id = ?', [id]);
    sendToTopic('/topic/dashboard-tick', { type: 'SHR_REQUEST_DELETED', requestId: id });
    res.json({ message: `Seminar hall request ${id} deleted successfully` });
  } catch (err) {
    console.error('Failed to delete SHR request:', err);
    res.status(500).send('Failed to delete seminar hall request');
  }
});

// POST /api/seminar-requests/bulk-delete - Principal bulk delete
requestsRouter.post('/bulk-delete', authenticateJWT, async (req, res) => {
  const userReq = (req as any).user;
  if (userReq.role !== 'ROLE_PRINCIPAL') {
    return res.status(403).send('Only Principal can bulk delete seminar hall requests');
  }

  const { ids, all } = req.body;

  try {
    if (all === true) {
      await db.run('DELETE FROM seminar_hall_requests');
      sendToTopic('/topic/dashboard-tick', { type: 'SHR_BULK_DELETED' });
      return res.json({ message: 'All seminar hall requests deleted successfully' });
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).send('Array of ticket IDs is required');
    }

    const placeholders = ids.map(() => '?').join(',');
    await db.run(`DELETE FROM seminar_hall_requests WHERE id IN (${placeholders})`, ids);
    sendToTopic('/topic/dashboard-tick', { type: 'SHR_BULK_DELETED', ids });
    res.json({ message: `${ids.length} seminar hall requests deleted successfully` });
  } catch (err) {
    console.error('Failed to bulk delete SHR requests:', err);
    res.status(500).send('Failed to bulk delete seminar hall requests');
  }
});

// Backward-compatibility default router
const defaultRouter = Router();
defaultRouter.use('/requests', requestsRouter);
defaultRouter.use('/', hallsRouter);
export default defaultRouter;

