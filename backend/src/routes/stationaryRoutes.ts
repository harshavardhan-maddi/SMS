import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/db';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { notificationService } from '../services/notificationService';
import { sendToTopic } from '../ws/broker';

export const stationaryRouter = express.Router();

// Helper to format DB row to clean response object
function formatRequestRow(row: any) {
  let items = [];
  try {
    items = JSON.parse(row.items_json);
  } catch (e) {
    items = [];
  }

  // Ensure every item has allottedCount fallback
  items = items.map((it: any) => ({
    ...it,
    allottedCount: it.allottedCount !== undefined ? it.allottedCount : it.count,
  }));

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
    items,
    totalItems: row.total_items,
    totalQuantity: row.total_quantity,
    purpose: row.purpose,
    status: row.status,
    aoRemarks: row.ao_remarks,
    aoActionBy: row.ao_action_user_name ? {
      id: row.ao_action_by_id,
      name: row.ao_action_user_name,
    } : null,
    aoActionAt: row.ao_action_at,
    stationaryRemarks: row.stationary_remarks,
    stationaryActionBy: row.stationary_action_user_name ? {
      id: row.stationary_action_by_id,
      name: row.stationary_action_user_name,
    } : null,
    stationaryActionAt: row.stationary_action_at,
    decreaseRemarks: row.decrease_remarks || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ==========================================
// 1. ITEMS CATALOG ENDPOINTS
// ==========================================

// GET /api/stationary/items - List all active catalog items
stationaryRouter.get('/items', authenticateJWT, async (req, res) => {
  try {
    const { q, category } = req.query;
    let sql = 'SELECT * FROM stationary_items WHERE active IS NOT FALSE';
    const params: any[] = [];

    if (category && typeof category === 'string' && category !== 'All') {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (q && typeof q === 'string' && q.trim()) {
      sql += ' AND LOWER(name) LIKE ?';
      params.push(`%${q.trim().toLowerCase()}%`);
    }

    sql += ' ORDER BY category ASC, name ASC';
    const items = await db.all(sql, params);
    res.json(items);
  } catch (err) {
    console.error('Failed to get stationary items:', err);
    res.status(500).send('Failed to fetch stationary items');
  }
});

// POST /api/stationary/items - Add item (Principal only)
stationaryRouter.post('/items', authenticateJWT, requireRole(['ROLE_PRINCIPAL']), async (req, res) => {
  const { name, category, unit } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).send('Item name is required');
  }

  try {
    const result = await db.run(
      'INSERT INTO stationary_items (name, category, unit, active) VALUES (?, ?, ?, true)',
      [name.trim(), category ? category.trim() : 'General', unit ? unit.trim() : 'Nos']
    );
    const newId = result.lastID;
    const item = await db.get('SELECT * FROM stationary_items WHERE id = ?', [newId]);
    res.status(201).json(item);
  } catch (err) {
    console.error('Failed to add stationary item:', err);
    res.status(500).send('Failed to add item');
  }
});

// DELETE /api/stationary/items/:id - Delete item (Principal only)
stationaryRouter.delete('/items/:id', authenticateJWT, requireRole(['ROLE_PRINCIPAL']), async (req, res) => {
  try {
    await db.run('DELETE FROM stationary_items WHERE id = ?', [req.params.id]);
    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    console.error('Failed to delete stationary item:', err);
    res.status(500).send('Failed to delete item');
  }
});

// ==========================================
// 2. STATIONARY REQUESTS ENDPOINTS
// ==========================================

