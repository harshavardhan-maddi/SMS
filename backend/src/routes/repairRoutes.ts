import { Router } from 'express';
import { db } from '../db/db';
import { authenticateJWT } from '../middleware/auth';
import { notificationService } from '../services/notificationService';

const router = Router();

function getLocalDates() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  const timeStr = now.toTimeString().split(' ')[0];
  return { todayStr, timeStr };
}

// Helper to format a single repair request row
function formatRepairRequest(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    initiatedDate: row.initiated_date,
    initiatedTime: row.initiated_time,
    inventory: {
      id: row.inventory_id,
      type: row.inv_type,
      brand: row.inv_brand,
      model: row.inv_model,
      status: row.inv_status,
      department: row.inv_dept_id ? {
        id: row.inv_dept_id,
        name: row.dept_name,
        code: row.dept_code
      } : null
    },
    requester: row.requester_id ? {
      id: row.requester_id,
      name: row.req_name,
      email: row.req_email
    } : null,
    assignedTo: row.assigned_to_id ? {
      id: row.assigned_to_id,
      name: row.assigned_name,
      email: row.assigned_email
    } : null
  };
}

// 1. Get all repair requests (optionally filtered by departmentId)
router.get('/', authenticateJWT, async (req, res) => {
  const departmentId = req.query.departmentId;
  try {
    let query = `
      SELECT r.*, 
             inv.type as inv_type, inv.brand as inv_brand, inv.model as inv_model, inv.status as inv_status, inv.department_id as inv_dept_id,
             dept.name as dept_name, dept.code as dept_code,
             u.name as req_name, u.email as req_email,
             u2.name as assigned_name, u2.email as assigned_email
      FROM repair_requests r
      LEFT JOIN inventory inv ON r.inventory_id = inv.id
      LEFT JOIN departments dept ON inv.department_id = dept.id
      LEFT JOIN users u ON r.requester_id = u.id
      LEFT JOIN users u2 ON r.assigned_to_id = u2.id
    `;
    const params: any[] = [];

    if (departmentId) {
      query += ' WHERE inv.department_id = ?';
      params.push(departmentId);
    }
    
    // Sort so newer requests show up first
    query += ' ORDER BY r.initiated_date DESC, r.initiated_time DESC';

    const rows = await db.all(query, params);
    res.json(rows.map(formatRepairRequest));
  } catch (err) {
    console.error('Get repairs error:', err);
    res.status(500).send('Internal server error');
  }
});

// 2. Get recent repairs (optionally filtered by departmentId)
router.get('/recent', authenticateJWT, async (req, res) => {
  const departmentId = req.query.departmentId;
  try {
    let query = `
      SELECT r.*, 
             inv.type as inv_type, inv.brand as inv_brand, inv.model as inv_model, inv.status as inv_status, inv.department_id as inv_dept_id,
             dept.name as dept_name, dept.code as dept_code,
             u.name as req_name, u.email as req_email,
             u2.name as assigned_name, u2.email as assigned_email
      FROM repair_requests r
      LEFT JOIN inventory inv ON r.inventory_id = inv.id
      LEFT JOIN departments dept ON inv.department_id = dept.id
      LEFT JOIN users u ON r.requester_id = u.id
      LEFT JOIN users u2 ON r.assigned_to_id = u2.id
    `;
    const params: any[] = [];

    if (departmentId) {
      query += ' WHERE inv.department_id = ?';
      params.push(departmentId);
    }

    query += ' ORDER BY r.initiated_date DESC, r.initiated_time DESC LIMIT 5';

    const rows = await db.all(query, params);
    res.json(rows.map(formatRepairRequest));
  } catch (err) {
    console.error('Get recent repairs error:', err);
    res.status(500).send('Internal server error');
  }
});

// 3. Get repair request by ID
router.get('/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  try {
    const row = await db.get(
      `SELECT r.*, 
              inv.type as inv_type, inv.brand as inv_brand, inv.model as inv_model, inv.status as inv_status, inv.department_id as inv_dept_id,
              dept.name as dept_name, dept.code as dept_code,
              u.name as req_name, u.email as req_email,
              u2.name as assigned_name, u2.email as assigned_email
       FROM repair_requests r
       LEFT JOIN inventory inv ON r.inventory_id = inv.id
       LEFT JOIN departments dept ON inv.department_id = dept.id
       LEFT JOIN users u ON r.requester_id = u.id
       LEFT JOIN users u2 ON r.assigned_to_id = u2.id
       WHERE r.id = ?`,
      [id]
    );

    if (!row) {
      return res.status(404).send('Repair request not found');
    }

    res.json(formatRepairRequest(row));
  } catch (err) {
    console.error('Get repair request by ID error:', err);
    res.status(500).send('Internal server error');
  }
});

