import express from 'express';
import { db } from '../db/db';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { notificationService } from '../services/notificationService';
import { sendToTopic } from '../ws/broker';

export const transportRouter = express.Router();

function formatTransportRow(row: any) {
  return {
    id: row.id,
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
    transportType: row.transport_type,
    purpose: row.purpose,
    personCount: row.person_count,
    startDate: row.start_date,
    startTime: row.start_time,
    status: row.status,
    aoRemarks: row.ao_remarks,
    aoActionBy: row.ao_action_user_name ? {
      id: row.ao_action_by_id,
      name: row.ao_action_user_name,
    } : null,
    aoActionAt: row.ao_action_at,
    allocatedVehicle: row.allocated_vehicle,
    allocatedVehicleCount: row.allocated_vehicle_count,
    tripStartedAt: row.trip_started_at,
    tripEndedAt: row.trip_ended_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/transport/requests - List requests
transportRouter.get('/requests', authenticateJWT, async (req, res) => {
  try {
    const user = (req as any).user;
    const { status, transportType, search } = req.query;

    let sql = `
      SELECT 
        tr.*,
        u.name as requester_name,
        u.email as requester_email,
        d.name as dept_name,
        d.code as dept_code,
        ao_u.name as ao_action_user_name
      FROM transport_requests tr
      LEFT JOIN users u ON tr.requester_id = u.id
      LEFT JOIN departments d ON tr.department_id = d.id
      LEFT JOIN users ao_u ON tr.ao_action_by_id = ao_u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Department isolation: HOD only sees their department's requests
    if (user.roleName === 'ROLE_HOD' && user.deptId) {
      sql += ' AND tr.department_id = ?';
      params.push(user.deptId);
    }

    if (status && typeof status === 'string' && status !== 'All') {
      sql += ' AND tr.status = ?';
      params.push(status);
    }

    if (transportType && typeof transportType === 'string' && transportType !== 'All') {
      sql += ' AND tr.transport_type = ?';
      params.push(transportType);
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      sql += ' AND (LOWER(tr.id) LIKE ? OR LOWER(tr.purpose) LIKE ? OR LOWER(tr.transport_type) LIKE ? OR LOWER(d.name) LIKE ?)';
      params.push(q, q, q, q);
    }

    sql += ' ORDER BY tr.created_at DESC';

    const rows = await db.all(sql, params);
    res.json(rows.map(formatTransportRow));
  } catch (err) {
    console.error('Failed to fetch transport requests:', err);
    res.status(500).send('Failed to fetch transport requests');
  }
});

// GET /api/transport/stats - Aggregate stats
transportRouter.get('/stats', authenticateJWT, async (req, res) => {
  try {
    const user = (req as any).user;
    let baseSql = 'FROM transport_requests WHERE 1=1';
    const params: any[] = [];

    if (user.roleName === 'ROLE_HOD' && user.deptId) {
      baseSql += ' AND department_id = ?';
      params.push(user.deptId);
    }

    const totalRow = await db.get(`SELECT COUNT(*) as count ${baseSql}`, params);
    const pendingRow = await db.get(`SELECT COUNT(*) as count ${baseSql} AND status = 'PENDING_AO'`, params);
    const approvedRow = await db.get(`SELECT COUNT(*) as count ${baseSql} AND status = 'APPROVED'`, params);
    const startedRow = await db.get(`SELECT COUNT(*) as count ${baseSql} AND status = 'STARTED'`, params);
    const completedRow = await db.get(`SELECT COUNT(*) as count ${baseSql} AND status = 'COMPLETED'`, params);
    const rejectedRow = await db.get(`SELECT COUNT(*) as count ${baseSql} AND status = 'REJECTED'`, params);

    res.json({
      total: totalRow ? parseInt(totalRow.count) : 0,
      pendingAO: pendingRow ? parseInt(pendingRow.count) : 0,
      approved: approvedRow ? parseInt(approvedRow.count) : 0,
      started: startedRow ? parseInt(startedRow.count) : 0,
      completed: completedRow ? parseInt(completedRow.count) : 0,
      rejected: rejectedRow ? parseInt(rejectedRow.count) : 0,
    });
  } catch (err) {
    console.error('Failed to fetch transport stats:', err);
    res.status(500).send('Failed to fetch transport stats');
  }
});

// POST /api/transport/requests - Create new transport request (HOD)
transportRouter.post('/requests', authenticateJWT, requireRole(['ROLE_HOD', 'ROLE_PRINCIPAL']), async (req, res) => {
  const user = (req as any).user;
  const { transportType, purpose, personCount, startDate, startTime } = req.body;

  if (!transportType || !['BUS', 'Car', 'Bike'].includes(transportType)) {
    return res.status(400).send('Valid transport type (BUS, Car, Bike) is required');
  }
  if (!purpose || !purpose.trim()) {
    return res.status(400).send('Purpose of travel is required');
  }
  const count = parseInt(personCount, 10);
  if (isNaN(count) || count < 1) {
    return res.status(400).send('A valid person count of at least 1 is required');
  }
  if (!startDate || !startTime) {
    return res.status(400).send('Start date and start timing are required');
  }

  try {
    // Generate unique ID e.g. TR-5421
    let trId = `TR-${Math.floor(1000 + Math.random() * 9000)}`;
    let exists = await db.get('SELECT id FROM transport_requests WHERE id = ?', [trId]);
    while (exists) {
      trId = `TR-${Math.floor(1000 + Math.random() * 9000)}`;
      exists = await db.get('SELECT id FROM transport_requests WHERE id = ?', [trId]);
    }

    await db.run(
      `INSERT INTO transport_requests (
        id, requester_id, department_id, transport_type, purpose, person_count, start_date, start_time, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_AO')`,
      [trId, user.id, user.deptId || null, transportType, purpose.trim(), count, startDate, startTime]
    );

    // Fetch created row
    const createdRow = await db.get(`
      SELECT 
        tr.*,
        u.name as requester_name,
        u.email as requester_email,
        d.name as dept_name,
        d.code as dept_code
      FROM transport_requests tr
      LEFT JOIN users u ON tr.requester_id = u.id
      LEFT JOIN departments d ON tr.department_id = d.id
      WHERE tr.id = ?
    `, [trId]);

    const formatted = formatTransportRow(createdRow);

    // Broadcast WebSocket updates
    sendToTopic('dashboard:admin', {
      type: 'TRANSPORT_REQUEST_CREATED',
      payload: formatted,
    });
    sendToTopic('dashboard:ao', {
      type: 'TRANSPORT_REQUEST_CREATED',
      payload: formatted,
    });
    sendToTopic('/topic/dashboard', {
      type: 'TRANSPORT_REQUEST_CREATED',
      payload: formatted,
    });
    if (user.deptId) {
      sendToTopic(`department:${user.deptId}`, {
        type: 'TRANSPORT_REQUEST_CREATED',
        payload: formatted,
      });
    }

    res.status(201).json(formatted);
  } catch (err) {
    console.error('Failed to create transport request:', err);
    res.status(500).send('Failed to submit transport request');
  }
});

// PATCH /api/transport/requests/:id/ao-action - AO accepts or declines
transportRouter.patch('/requests/:id/ao-action', authenticateJWT, requireRole(['ROLE_AO', 'ROLE_PRINCIPAL']), async (req, res) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { action, allocatedVehicle, allocatedVehicleCount, remarks } = req.body;

  if (!action || !['APPROVE', 'REJECT'].includes(action)) {
    return res.status(400).send('Action must be APPROVE or REJECT');
  }

  try {
    const existing = await db.get('SELECT * FROM transport_requests WHERE id = ?', [id]);
    if (!existing) {
      return res.status(400).send('Transport request not found');
    }

    if (action === 'APPROVE') {
      if (!allocatedVehicle || !allocatedVehicle.trim()) {
        return res.status(400).send('Allocated vehicle details are required to approve');
      }
      const vCount = allocatedVehicleCount ? parseInt(allocatedVehicleCount, 10) : 1;
      if (isNaN(vCount) || vCount < 1) {
        return res.status(400).send('Allocated vehicle count must be at least 1');
      }

      await db.run(
        `UPDATE transport_requests 
         SET status = 'APPROVED',
             allocated_vehicle = ?,
             allocated_vehicle_count = ?,
             ao_remarks = ?,
             ao_action_by_id = ?,
             ao_action_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [allocatedVehicle.trim(), vCount, remarks ? remarks.trim() : null, user.id, id]
      );
    } else {
      // REJECT
      if (!remarks || !remarks.trim()) {
        return res.status(400).send('Remarks / reason are required when declining a transport request');
      }

      await db.run(
        `UPDATE transport_requests 
         SET status = 'REJECTED',
             ao_remarks = ?,
             ao_action_by_id = ?,
             ao_action_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [remarks.trim(), user.id, id]
      );
    }

    // Fetch updated row
    const updatedRow = await db.get(`
      SELECT 
        tr.*,
        u.name as requester_name,
        u.email as requester_email,
        d.name as dept_name,
        d.code as dept_code,
        ao_u.name as ao_action_user_name
      FROM transport_requests tr
      LEFT JOIN users u ON tr.requester_id = u.id
      LEFT JOIN departments d ON tr.department_id = d.id
      LEFT JOIN users ao_u ON tr.ao_action_by_id = ao_u.id
      WHERE tr.id = ?
    `, [id]);

    const formatted = formatTransportRow(updatedRow);

    sendToTopic('dashboard:admin', { type: 'TRANSPORT_REQUEST_UPDATED', payload: formatted });
    sendToTopic('dashboard:ao', { type: 'TRANSPORT_REQUEST_UPDATED', payload: formatted });
    sendToTopic('/topic/dashboard', { type: 'TRANSPORT_REQUEST_UPDATED', payload: formatted });
    if (updatedRow.department_id) {
      sendToTopic(`department:${updatedRow.department_id}`, { type: 'TRANSPORT_REQUEST_UPDATED', payload: formatted });
    }

    res.json(formatted);
  } catch (err) {
    console.error('Failed to process AO transport action:', err);
    res.status(500).send('Failed to process transport request action');
  }
});

// PATCH /api/transport/requests/:id/start - HOD marks trip as Started
transportRouter.patch('/requests/:id/start', authenticateJWT, async (req, res) => {
  const user = (req as any).user;
  const { id } = req.params;

  try {
    const existing = await db.get('SELECT * FROM transport_requests WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).send('Transport request not found');
    }

    if (existing.status !== 'APPROVED') {
      return res.status(400).send('Trip can only be started when request is in APPROVED status');
    }

    // Check authorization: requester or HOD of department or AO/Principal
    if (user.roleName === 'ROLE_HOD' && user.deptId && existing.department_id !== user.deptId) {
      return res.status(403).send('Not authorized to start trip for another department');
    }

    await db.run(
      `UPDATE transport_requests 
       SET status = 'STARTED',
           trip_started_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [id]
    );

    const updatedRow = await db.get(`
      SELECT 
        tr.*,
        u.name as requester_name,
        u.email as requester_email,
        d.name as dept_name,
        d.code as dept_code,
        ao_u.name as ao_action_user_name
      FROM transport_requests tr
      LEFT JOIN users u ON tr.requester_id = u.id
      LEFT JOIN departments d ON tr.department_id = d.id
      LEFT JOIN users ao_u ON tr.ao_action_by_id = ao_u.id
      WHERE tr.id = ?
    `, [id]);

    const formatted = formatTransportRow(updatedRow);
    sendToTopic('dashboard:admin', { type: 'TRANSPORT_TRIP_STARTED', payload: formatted });
    sendToTopic('dashboard:ao', { type: 'TRANSPORT_TRIP_STARTED', payload: formatted });
    sendToTopic('/topic/dashboard', { type: 'TRANSPORT_TRIP_STARTED', payload: formatted });
    if (updatedRow.department_id) {
      sendToTopic(`department:${updatedRow.department_id}`, { type: 'TRANSPORT_TRIP_STARTED', payload: formatted });
    }

    res.json(formatted);
  } catch (err) {
    console.error('Failed to start transport trip:', err);
    res.status(500).send('Failed to start trip');
  }
});

// PATCH /api/transport/requests/:id/end - HOD marks trip as Completed
transportRouter.patch('/requests/:id/end', authenticateJWT, async (req, res) => {
  const user = (req as any).user;
  const { id } = req.params;

  try {
    const existing = await db.get('SELECT * FROM transport_requests WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).send('Transport request not found');
    }

    if (existing.status !== 'STARTED') {
      return res.status(400).send('Trip can only be completed when request is currently in STARTED status');
    }

    // Check authorization
    if (user.roleName === 'ROLE_HOD' && user.deptId && existing.department_id !== user.deptId) {
      return res.status(403).send('Not authorized to complete trip for another department');
    }

    await db.run(
      `UPDATE transport_requests 
       SET status = 'COMPLETED',
           trip_ended_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [id]
    );

    const updatedRow = await db.get(`
      SELECT 
        tr.*,
        u.name as requester_name,
        u.email as requester_email,
        d.name as dept_name,
        d.code as dept_code,
        ao_u.name as ao_action_user_name
      FROM transport_requests tr
      LEFT JOIN users u ON tr.requester_id = u.id
      LEFT JOIN departments d ON tr.department_id = d.id
      LEFT JOIN users ao_u ON tr.ao_action_by_id = ao_u.id
      WHERE tr.id = ?
    `, [id]);

    const formatted = formatTransportRow(updatedRow);
    sendToTopic('dashboard:admin', { type: 'TRANSPORT_TRIP_COMPLETED', payload: formatted });
    sendToTopic('dashboard:ao', { type: 'TRANSPORT_TRIP_COMPLETED', payload: formatted });
    sendToTopic('/topic/dashboard', { type: 'TRANSPORT_TRIP_COMPLETED', payload: formatted });
    if (updatedRow.department_id) {
      sendToTopic(`department:${updatedRow.department_id}`, { type: 'TRANSPORT_TRIP_COMPLETED', payload: formatted });
    }

    res.json(formatted);
  } catch (err) {
    console.error('Failed to complete transport trip:', err);
    res.status(500).send('Failed to complete trip');
  }
});

// DELETE /api/transport/requests/:id - Delete single request (HOD own dept / Principal)
transportRouter.delete('/requests/:id', authenticateJWT, async (req, res) => {
  const user = (req as any).user;
  const { id } = req.params;

  try {
    const existing = await db.get('SELECT * FROM transport_requests WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).send('Transport request not found');
    }

    // HOD can only delete their own department's requests
    if (user.roleName === 'ROLE_HOD' && user.deptId && existing.department_id !== user.deptId) {
      return res.status(403).send('Not authorized to delete transport requests of other departments');
    }

    await db.run('DELETE FROM transport_requests WHERE id = ?', [id]);

    sendToTopic('dashboard:admin', { type: 'TRANSPORT_REQUEST_DELETED', payload: { id } });
    sendToTopic('dashboard:ao', { type: 'TRANSPORT_REQUEST_DELETED', payload: { id } });
    sendToTopic('/topic/dashboard', { type: 'TRANSPORT_REQUEST_DELETED', payload: { id } });
    if (existing.department_id) {
      sendToTopic(`department:${existing.department_id}`, { type: 'TRANSPORT_REQUEST_DELETED', payload: { id } });
    }

    res.json({ success: true, message: `Transport request ${id} deleted successfully` });
  } catch (err) {
    console.error('Failed to delete transport request:', err);
    res.status(500).send('Failed to delete transport request');
  }
});

// POST /api/transport/requests/bulk-delete - Bulk delete requests (Principal / HOD)
transportRouter.post('/requests/bulk-delete', authenticateJWT, async (req, res) => {
  const user = (req as any).user;
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).send('Array of request IDs is required');
  }

  try {
    let deletedCount = 0;
    for (const id of ids) {
      const existing = await db.get('SELECT * FROM transport_requests WHERE id = ?', [id]);
      if (!existing) continue;

      if (user.roleName === 'ROLE_HOD' && user.deptId && existing.department_id !== user.deptId) {
        continue;
      }

      await db.run('DELETE FROM transport_requests WHERE id = ?', [id]);
      deletedCount++;
    }

    res.json({ success: true, count: deletedCount });
  } catch (err) {
    console.error('Failed to bulk delete transport requests:', err);
    res.status(500).send('Failed to bulk delete transport requests');
  }
});