// GET /api/stationary/requests - List requests based on caller's role
stationaryRouter.get('/requests', authenticateJWT, async (req, res) => {
  const user = (req as any).user;
  const userRole = user.role;
  const userId = user.userId || user.id;
  const { status, view } = req.query;

  try {
    let sql = `
      SELECT sr.*,
             u.name as requester_name, u.email as requester_email,
             d.name as dept_name, d.code as dept_code,
             ao_u.name as ao_action_user_name,
             st_u.name as stationary_action_user_name
      FROM stationary_requests sr
      JOIN users u ON sr.requester_id = u.id
      LEFT JOIN departments d ON sr.department_id = d.id
      LEFT JOIN users ao_u ON sr.ao_action_by_id = ao_u.id
      LEFT JOIN users st_u ON sr.stationary_action_by_id = st_u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Role-based restrictions
    if (userRole === 'ROLE_HOD') {
      sql += ' AND (sr.requester_id = ? OR sr.department_id = ?)';
      params.push(userId, user.departmentId || -1);
    } else if (userRole === 'ROLE_AO') {
      // AO can see all requests; if filter by view=pending, show PENDING_AO
      if (view === 'pending') {
        sql += " AND sr.status = 'PENDING_AO'";
      }
    } else if (userRole === 'ROLE_STATIONARY') {
      // Stationary store incharge sees approved requests forwarded by AO or already fulfilled
      if (view === 'pending') {
        sql += " AND sr.status = 'FORWARDED_TO_STATIONARY'";
      } else {
        sql += " AND sr.status IN ('FORWARDED_TO_STATIONARY', 'FULFILLED', 'REJECTED_STATIONARY')";
      }
    }

    if (status && typeof status === 'string' && status !== 'All') {
      sql += ' AND sr.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY sr.created_at DESC';

    const rows = await db.all(sql, params);
    const formatted = rows.map(formatRequestRow);
    res.json(formatted);
  } catch (err) {
    console.error('Failed to get stationary requests:', err);
    res.status(500).send('Failed to fetch stationary requests');
  }
});

// GET /api/stationary/stats - Summary counts for dashboards
stationaryRouter.get('/stats', authenticateJWT, async (req, res) => {
  const user = (req as any).user;
  const userRole = user.role;
  const userId = user.userId || user.id;

  try {
    let sql = `
      SELECT status, COUNT(*) as count 
      FROM stationary_requests
      WHERE 1=1
    `;
    const params: any[] = [];

    if (userRole === 'ROLE_HOD') {
      sql += ' AND (requester_id = ? OR department_id = ?)';
      params.push(userId, user.departmentId || -1);
    }

    sql += ' GROUP BY status';
    const rows = await db.all(sql, params);

    const stats = {
      total: 0,
      pendingAO: 0,
      forwardedStationary: 0,
      fulfilled: 0,
      rejected: 0,
    };

    rows.forEach((r: any) => {
      const c = parseInt(r.count, 10);
      stats.total += c;
      if (r.status === 'PENDING_AO') stats.pendingAO += c;
      else if (r.status === 'FORWARDED_TO_STATIONARY') stats.forwardedStationary += c;
      else if (r.status === 'FULFILLED') stats.fulfilled += c;
      else if (r.status === 'REJECTED_AO' || r.status === 'REJECTED_STATIONARY') stats.rejected += c;
    });

    res.json(stats);
  } catch (err) {
    console.error('Failed to get stationary stats:', err);
    res.status(500).send('Failed to get stats');
  }
});

// POST /api/stationary/requests - HOD submits a new stationary request
stationaryRouter.post('/requests', authenticateJWT, requireRole(['ROLE_HOD']), async (req, res) => {
  const user = (req as any).user;
  const userId = user.userId || user.id;
  const deptId = user.departmentId || null;
  const { items, purpose } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).send('At least one stationary item must be selected with quantity > 0');
  }

  // Filter valid items
  const validItems = items.filter((item: any) => item && item.name && parseInt(item.count, 10) > 0);
  if (validItems.length === 0) {
    return res.status(400).send('Invalid items: count must be at least 1 for selected items');
  }

  const totalItems = validItems.length;
  const totalQuantity = validItems.reduce((sum: number, item: any) => sum + parseInt(item.count, 10), 0);

  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const requestId = `STR-${randomSuffix}`;

  try {
    await db.run(
      `INSERT INTO stationary_requests
       (id, requester_id, department_id, items_json, total_items, total_quantity, purpose, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING_AO')`,
      [
        requestId,
        userId,
        deptId,
        JSON.stringify(validItems),
        totalItems,
        totalQuantity,
        purpose ? purpose.trim() : 'Department Academic & Administrative Requirements'
      ]
    );

    // Notify all AO accounts
    const aoUsers = await db.all(
      `SELECT u.id, u.name, u.email 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE r.name = 'ROLE_AO'`
    );

    const notifMsg = `New Stationary Request ${requestId} submitted by ${user.name} (${user.departmentCode || 'HOD'}) for ${totalItems} items (${totalQuantity} total units).`;
    for (const ao of aoUsers) {
      await notificationService.sendToUser(ao.id, notifMsg, 'STR_NEW_REQUEST');
    }

    sendToTopic('/topic/dashboard-tick', { type: 'STR_NEW_REQUEST', requestId });

    // Return created request
    const createdRow = await db.get(
      `SELECT sr.*,
              u.name as requester_name, u.email as requester_email,
              d.name as dept_name, d.code as dept_code
       FROM stationary_requests sr
       JOIN users u ON sr.requester_id = u.id
       LEFT JOIN departments d ON sr.department_id = d.id
       WHERE sr.id = ?`,
      [requestId]
    );

    res.status(201).json(formatRequestRow(createdRow));
  } catch (err) {
    console.error('Failed to create stationary request:', err);
    res.status(500).send('Failed to submit stationary request');
  }
});