// 4. Get timeline history for a request
router.get('/:id/history', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  try {
    const rows = await db.all(
      `SELECT h.id, h.status, h.status_date as statusDate, h.status_time as statusTime, h.description, 
              h.parts_replaced as partsReplaced, h.expected_completion_days as expectedCompletionDays, 
              h.required_parts as requiredParts, h.problem_found as problemFound, h.solution, 
              h.reason_for_delay as reasonForDelay, h.remarks,
              u.id as user_id, u.name as user_name, u.email as user_email
       FROM repair_history h
       LEFT JOIN users u ON h.updated_by_id = u.id
       WHERE h.request_id = ?
       ORDER BY h.status_date ASC, h.status_time ASC`,
      [id]
    );

    const history = rows.map((row) => ({
      id: row.id,
      status: row.status,
      statusDate: row.statusDate,
      statusTime: row.statusTime,
      description: row.description,
      partsReplaced: row.partsReplaced,
      expectedCompletionDays: row.expectedCompletionDays,
      requiredParts: row.requiredParts,
      problemFound: row.problemFound,
      solution: row.solution,
      reasonForDelay: row.reasonForDelay,
      remarks: row.remarks,
      updatedBy: row.user_id ? {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email
      } : null
    }));

    res.json(history);
  } catch (err) {
    console.error('Get repair history error:', err);
    res.status(500).send('Internal server error');
  }
});

// 5. Report Issue / Initiate request (HOD action)
router.post('/initiate', authenticateJWT, async (req, res) => {
  const { assetId, requesterId, title, description, priority } = req.body;

  if (!assetId || !requesterId || !title || !priority) {
    return res.status(400).send('Missing required fields');
  }

  try {
    const inventory = await db.get(
      'SELECT i.id, i.type, d.code as dept_code FROM inventory i LEFT JOIN departments d ON i.department_id = d.id WHERE i.id = ?',
      [assetId]
    );
    if (!inventory) {
      return res.status(400).send('Inventory asset not found');
    }

    const requester = await db.get('SELECT id, name FROM users WHERE id = ?', [requesterId]);
    if (!requester) {
      return res.status(400).send('User not found');
    }

    // Generate Request ID: REQ- + (101 + count)
    const countRes = await db.get('SELECT COUNT(*) as count FROM repair_requests');
    const count = countRes ? countRes.count : 0;
    const requestId = `REQ-${101 + count}`;

    const { todayStr, timeStr } = getLocalDates();

    await db.transaction(async () => {
      // Update inventory status to Repairing
      await db.run("UPDATE inventory SET status = 'Repairing' WHERE id = ?", [assetId]);

      // Insert repair request
      await db.run(
        `INSERT INTO repair_requests (id, inventory_id, requester_id, title, description, priority, status, initiated_date, initiated_time)
         VALUES (?, ?, ?, ?, ?, ?, 'Initiated', ?, ?)`,
        [requestId, assetId, requesterId, title, description || null, priority, todayStr, timeStr]
      );

      // Create history timeline entry
      await db.run(
        `INSERT INTO repair_history (request_id, status, description, status_date, status_time, updated_by_id)
         VALUES (?, 'Initiated', ?, ?, ?, ?)`,
        [requestId, `Issue reported by HOD: ${description || title}`, todayStr, timeStr, requesterId]
      );
    });

    // Send notifications async
    notificationService.sendToRole(
      'ROLE_DEAN',
      `New repair request ${requestId} (${inventory.type}) initiated by ${requester.name} in ${inventory.dept_code || 'N/A'}`,
      'NEW_REPAIR'
    );
    notificationService.sendToRole(
      'ROLE_PRINCIPAL',
      `Repair request ${requestId} initiated for ${inventory.dept_code || 'N/A'}`,
      'NEW_REPAIR'
    );
    notificationService.broadcastDashboardUpdate();

    // Fetch and return created request
    const created = await db.get(
      `SELECT r.*, 
              inv.type as inv_type, inv.brand as inv_brand, inv.model as inv_model, inv.status as inv_status, inv.department_id as inv_dept_id,
              dept.name as dept_name, dept.code as dept_code,
              u.name as req_name, u.email as req_email,
              u2.name as assigned_name, u2.email as assigned_email
       FROM repair_requests r
       LEFT JOIN inventory inv ON r.inventory_id = inv.id
       LEFT JOIN departments dept ON inv.department_id = dept.id
       LEFT JOIN users u ON r.requester_id = u.id
       LEFT JOIN users u2 ON r.assigned_to_id = u2.id
       WHERE r.id = ?`,
      [requestId]
    );

    res.json(formatRepairRequest(created));
  } catch (err) {
    console.error('Initiate repair error:', err);
    res.status(400).send((err as Error).message);
  }
});

// 6. Start Repair (Computer Dean action - legacy compatibility)
router.post('/:id/start', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { deanId, repairDescription, expectedCompletionDays, requiredParts } = req.body;

  const updaterId = deanId || (req as any).user?.id;

  if (!updaterId || !repairDescription || !expectedCompletionDays) {
    return res.status(400).send('Missing required fields');
  }

  try {
    const request = await db.get(
      'SELECT r.id, r.requester_id, d.code as dept_code FROM repair_requests r LEFT JOIN inventory i ON r.inventory_id = i.id LEFT JOIN departments d ON i.department_id = d.id WHERE r.id = ?',
      [id]
    );
    if (!request) {
      return res.status(400).send('Repair request not found');
    }

    const updater = await db.get('SELECT name FROM users WHERE id = ?', [updaterId]);
    if (!updater) {
      return res.status(400).send('User not found');
    }

    const { todayStr, timeStr } = getLocalDates();

    await db.transaction(async () => {
      // Set status to In Progress
      await db.run("UPDATE repair_requests SET status = 'In Progress' WHERE id = ?", [id]);

      // Create history log
      await db.run(
        `INSERT INTO repair_history (request_id, status, description, expected_completion_days, required_parts, status_date, status_time, updated_by_id)
         VALUES (?, 'In Progress', ?, ?, ?, ?, ?, ?)`,
        [id, repairDescription, expectedCompletionDays, requiredParts || null, todayStr, timeStr, updaterId]
      );
    });

    // Send notifications
    if (request.requester_id) {
      notificationService.sendToUser(
        request.requester_id,
        `Repair started for request ${id} by ${updater.name}. Expected: ${expectedCompletionDays} days.`,
        'REPAIR_STARTED'
      );
    }
    notificationService.sendToRole(
      'ROLE_PRINCIPAL',
      `Repair started for request ${id} in ${request.dept_code || 'N/A'}`,
      'REPAIR_STARTED'
    );
    notificationService.broadcastDashboardUpdate();

    const updated = await db.get(
      `SELECT r.*, 
              inv.type as inv_type, inv.brand as inv_brand, inv.model as inv_model, inv.status as inv_status, inv.department_id as inv_dept_id,
              dept.name as dept_name, dept.code as dept_code,
              u.name as req_name, u.email as req_email,
              u2.name as assigned_name, u2.email as assigned_email
       FROM repair_requests r
       LEFT JOIN inventory inv ON r.inventory_id = inv.id
       LEFT JOIN departments dept ON inv.department_id = dept.id
       LEFT JOIN users u ON r.requester_id = u.id
       LEFT JOIN users u2 ON r.assigned_to_id = u2.id
       WHERE r.id = ?`,
      [id]
    );

    res.json(formatRepairRequest(updated));
  } catch (err) {
    console.error('Start repair error:', err);
    res.status(400).send((err as Error).message);
  }
});