// PATCH /api/stationary/requests/:id/ao-action - AO reviews & accepts/forwards or rejects
stationaryRouter.patch(
  '/requests/:id/ao-action',
  authenticateJWT,
  requireRole(['ROLE_AO', 'ROLE_PRINCIPAL']),
  async (req, res) => {
    const user = (req as any).user;
    const userId = user.userId || user.id;
    const { action, remarks } = req.body;
    const requestId = req.params.id;

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).send('Action must be APPROVE or REJECT');
    }

    try {
      const existing = await db.get('SELECT * FROM stationary_requests WHERE id = ?', [requestId]);
      if (!existing) {
        return res.status(404).send('Stationary request not found');
      }

      if (existing.status !== 'PENDING_AO') {
        return res.status(400).send(`Request is currently in '${existing.status}' status and cannot be actioned by AO`);
      }

      const newStatus = action === 'APPROVE' ? 'FORWARDED_TO_STATIONARY' : 'REJECTED_AO';
      const cleanRemarks = remarks ? remarks.trim() : (action === 'APPROVE' ? 'Approved and forwarded to Stationary Store' : 'Declined by AO');

      await db.run(
        `UPDATE stationary_requests
         SET status = ?,
             ao_remarks = ?,
             ao_action_by_id = ?,
             ao_action_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [newStatus, cleanRemarks, userId, requestId]
      );

      // Notify Requester (HOD)
      const hodNotifMsg = action === 'APPROVE'
        ? `Stationary Request ${requestId} has been APPROVED by Administrative Officer and forwarded to Stationary Store.`
        : `Stationary Request ${requestId} was DECLINED by Administrative Officer. Reason: "${cleanRemarks}"`;
      await notificationService.sendToUser(existing.requester_id, hodNotifMsg, 'STR_STATUS_UPDATE');

      // If approved, notify Stationary Incharge accounts
      if (action === 'APPROVE') {
        const stationaryUsers = await db.all(
          `SELECT u.id, u.name, u.email 
           FROM users u 
           JOIN roles r ON u.role_id = r.id 
           WHERE r.name = 'ROLE_STATIONARY'`
        );
        const stNotifMsg = `Stationary Request ${requestId} approved by AO and waiting for item fulfillment & dispatch.`;
        for (const st of stationaryUsers) {
          await notificationService.sendToUser(st.id, stNotifMsg, 'STR_FORWARDED');
        }
      }

      sendToTopic('/topic/dashboard-tick', { type: 'STR_STATUS_UPDATE', requestId, status: newStatus });

      const updated = await db.get(
        `SELECT sr.*,
                u.name as requester_name, u.email as requester_email,
                d.name as dept_name, d.code as dept_code,
                ao_u.name as ao_action_user_name,
                st_u.name as stationary_action_user_name
         FROM stationary_requests sr
         JOIN users u ON sr.requester_id = u.id
         LEFT JOIN departments d ON sr.department_id = d.id
         LEFT JOIN users ao_u ON sr.ao_action_by_id = ao_u.id
         LEFT JOIN users st_u ON sr.stationary_action_by_id = st_u.id
         WHERE sr.id = ?`,
        [requestId]
      );

      res.json(formatRequestRow(updated));
    } catch (err) {
      console.error('Failed to process AO action:', err);
      res.status(500).send('Failed to process AO action');
    }
  }
);

// PATCH /api/stationary/requests/:id/stationary-action - Stationary fulfills or rejects (with custom allotment)
stationaryRouter.patch(
  '/requests/:id/stationary-action',
  authenticateJWT,
  requireRole(['ROLE_STATIONARY', 'ROLE_PRINCIPAL']),
  async (req, res) => {
    const user = (req as any).user;
    const userId = user.userId || user.id;
    const { action, remarks, items, decreaseRemarks } = req.body;
    const requestId = req.params.id;

    if (!['FULFILL', 'REJECT'].includes(action)) {
      return res.status(400).send('Action must be FULFILL or REJECT');
    }

    try {
      const existing = await db.get('SELECT * FROM stationary_requests WHERE id = ?', [requestId]);
      if (!existing) {
        return res.status(404).send('Stationary request not found');
      }

      if (existing.status !== 'FORWARDED_TO_STATIONARY') {
        return res.status(400).send(`Request must be in 'FORWARDED_TO_STATIONARY' status to be processed by Stationary Store`);
      }

      const newStatus = action === 'FULFILL' ? 'FULFILLED' : 'REJECTED_STATIONARY';
      const cleanRemarks = remarks ? remarks.trim() : (action === 'FULFILL' ? 'Items issued and dispatched from Stationary Store' : 'Declined by Stationary Store');

      // Update items JSON if custom allotment is provided
      let updatedItemsJson = existing.items_json;
      if (items && Array.isArray(items)) {
        updatedItemsJson = JSON.stringify(items);
      }

      await db.run(
        `UPDATE stationary_requests
         SET status = ?,
             items_json = ?,
             stationary_remarks = ?,
             decrease_remarks = ?,
             stationary_action_by_id = ?,
             stationary_action_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          newStatus,
          updatedItemsJson,
          cleanRemarks,
          decreaseRemarks ? decreaseRemarks.trim() : null,
          userId,
          requestId
        ]
      );

      // Notify Requester (HOD)
      const hodNotifMsg = action === 'FULFILL'
        ? `Stationary Request ${requestId} has been FULFILLED! Items are ready for pickup/delivery from Stationary Store.`
        : `Stationary Request ${requestId} could not be fulfilled by Stationary Store. Reason: "${cleanRemarks}"`;
      await notificationService.sendToUser(existing.requester_id, hodNotifMsg, 'STR_FULFILLED');

      // Notify AO who approved it
      if (existing.ao_action_by_id) {
        const aoNotifMsg = `Stationary Request ${requestId} (forwarded by you) has been marked as ${newStatus} by Stationary Store.`;
        await notificationService.sendToUser(existing.ao_action_by_id, aoNotifMsg, 'STR_COMPLETED');
      }

      sendToTopic('/topic/dashboard-tick', { type: 'STR_STATUS_UPDATE', requestId, status: newStatus });

      const updated = await db.get(
        `SELECT sr.*,
                u.name as requester_name, u.email as requester_email,
                d.name as dept_name, d.code as dept_code,
                ao_u.name as ao_action_user_name,
                st_u.name as stationary_action_user_name
         FROM stationary_requests sr
         JOIN users u ON sr.requester_id = u.id
         LEFT JOIN departments d ON sr.department_id = d.id
         LEFT JOIN users ao_u ON sr.ao_action_by_id = ao_u.id
         LEFT JOIN users st_u ON sr.stationary_action_by_id = st_u.id
         WHERE sr.id = ?`,
        [requestId]
      );

      res.json(formatRequestRow(updated));
    } catch (err) {
      console.error('Failed to process Stationary action:', err);
      res.status(500).send('Failed to process Stationary action');
    }
  }
);