// 7. Accept & Assign Request (Dean accepts and assigns to technician)
router.post('/:id/accept', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { technicianId } = req.body;
  const updaterId = (req as any).user?.id;

  if (!technicianId) {
    return res.status(400).send('Missing technicianId');
  }

  try {
    const request = await db.get(
      'SELECT r.id, r.requester_id, d.code as dept_code FROM repair_requests r LEFT JOIN inventory i ON r.inventory_id = i.id LEFT JOIN departments d ON i.department_id = d.id WHERE r.id = ?',
      [id]
    );
    if (!request) {
      return res.status(400).send('Repair request not found');
    }

    const technician = await db.get('SELECT id, name FROM users WHERE id = ?', [technicianId]);
    if (!technician) {
      return res.status(400).send('Technician not found');
    }

    const { todayStr, timeStr } = getLocalDates();

    await db.transaction(async () => {
      // Set status to Accepted and assign technician
      await db.run("UPDATE repair_requests SET status = 'Accepted', assigned_to_id = ? WHERE id = ?", [technicianId, id]);

      // Create history log
      await db.run(
        `INSERT INTO repair_history (request_id, status, description, status_date, status_time, updated_by_id)
         VALUES (?, 'Accepted', ?, ?, ?, ?)`,
        [id, `Accepted and assigned to technician: ${technician.name}`, todayStr, timeStr, updaterId]
      );
    });

    // Send notifications
    if (request.requester_id) {
      notificationService.sendToUser(
        request.requester_id,
        `Your repair request ${id} has been accepted and assigned to ${technician.name}.`,
        'REPAIR_STARTED'
      );
    }
    notificationService.sendToUser(
      technicianId,
      `New repair request ${id} assigned to you.`,
      'NEW_REPAIR'
    );
    notificationService.sendToRole(
      'ROLE_PRINCIPAL',
      `Repair request ${id} accepted and assigned to ${technician.name} in ${request.dept_code || 'N/A'}.`,
      'REPAIR_STARTED'
    );
    notificationService.broadcastDashboardUpdate();

    const updated = await db.get(
      `SELECT r.*, 
              inv.type as inv_type, inv.brand as inv_brand, inv.model as inv_model, inv.status as inv_status, inv.department_id as inv_dept_id,
              dept.name as dept_name, dept.code as dept_code,
              u.name as req_name, u.email as req_email,
              u2.name as assigned_name, u2.email as assigned_email
       FROM repair_requests r
       LEFT JOIN inventory inv ON r.inventory_id = inv.id
       LEFT JOIN departments dept ON inv.department_id = dept.id
       LEFT JOIN users u ON r.requester_id = u.id
       LEFT JOIN users u2 ON r.assigned_to_id = u2.id
       WHERE r.id = ?`,
      [id]
    );

    res.json(formatRepairRequest(updated));
  } catch (err) {
    console.error('Accept repair error:', err);
    res.status(400).send((err as Error).message);
  }
});

// 8. Start Technician Repair (Technician marks status to In Progress)
router.post('/:id/start-technician', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { repairDescription, expectedCompletionDays } = req.body;
  const technicianId = (req as any).user?.id;

  try {
    const request = await db.get(
      'SELECT r.id, r.requester_id, r.assigned_to_id, d.code as dept_code FROM repair_requests r LEFT JOIN inventory i ON r.inventory_id = i.id LEFT JOIN departments d ON i.department_id = d.id WHERE r.id = ?',
      [id]
    );
    if (!request) {
      return res.status(400).send('Repair request not found');
    }

    const { todayStr, timeStr } = getLocalDates();

    const description = repairDescription || 'Repair process started by Hardware Technician.';
    const days = expectedCompletionDays || 3;

    await db.transaction(async () => {
      // Set status to In Progress
      await db.run("UPDATE repair_requests SET status = 'In Progress' WHERE id = ?", [id]);

      // Create history log
      await db.run(
        `INSERT INTO repair_history (request_id, status, description, expected_completion_days, status_date, status_time, updated_by_id)
         VALUES (?, 'In Progress', ?, ?, ?, ?, ?)`,
        [id, description, days, todayStr, timeStr, technicianId]
      );
    });

    // Send notifications
    if (request.requester_id) {
      notificationService.sendToUser(
        request.requester_id,
        `Repair started by technician. Expected completion: ${days} days.`,
        'REPAIR_STARTED'
      );
    }
    notificationService.sendToRole(
      'ROLE_DEAN',
      `Technician started repair for request ${id}.`,
      'REPAIR_STARTED'
    );
    notificationService.sendToRole(
      'ROLE_PRINCIPAL',
      `Technician started repair for request ${id} in ${request.dept_code || 'N/A'}`,
      'REPAIR_STARTED'
    );
    notificationService.broadcastDashboardUpdate();

    const updated = await db.get(
      `SELECT r.*, 
              inv.type as inv_type, inv.brand as inv_brand, inv.model as inv_model, inv.status as inv_status, inv.department_id as inv_dept_id,
              dept.name as dept_name, dept.code as dept_code,
              u.name as req_name, u.email as req_email,
              u2.name as assigned_name, u2.email as assigned_email
       FROM repair_requests r
       LEFT JOIN inventory inv ON r.inventory_id = inv.id
       LEFT JOIN departments dept ON inv.department_id = dept.id
       LEFT JOIN users u ON r.requester_id = u.id
       LEFT JOIN users u2 ON r.assigned_to_id = u2.id
       WHERE r.id = ?`,
      [id]
    );

    res.json(formatRepairRequest(updated));
  } catch (err) {
    console.error('Start technician repair error:', err);
    res.status(400).send((err as Error).message);
  }
});

// 9. Request Spare Parts (Technician requests parts)
router.post('/:id/request-parts', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { requiredParts } = req.body;
  const technicianId = (req as any).user?.id;

  if (!requiredParts) {
    return res.status(400).send('Missing requiredParts');
  }

  try {
    const request = await db.get(
      'SELECT r.id, r.requester_id, d.code as dept_code FROM repair_requests r LEFT JOIN inventory i ON r.inventory_id = i.id LEFT JOIN departments d ON i.department_id = d.id WHERE r.id = ?',
      [id]
    );
    if (!request) {
      return res.status(400).send('Repair request not found');
    }

    const { todayStr, timeStr } = getLocalDates();

    await db.transaction(async () => {
      // Update repair request status to Parts Requested
      await db.run("UPDATE repair_requests SET status = 'Parts Requested' WHERE id = ?", [id]);

      // Create history log
      await db.run(
        `INSERT INTO repair_history (request_id, status, description, required_parts, status_date, status_time, updated_by_id)
         VALUES (?, 'Parts Requested', ?, ?, ?, ?, ?)`,
        [id, `Parts requested for repair: ${requiredParts}`, requiredParts, todayStr, timeStr, technicianId]
      );
    });

    // Send notifications to Dean, HOD (requester), and Principal
    notificationService.sendToRole(
      'ROLE_DEAN',
      `Technician requested parts for request ${id}: ${requiredParts}`,
      'NEW_REPAIR'
    );
    if (request.requester_id) {
      notificationService.sendToUser(
        request.requester_id,
        `Parts requested for repair of request ${id}: ${requiredParts}`,
        'NEW_REPAIR'
      );
    }
    notificationService.sendToRole(
      'ROLE_PRINCIPAL',
      `Parts requested for repair of request ${id}: ${requiredParts}`,
      'NEW_REPAIR'
    );
    notificationService.broadcastDashboardUpdate();

    const updated = await db.get(
      `SELECT r.*, 
              inv.type as inv_type, inv.brand as inv_brand, inv.model as inv_model, inv.status as inv_status, inv.department_id as inv_dept_id,
              dept.name as dept_name, dept.code as dept_code,
              u.name as req_name, u.email as req_email,
              u2.name as assigned_name, u2.email as assigned_email
       FROM repair_requests r
       LEFT JOIN inventory inv ON r.inventory_id = inv.id
       LEFT JOIN departments dept ON inv.department_id = dept.id
       LEFT JOIN users u ON r.requester_id = u.id
       LEFT JOIN users u2 ON r.assigned_to_id = u2.id
       WHERE r.id = ?`,
      [id]
    );

    res.json(formatRepairRequest(updated));
  } catch (err) {
    console.error('Request parts error:', err);
    res.status(400).send((err as Error).message);
  }
});