// DELETE /api/stationary/requests/:id - HOD (own request) or Principal deletes a request
stationaryRouter.delete('/requests/:id', authenticateJWT, async (req, res) => {
  const user = (req as any).user;
  const userId = user.userId || user.id;
  const userRole = user.role;
  const requestId = req.params.id;

  try {
    const existing = await db.get('SELECT * FROM stationary_requests WHERE id = ?', [requestId]);
    if (!existing) {
      return res.status(404).send('Stationary request not found');
    }

    if (userRole !== 'ROLE_PRINCIPAL' && existing.requester_id !== userId) {
      return res.status(403).send('Forbidden: You can only delete your own department requests');
    }

    await db.run('DELETE FROM stationary_requests WHERE id = ?', [requestId]);
    sendToTopic('/topic/dashboard-tick', { type: 'STR_REQUEST_DELETED', requestId });
    res.json({ message: `Stationary request ${requestId} deleted successfully` });
  } catch (err) {
    console.error('Failed to delete stationary request:', err);
    res.status(500).send('Failed to delete stationary request');
  }
});

// POST /api/stationary/requests/bulk-delete - Principal bulk delete
stationaryRouter.post('/requests/bulk-delete', authenticateJWT, requireRole(['ROLE_PRINCIPAL']), async (req, res) => {
  const { ids, all } = req.body;

  try {
    if (all === true) {
      await db.run('DELETE FROM stationary_requests');
      sendToTopic('/topic/dashboard-tick', { type: 'STR_BULK_DELETED' });
      return res.json({ message: 'All stationary requests deleted successfully' });
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).send('Array of ticket IDs is required');
    }

    const placeholders = ids.map(() => '?').join(',');
    await db.run(`DELETE FROM stationary_requests WHERE id IN (${placeholders})`, ids);
    sendToTopic('/topic/dashboard-tick', { type: 'STR_BULK_DELETED', ids });
    res.json({ message: `${ids.length} stationary requests deleted successfully` });
  } catch (err) {
    console.error('Failed to bulk delete stationary requests:', err);
    res.status(500).send('Failed to bulk delete requests');
  }
});