// 10. Resolve Request (Computer Dean / Hardware Technician action)
router.post('/:id/resolve', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { deanId, problemFound, solution, reasonForDelay, partsReplaced, remarks } = req.body;

  const updaterId = deanId || (req as any).user?.id;

  if (!updaterId || !problemFound || !solution) {
    return res.status(400).send('Missing required fields');
  }

  try {
    const request = await db.get(
      'SELECT r.id, r.requester_id, r.inventory_id, d.code as dept_code FROM repair_requests r LEFT JOIN inventory i ON r.inventory_id = i.id LEFT JOIN departments d ON i.department_id = d.id WHERE r.id = ?',
      [id]
    );
    if (!request) {
      return res.status(400).send('Repair request not found');
    }

    const { todayStr, timeStr } = getLocalDates();

    await db.transaction(async () => {
      // Set status to Resolved
      await db.run("UPDATE repair_requests SET status = 'Resolved' WHERE id = ?", [id]);
      
      // Update inventory status back to Working
      await db.run("UPDATE inventory SET status = 'Working' WHERE id = ?", [request.inventory_id]);

      // Create history log
      await db.run(
        `INSERT INTO repair_history (request_id, status, description, problem_found, solution, reason_for_delay, parts_replaced, remarks, status_date, status_time, updated_by_id)
         VALUES (?, 'Resolved', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          `Issue resolved: ${solution}`,
          problemFound,
          solution,
          reasonForDelay || null,
          partsReplaced || null,
          remarks || null,
          todayStr,
          timeStr,
          updaterId
        ]
      );
    });

    // Send notifications
    if (request.requester_id) {
      notificationService.sendToUser(
        request.requester_id,
        `Repair resolved for request ${id}. Parts replaced: ${partsReplaced || 'None'}`,
        'REPAIR_COMPLETED'
      );
    }
    notificationService.sendToRole(
      'ROLE_DEAN',
      `Repair completed for request ${id}.`,
      'REPAIR_COMPLETED'
    );
    notificationService.sendToRole(
      'ROLE_PRINCIPAL',
      `Repair completed for request ${id} in ${request.dept_code || 'N/A'}`,
      'REPAIR_COMPLETED'
    );
    notificationService.broadcastDashboardUpdate();

    const updated = await db.get(
      `SELECT r.*, 
              inv.type as inv_type, inv.brand as inv_brand, inv.model as inv_model, inv.status as inv_status, inv.department_id as inv_dept_id,
              dept.name as dept_name, dept.code as dept_code,
              u.name as req_name, u.email as req_email,
              u2.name as assigned_name, u2.email as assigned_email
       FROM repair_requests r
       LEFT JOIN inventory inv ON r.inventory_id = inv.id
       LEFT JOIN departments dept ON inv.department_id = dept.id
       LEFT JOIN users u ON r.requester_id = u.id
       LEFT JOIN users u2 ON r.assigned_to_id = u2.id
       WHERE r.id = ?`,
      [id]
    );

    res.json(formatRepairRequest(updated));
  } catch (err) {
    console.error('Resolve repair error:', err);
    res.status(400).send((err as Error).message);
  }
});

// 11. Mark Dead Stock (Computer Dean / Hardware Technician action)
router.post('/:id/dead-stock', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { deanId, reason, description } = req.body;

  const updaterId = deanId || (req as any).user?.id;

  if (!updaterId || !reason) {
    return res.status(400).send('Missing required fields');
  }

  try {
    const request = await db.get(
      'SELECT r.id, r.requester_id, r.inventory_id, d.code as dept_code FROM repair_requests r LEFT JOIN inventory i ON r.inventory_id = i.id LEFT JOIN departments d ON i.department_id = d.id WHERE r.id = ?',
      [id]
    );
    if (!request) {
      return res.status(400).send('Repair request not found');
    }

    const { todayStr, timeStr } = getLocalDates();

    await db.transaction(async () => {
      // Set status to Dead Stock
      await db.run("UPDATE repair_requests SET status = 'Dead Stock' WHERE id = ?", [id]);
      
      // Update inventory status to Dead Stock
      await db.run("UPDATE inventory SET status = 'Dead Stock' WHERE id = ?", [request.inventory_id]);

      // Create history log
      await db.run(
        `INSERT INTO repair_history (request_id, status, description, remarks, status_date, status_time, updated_by_id)
         VALUES (?, 'Dead Stock', ?, ?, ?, ?, ?)`,
        [
          id,
          `Marked as Dead Stock. Reason: ${reason}${description ? ' - ' + description : ''}`,
          reason,
          todayStr,
          timeStr,
          updaterId
        ]
      );
    });

    // Send notifications
    if (request.requester_id) {
      notificationService.sendToUser(
        request.requester_id,
        `Asset ${request.inventory_id} has been marked as Dead Stock.`,
        'DEAD_STOCK_ADDED'
      );
    }
    notificationService.sendToRole(
      'ROLE_DEAN',
      `Asset ${request.inventory_id} marked as Dead Stock (Request: ${id})`,
      'DEAD_STOCK_ADDED'
    );
    notificationService.sendToRole(
      'ROLE_PRINCIPAL',
      `Asset ${request.inventory_id} marked as Dead Stock (Request: ${id})`,
      'DEAD_STOCK_ADDED'
    );
    notificationService.broadcastDashboardUpdate();

    const updated = await db.get(
      `SELECT r.*, 
              inv.type as inv_type, inv.brand as inv_brand, inv.model as inv_model, inv.status as inv_status, inv.department_id as inv_dept_id,
              dept.name as dept_name, dept.code as dept_code,
              u.name as req_name, u.email as req_email,
              u2.name as assigned_name, u2.email as assigned_email
       FROM repair_requests r
       LEFT JOIN inventory inv ON r.inventory_id = inv.id
       LEFT JOIN departments dept ON inv.department_id = dept.id
       LEFT JOIN users u ON r.requester_id = u.id
       LEFT JOIN users u2 ON r.assigned_to_id = u2.id
       WHERE r.id = ?`,
      [id]
    );

    res.json(formatRepairRequest(updated));
  } catch (err) {
    console.error('Mark dead stock error:', err);
    res.status(400).send((err as Error).message);
  }
});

// 12. Wizard Initiate multiple repair requests (HOD action)
router.post('/initiate-wizard', authenticateJWT, async (req, res) => {
  const { requesterId, priority, title, description, issues } = req.body;

  if (!requesterId || !priority || !issues || !Array.isArray(issues) || issues.length === 0) {
    return res.status(400).send('Missing required fields or issues array');
  }

  try {
    const requester = await db.get('SELECT id, name, department_id FROM users WHERE id = ?', [requesterId]);
    if (!requester) {
      return res.status(400).send('User not found');
    }

    let departmentId = requester.department_id;
    if (!departmentId) {
      const deptRow = await db.get('SELECT id FROM departments WHERE hod_id = ?', [requesterId]);
      if (deptRow) {
        departmentId = deptRow.id;
      }
    }

    if (!departmentId) {
      return res.status(400).send('Requester is not assigned to any department');
    }

    const dept = await db.get('SELECT code FROM departments WHERE id = ?', [departmentId]);
    const deptCode = dept ? dept.code : 'N/A';

    const countRes = await db.get('SELECT COUNT(*) as count FROM repair_requests');
    let currentCount = countRes ? countRes.count : 0;

    const { todayStr, timeStr } = getLocalDates();

    const generatedRequests: string[] = [];

    await db.transaction(async () => {
      for (const issue of issues) {
        const { type, count } = issue;
        const brand = issue.brand || 'Standard';
        if (!type || !count || count <= 0) continue;

        // 1. Find matching working/new stock assets in the department
        let matchingAssets = await db.all(
          `SELECT id FROM inventory 
           WHERE department_id = ? AND type = ? AND status IN ('Working', 'New Stock')
           LIMIT ?`,
          [departmentId, type, count]
        );

        let assetIds = matchingAssets.map((a: any) => a.id);

        // 2. If still not enough assets, auto-generate/insert mock assets in the inventory
        if (assetIds.length < count) {
          const needed = count - assetIds.length;
          const invCountRes = await db.get('SELECT COUNT(*) as count FROM inventory');
          let invIndex = invCountRes ? invCountRes.count : 0;

          for (let k = 0; k < needed; k++) {
            invIndex++;
            const newAssetId = `${type.substring(0, 3).toUpperCase()}-GEN-${invIndex}`;
            const serialNumber = `SN-GEN-${type.substring(0, 3).toUpperCase()}-${invIndex}`;
            
            await db.run(
              `INSERT INTO inventory (id, department_id, type, brand, model, serial_number, status)
               VALUES (?, ?, ?, ?, 'Auto-generated for repair', ?, 'Repairing')`,
              [newAssetId, departmentId, type, brand, serialNumber]
            );
            
            assetIds.push(newAssetId);
          }
        }


        // Update status of all matched/generated assets to Repairing
        for (const assetId of assetIds) {
          try {
            await db.run("UPDATE inventory SET status = 'Repairing' WHERE id = ?", [assetId]);
          } catch (errUpd) {}
        }

        // Create 1 single batch repair request representing the systems
        if (assetIds.length > 0) {
          currentCount++;
          const requestId = `REQ-${101 + currentCount}`;
          generatedRequests.push(requestId);

          const primaryAssetId = assetIds[0];
          const reqTitle = count > 1 
            ? `${title || 'Batch Repair Request'} - ${count} Units of ${type} (${brand})`
            : `${title || 'Repair Request'} - ${type} (${brand})`;

          const reqDesc = count > 1
            ? `Quantity: ${count} Units of ${type}, Brand: ${brand}. ${description || ''} [Asset IDs: ${assetIds.join(', ')}]`
            : `Hardware item: ${type}, Brand: ${brand}. ${description || ''}`;

          await db.run(
            `INSERT INTO repair_requests (id, inventory_id, requester_id, title, description, priority, status, initiated_date, initiated_time)
             VALUES (?, ?, ?, ?, ?, ?, 'Initiated', ?, ?)`,
            [requestId, primaryAssetId, requesterId, reqTitle, reqDesc, priority, todayStr, timeStr]
          );

          await db.run(
            `INSERT INTO repair_history (request_id, status, description, status_date, status_time, updated_by_id)
             VALUES (?, 'Initiated', ?, ?, ?, ?)`,
            [requestId, `Issue reported by HOD: ${reqTitle}. ${reqDesc}`, todayStr, timeStr, requesterId]
          );
        }
      }
    });

    for (const reqId of generatedRequests) {
      notificationService.sendToRole(
        'ROLE_DEAN',
        `New repair request ${reqId} initiated by ${requester.name} in ${deptCode}`,
        'NEW_REPAIR'
      );
      notificationService.sendToRole(
        'ROLE_PRINCIPAL',
        `Repair request ${reqId} initiated for ${deptCode}`,
        'NEW_REPAIR'
      );
    }
    notificationService.broadcastDashboardUpdate();

    res.json({ message: 'Repair requests successfully submitted!', requestIds: generatedRequests });
  } catch (err) {
    console.error('Wizard initiate error:', err);
    res.status(400).send((err as Error).message);
  }
});

// 13. Partial progress update (Hardware Technician completes some items and requests parts for remaining)
router.post('/:id/partial-progress', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { completedCount, remainingCount, requiredParts, problemFound, solution, remarks } = req.body;
  const technicianId = (req as any).user?.id;

  try {
    const request = await db.get(
      'SELECT r.id, r.inventory_id, r.requester_id, d.code as dept_code FROM repair_requests r LEFT JOIN inventory i ON r.inventory_id = i.id LEFT JOIN departments d ON i.department_id = d.id WHERE r.id = ?',
      [id]
    );
    if (!request) {
      return res.status(400).send('Repair request not found');
    }

    const { todayStr, timeStr } = getLocalDates();

    await db.transaction(async () => {
      const parts = requiredParts || 'Spare parts required for remaining units';
      await db.run("UPDATE repair_requests SET status = 'Parts Requested' WHERE id = ?", [id]);

      const logDesc = `Technician update: ${completedCount || 0} device(s) completed repair. ${remainingCount || 0} device(s) awaiting parts: ${parts}.`;
      
      await db.run(
        `INSERT INTO repair_history (request_id, status, description, required_parts, problem_found, solution, remarks, status_date, status_time, updated_by_id)
         VALUES (?, 'Parts Requested', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, logDesc, parts, problemFound || null, solution || null, remarks || null, todayStr, timeStr, technicianId]
      );
    });

    notificationService.sendToRole(
      'ROLE_DEAN',
      `Technician reported partial progress & parts request for ${id}: ${requiredParts}`,
      'NEW_REPAIR'
    );
    notificationService.broadcastDashboardUpdate();

    const updated = await db.get(
      `SELECT r.*, 
              inv.type as inv_type, inv.brand as inv_brand, inv.model as inv_model, inv.status as inv_status, inv.department_id as inv_dept_id,
              dept.name as dept_name, dept.code as dept_code,
              u.name as req_name, u.email as req_email,
              u2.name as assigned_name, u2.email as assigned_email
       FROM repair_requests r
       LEFT JOIN inventory inv ON r.inventory_id = inv.id
       LEFT JOIN departments dept ON inv.department_id = dept.id
       LEFT JOIN users u ON r.requester_id = u.id
       LEFT JOIN users u2 ON r.assigned_to_id = u2.id
       WHERE r.id = ?`,
      [id]
    );

    res.json(formatRepairRequest(updated));
  } catch (err) {
    console.error('Partial progress error:', err);
    res.status(400).send((err as Error).message);
  }
});

export default router;