// ==========================================
// 3. PRINCIPAL ACCOUNT MANAGEMENT (AO & STATIONARY)
// ==========================================

// GET /api/stationary/accounts - List all AO and Stationary accounts (Principal only)
stationaryRouter.get('/accounts', authenticateJWT, requireRole(['ROLE_PRINCIPAL']), async (req, res) => {
  try {
    const users = await db.all(
      `SELECT u.id, u.name, u.email, u.active, u.created_at, r.name as role_name, r.id as role_id
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE r.name IN ('ROLE_AO', 'ROLE_STATIONARY')
       ORDER BY r.id ASC, u.name ASC`
    );

    res.json(
      users.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role_name,
        roleId: u.role_id,
        active: Boolean(u.active),
        createdAt: u.created_at,
      }))
    );
  } catch (err) {
    console.error('Failed to get stationary/AO accounts:', err);
    res.status(500).send('Failed to get accounts');
  }
});

// POST /api/stationary/accounts - Principal creates new AO or Stationary login
stationaryRouter.post('/accounts', authenticateJWT, requireRole(['ROLE_PRINCIPAL']), async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).send('Name, Email, Password, and Role (ROLE_AO or ROLE_STATIONARY) are required');
  }

  const roleName = role === 'ROLE_AO' || role === 'ROLE_STATIONARY' ? role : null;
  if (!roleName) {
    return res.status(400).send('Invalid role. Must be ROLE_AO or ROLE_STATIONARY');
  }

  try {
    const roleRow = await db.get('SELECT id FROM roles WHERE name = ?', [roleName]);
    if (!roleRow) {
      return res.status(400).send(`Role ${roleName} not found in system`);
    }

    const existing = await db.get('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing) {
      return res.status(400).send('A user with this email address already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.run(
      'INSERT INTO users (name, email, password, role_id, active) VALUES (?, ?, ?, ?, true)',
      [name.trim(), email.trim().toLowerCase(), hashedPassword, roleRow.id]
    );

    const newUserId = result.lastID;
    const createdUser = await db.get(
      `SELECT u.id, u.name, u.email, u.active, u.created_at, r.name as role_name, r.id as role_id
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [newUserId]
    );

    res.status(201).json({
      id: createdUser.id,
      name: createdUser.name,
      email: createdUser.email,
      role: createdUser.role_name,
      roleId: createdUser.role_id,
      active: Boolean(createdUser.active),
      createdAt: createdUser.created_at,
    });
  } catch (err) {
    console.error('Failed to create account:', err);
    res.status(500).send('Failed to create account');
  }
});

// DELETE /api/stationary/accounts/:id - Principal deletes an AO or Stationary login
stationaryRouter.delete('/accounts/:id', authenticateJWT, requireRole(['ROLE_PRINCIPAL']), async (req, res) => {
  const accountId = req.params.id;

  try {
    const targetUser = await db.get(
      `SELECT u.id, u.name, r.name as role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? AND r.name IN ('ROLE_AO', 'ROLE_STATIONARY')`,
      [accountId]
    );

    if (!targetUser) {
      return res.status(404).send('Account not found or is not an AO/Stationary role');
    }

    await db.run('DELETE FROM users WHERE id = ?', [accountId]);
    res.json({ message: `${targetUser.role_name} account "${targetUser.name}" deleted successfully` });
  } catch (err) {
    console.error('Failed to delete account:', err);
    res.status(500).send('Failed to delete account');
  }
});
