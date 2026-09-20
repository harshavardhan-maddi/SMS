import express from 'express';
import { db } from '../db/db';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { sendToTopic } from '../ws/broker';

export const raRouter = express.Router();

function formatRARow(row: any) {
  const totalGuests = row.total_guests || 
    (row.has_accommodation ? (row.accommodation_persons_count || 0) : 
     row.has_hostel_food ? (row.hostel_food_persons_count || 0) : 
     row.has_restaurant_food ? (row.restaurant_food_persons_count || 0) : 0);
  
  const checkedOut = row.checked_out_count || 0;
  const stillInHostel = Math.max(0, totalGuests - checkedOut);

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

    // Accommodation
    hasAccommodation: Boolean(row.has_accommodation),
    accommodationType: row.accommodation_type || null,
    accommodationPurpose: row.accommodation_purpose || null,
    accommodationPersonsCount: row.accommodation_persons_count || 0,
    accommodationRoomsCount: row.accommodation_rooms_count || row.hostel_food_rooms_count || 0,
    accommodationFromDate: row.accommodation_from_date || null,
    accommodationToDate: row.accommodation_to_date || null,

    // Target Hostel for Warden routing
    targetHostel: row.target_hostel || 
      (row.accommodation_type === 'Boys Hostel' ? 'Boys Hostel' : 
       row.accommodation_type === 'Girls Hostel' ? 'Girls Hostel' : null),

    // Tea & Snacks
    hasTeaSnacks: Boolean(row.has_tea_snacks),
    teaSnacksFromDate: row.tea_snacks_from_date || null,
    teaSnacksToDate: row.tea_snacks_to_date || null,
    teaCount: row.tea_count || 0,
    snacksCount: row.snacks_count || 0,
    teaSnacksPurpose: row.tea_snacks_purpose || null,

    // Hostel Food
    hasHostelFood: Boolean(row.has_hostel_food),
    hostelFoodPersonsCount: row.hostel_food_persons_count || 0,
    hostelFoodRoomsCount: row.hostel_food_rooms_count || 0,
    hostelFoodFromDate: row.hostel_food_from_date || null,
    hostelFoodToDate: row.hostel_food_to_date || null,
    hostelFoodPurpose: row.hostel_food_purpose || null,

    // Restaurant Food
    hasRestaurantFood: Boolean(row.has_restaurant_food),
    restaurantFoodPersonsCount: row.restaurant_food_persons_count || 0,
    restaurantFoodFromDate: row.restaurant_food_from_date || null,
    restaurantFoodToDate: row.restaurant_food_to_date || null,
    vegCount: row.veg_count || 0,
    nonVegCount: row.non_veg_count || 0,
    restaurantFoodPurpose: row.restaurant_food_purpose || null,

    // Workflow & Status
    status: row.status, // PENDING_AO, APPROVED_AO, FORWARDED_WARDEN, WARDEN_ASSIGNED, PARTIALLY_CHECKED_OUT, COMPLETED, REJECTED
    
    // AO Actions
    aoActionBy: row.ao_action_user_name ? {
      id: row.ao_action_by_id,
      name: row.ao_action_user_name,
    } : null,
    aoRemarks: row.ao_remarks || null,
    aoAssignedHotel: row.ao_assigned_hotel || null,
    aoAssignedRestaurant: row.ao_assigned_restaurant || null,
    aoActionAt: row.ao_action_at || null,

    // Warden Actions
    warden: row.warden_user_name ? {
      id: row.warden_id,
      name: row.warden_user_name,
    } : null,
    wardenAssignedRooms: row.warden_assigned_rooms || null,
    wardenRemarks: row.warden_remarks || null,
    wardenActionAt: row.warden_action_at || null,

    // Guest Checkout Tracker
    totalGuests,
    checkedOutCount: checkedOut,
    stillInHostel,
    checkedOutAt: row.checked_out_at || null,

    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/ra/requests - List requests based on role
raRouter.get('/requests', authenticateJWT, async (req, res) => {
  try {
    const user = (req as any).user;
    let sql = `
      SELECT 
        ra.*,
        u.name as requester_name,
        u.email as requester_email,
        d.name as dept_name,
        d.code as dept_code,
        ao_u.name as ao_action_user_name,
        w_u.name as warden_user_name
      FROM refreshment_accommodation_requests ra
      LEFT JOIN users u ON ra.requester_id = u.id
      LEFT JOIN departments d ON ra.department_id = d.id
      LEFT JOIN users ao_u ON ra.ao_action_by_id = ao_u.id
      LEFT JOIN users w_u ON ra.warden_id = w_u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (user.roleName === 'ROLE_HOD') {
      if (user.deptId) {
        sql += ' AND ra.department_id = ?';
        params.push(user.deptId);
      } else {
        sql += ' AND ra.requester_id = ?';
        params.push(user.id);
      }
    } else if (user.roleName === 'ROLE_BOYS_HOSTEL_WARDEN') {
      sql += ` AND ra.status IN ('FORWARDED_WARDEN', 'WARDEN_ASSIGNED', 'PARTIALLY_CHECKED_OUT', 'COMPLETED') 
               AND (ra.target_hostel = 'Boys Hostel' OR ra.accommodation_type = 'Boys Hostel')`;
    } else if (user.roleName === 'ROLE_GIRLS_HOSTEL_WARDEN') {
      sql += ` AND ra.status IN ('FORWARDED_WARDEN', 'WARDEN_ASSIGNED', 'PARTIALLY_CHECKED_OUT', 'COMPLETED') 
               AND (ra.target_hostel = 'Girls Hostel' OR ra.accommodation_type = 'Girls Hostel')`;
    }

    sql += ' ORDER BY ra.created_at DESC';

    const rows = await db.all(sql, params);
    res.json(rows.map(formatRARow));
  } catch (err) {
    console.error('Failed to fetch R&A requests:', err);
    res.status(500).send('Failed to fetch requests');
  }
});

// GET /api/ra/stats - Aggregate stats
raRouter.get('/stats', authenticateJWT, async (req, res) => {
  try {
    const user = (req as any).user;
    let baseSql = 'FROM refreshment_accommodation_requests WHERE 1=1';
    const params: any[] = [];

    if (user.roleName === 'ROLE_HOD' && user.deptId) {
      baseSql += ' AND department_id = ?';
      params.push(user.deptId);
    } else if (user.roleName === 'ROLE_BOYS_HOSTEL_WARDEN') {
      baseSql += " AND (target_hostel = 'Boys Hostel' OR accommodation_type = 'Boys Hostel')";
    } else if (user.roleName === 'ROLE_GIRLS_HOSTEL_WARDEN') {
      baseSql += " AND (target_hostel = 'Girls Hostel' OR accommodation_type = 'Girls Hostel')";
    }

    const totalRow = await db.get(`SELECT COUNT(*) as count ${baseSql}`, params);
    const pendingAORow = await db.get(`SELECT COUNT(*) as count ${baseSql} AND status = 'PENDING_AO'`, params);
    const forwardedRow = await db.get(`SELECT COUNT(*) as count ${baseSql} AND status = 'FORWARDED_WARDEN'`, params);
    const assignedRow = await db.get(`SELECT COUNT(*) as count ${baseSql} AND status = 'WARDEN_ASSIGNED'`, params);
    const activeHostelRow = await db.get(`SELECT COUNT(*) as count ${baseSql} AND status IN ('WARDEN_ASSIGNED', 'PARTIALLY_CHECKED_OUT')`, params);
    const completedRow = await db.get(`SELECT COUNT(*) as count ${baseSql} AND status = 'COMPLETED'`, params);
    const rejectedRow = await db.get(`SELECT COUNT(*) as count ${baseSql} AND status = 'REJECTED'`, params);

    res.json({
      total: totalRow ? parseInt(totalRow.count) : 0,
      pendingAO: pendingAORow ? parseInt(pendingAORow.count) : 0,
      forwardedWarden: forwardedRow ? parseInt(forwardedRow.count) : 0,
      wardenAssigned: assignedRow ? parseInt(assignedRow.count) : 0,
      activeHostel: activeHostelRow ? parseInt(activeHostelRow.count) : 0,
      completed: completedRow ? parseInt(completedRow.count) : 0,
      rejected: rejectedRow ? parseInt(rejectedRow.count) : 0,
    });
  } catch (err) {
    console.error('Failed to fetch R&A stats:', err);
    res.status(500).send('Failed to fetch stats');
  }
});

// POST /api/ra/requests - Create R&A request (HOD)
raRouter.post('/requests', authenticateJWT, requireRole(['ROLE_HOD', 'ROLE_PRINCIPAL']), async (req, res) => {
  const user = (req as any).user;
  const {
    hasAccommodation,
    accommodationType,
    accommodationPurpose,
    accommodationPersonsCount,
    accommodationRoomsCount,
    accommodationFromDate,
    accommodationToDate,

    targetHostel,

    hasTeaSnacks,
    teaSnacksFromDate,
    teaSnacksToDate,
    teaCount,
    snacksCount,
    teaSnacksPurpose,

    hasHostelFood,
    hostelFoodPersonsCount,
    hostelFoodRoomsCount,
    hostelFoodFromDate,
    hostelFoodToDate,
    hostelFoodPurpose,

    hasRestaurantFood,
    restaurantFoodPersonsCount,
    restaurantFoodFromDate,
    restaurantFoodToDate,
    vegCount,
    nonVegCount,
    restaurantFoodPurpose,
  } = req.body;

  if (!hasAccommodation && !hasTeaSnacks && !hasHostelFood && !hasRestaurantFood) {
    return res.status(400).send('Please select at least one service (Accommodation, Tea & Snacks, Hostel Food, or Restaurant Food).');
  }

  // Enforce Hotel restriction: When Hotel is selected, cannot combine with hostel food, tea & snacks, or restaurant food
  if (hasAccommodation && accommodationType === 'Hotel') {
    if (hasTeaSnacks || hasHostelFood || hasRestaurantFood) {
      return res.status(400).send('When Hotel accommodation is selected, Tea & Snacks, Hostel Food, and Restaurant Food are not accessible.');
    }
  }

  // Validate Accommodation
  if (hasAccommodation) {
    if (!accommodationType || !['Boys Hostel', 'Girls Hostel', 'Hotel'].includes(accommodationType)) {
      return res.status(400).send('Please select a valid Accommodation type (Boys Hostel, Girls Hostel, or Hotel).');
    }
    const accP = parseInt(accommodationPersonsCount, 10) || 0;
    const accR = parseInt(accommodationRoomsCount, 10) || 0;
    if (accP <= 0) {
      return res.status(400).send('Please enter valid number of persons for accommodation.');
    }
    if (accR <= 0) {
      return res.status(400).send('Please enter number of rooms required for accommodation.');
    }
    if (!accommodationPurpose || !accommodationPurpose.trim()) {
      return res.status(400).send('Purpose is required for accommodation.');
    }
  }

  // Validate Tea & Snacks
  if (hasTeaSnacks) {
    if (!teaSnacksPurpose || !teaSnacksPurpose.trim()) {
      return res.status(400).send('Purpose is required for Tea & Snacks.');
    }
    const tCount = parseInt(teaCount, 10) || 0;
    const sCount = parseInt(snacksCount, 10) || 0;
    if (tCount <= 0 && sCount <= 0) {
      return res.status(400).send('Please specify count for Tea or Snacks (must be greater than 0).');
    }
  }

  // Auto-sync matched fields from accommodation if accommodation was selected
  let effectiveHostel = targetHostel || null;
  let effectiveHostelPersons = parseInt(hostelFoodPersonsCount, 10) || 0;
  let effectiveHostelRooms = parseInt(hostelFoodRoomsCount, 10) || 0;

  if (hasAccommodation) {
    if (accommodationType === 'Boys Hostel') effectiveHostel = 'Boys Hostel';
    else if (accommodationType === 'Girls Hostel') effectiveHostel = 'Girls Hostel';

    if (effectiveHostelPersons <= 0) {
      effectiveHostelPersons = parseInt(accommodationPersonsCount, 10) || 0;
    }
    if (effectiveHostelRooms <= 0) {
      effectiveHostelRooms = parseInt(accommodationRoomsCount, 10) || 0;
    }
  }

  // Validate Hostel Food
  if (hasHostelFood) {
    if (effectiveHostelPersons <= 0) {
      return res.status(400).send('Please enter valid person count for Hostel Food.');
    }
    if (!hostelFoodPurpose || !hostelFoodPurpose.trim()) {
      return res.status(400).send('Purpose is required for Hostel Food.');
    }
  }

  // Validate Restaurant Food
  if (hasRestaurantFood) {
    const rPersons = parseInt(restaurantFoodPersonsCount, 10) || 0;
    const vCount = parseInt(vegCount, 10) || 0;
    const nvCount = parseInt(nonVegCount, 10) || 0;
    if (rPersons <= 0) {
      return res.status(400).send('Please enter valid person count for Restaurant Food.');
    }
    if (vCount + nvCount <= 0) {
      return res.status(400).send('Please enter Veg or Non-Veg count for Restaurant Food.');
    }
    if (!restaurantFoodPurpose || !restaurantFoodPurpose.trim()) {
      return res.status(400).send('Purpose is required for Restaurant Food.');
    }
  }

  // Calculate total guests for checkout tracking
  let totalGuests = 0;
  if (hasAccommodation) {
    totalGuests = parseInt(accommodationPersonsCount, 10) || 0;
  } else if (hasHostelFood) {
    totalGuests = effectiveHostelPersons;
  } else if (hasRestaurantFood) {
    totalGuests = parseInt(restaurantFoodPersonsCount, 10) || 0;
  }

  try {
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const id = `RA-${randNum}`;

    await db.run(
      `INSERT INTO refreshment_accommodation_requests (
        id, requester_id, department_id,
        has_accommodation, accommodation_type, accommodation_purpose, accommodation_persons_count, accommodation_rooms_count, accommodation_from_date, accommodation_to_date,
        target_hostel,
        has_tea_snacks, tea_snacks_from_date, tea_snacks_to_date, tea_count, snacks_count, tea_snacks_purpose,
        has_hostel_food, hostel_food_persons_count, hostel_food_rooms_count, hostel_food_from_date, hostel_food_to_date, hostel_food_purpose,
        has_restaurant_food, restaurant_food_persons_count, restaurant_food_from_date, restaurant_food_to_date, veg_count, non_veg_count, restaurant_food_purpose,
        total_guests, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_AO')`,
      [
        id, user.id, user.deptId || null,
        Boolean(hasAccommodation), accommodationType || null, accommodationPurpose ? accommodationPurpose.trim() : null, parseInt(accommodationPersonsCount, 10) || 0, parseInt(accommodationRoomsCount, 10) || 0, accommodationFromDate || null, accommodationToDate || null,
        effectiveHostel,
        Boolean(hasTeaSnacks), teaSnacksFromDate || null, teaSnacksToDate || null, parseInt(teaCount, 10) || 0, parseInt(snacksCount, 10) || 0, teaSnacksPurpose ? teaSnacksPurpose.trim() : null,
        Boolean(hasHostelFood), effectiveHostelPersons, effectiveHostelRooms, hostelFoodFromDate || null, hostelFoodToDate || null, hostelFoodPurpose ? hostelFoodPurpose.trim() : null,
        Boolean(hasRestaurantFood), parseInt(restaurantFoodPersonsCount, 10) || 0, restaurantFoodFromDate || null, restaurantFoodToDate || null, parseInt(vegCount, 10) || 0, parseInt(nonVegCount, 10) || 0, restaurantFoodPurpose ? restaurantFoodPurpose.trim() : null,
        totalGuests
      ]
    );

    const created = await db.get(`
      SELECT ra.*, u.name as requester_name, u.email as requester_email, d.name as dept_name, d.code as dept_code
      FROM refreshment_accommodation_requests ra
      LEFT JOIN users u ON ra.requester_id = u.id
      LEFT JOIN departments d ON ra.department_id = d.id
      WHERE ra.id = ?
    `, [id]);

    const formatted = formatRARow(created);
    sendToTopic('/topic/dashboard', { type: 'RA_REQUEST_CREATED', payload: formatted });

    res.status(201).json(formatted);
  } catch (err) {
    console.error('Failed to create R&A request:', err);
    res.status(500).send('Failed to submit request');
  }
});

// PATCH /api/ra/requests/:id/ao-action - AO accepts or declines
raRouter.patch('/requests/:id/ao-action', authenticateJWT, requireRole(['ROLE_AO', 'ROLE_PRINCIPAL']), async (req, res) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { action, assignedHotel, assignedRestaurant, remarks } = req.body;

  if (!action || !['APPROVE', 'REJECT'].includes(action)) {
    return res.status(400).send('Action must be APPROVE or REJECT');
  }

  try {
    const existing = await db.get('SELECT * FROM refreshment_accommodation_requests WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).send('Request not found');
    }

    if (action === 'REJECT') {
      if (!remarks || !remarks.trim()) {
        return res.status(400).send('Remarks / reason are required when declining a request.');
      }
      await db.run(
        `UPDATE refreshment_accommodation_requests 
         SET status = 'REJECTED', ao_remarks = ?, ao_action_by_id = ?, ao_action_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [remarks.trim(), user.id, id]
      );
    } else {
      // APPROVE
      // Check if it involves Boys or Girls Hostel (Accommodation, Hostel Food, or Tea & Snacks)
      const isHostelInvolved = existing.accommodation_type === 'Boys Hostel' || 
                               existing.accommodation_type === 'Girls Hostel' || 
                               existing.target_hostel === 'Boys Hostel' || 
                               existing.target_hostel === 'Girls Hostel' ||
                               existing.has_hostel_food;

      let nextStatus = isHostelInvolved ? 'FORWARDED_WARDEN' : 'APPROVED_AO';

      // If hotel was requested, validate hotel assignment
      if (existing.has_accommodation && existing.accommodation_type === 'Hotel') {
        if (!assignedHotel || !assignedHotel.trim()) {
          return res.status(400).send('Assigned Hotel details (Hotel Name, Room numbers, or Booking ID) are required to approve hotel accommodation.');
        }
      }

      // If restaurant food was requested, validate restaurant assignment
      if (existing.has_restaurant_food) {
        if (!assignedRestaurant || !assignedRestaurant.trim()) {
          return res.status(400).send('Assigned Restaurant details (Restaurant Name, Meal arrangement, or Contact) are required to approve restaurant food.');
        }
      }

      await db.run(
        `UPDATE refreshment_accommodation_requests 
         SET status = ?, 
             ao_remarks = ?, 
             ao_assigned_hotel = ?, 
             ao_assigned_restaurant = ?, 
             ao_action_by_id = ?, 
             ao_action_at = CURRENT_TIMESTAMP, 
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          nextStatus,
          remarks ? remarks.trim() : null,
          assignedHotel ? assignedHotel.trim() : existing.ao_assigned_hotel,
          assignedRestaurant ? assignedRestaurant.trim() : existing.ao_assigned_restaurant,
          user.id,
          id
        ]
      );
    }

    const updated = await db.get(`
      SELECT ra.*, u.name as requester_name, u.email as requester_email, d.name as dept_name, d.code as dept_code, ao_u.name as ao_action_user_name
      FROM refreshment_accommodation_requests ra
      LEFT JOIN users u ON ra.requester_id = u.id
      LEFT JOIN departments d ON ra.department_id = d.id
      LEFT JOIN users ao_u ON ra.ao_action_by_id = ao_u.id
      WHERE ra.id = ?
    `, [id]);

    const formatted = formatRARow(updated);
    sendToTopic('/topic/dashboard', { type: 'RA_REQUEST_UPDATED', payload: formatted });

    res.json(formatted);
  } catch (err) {
    console.error('Failed to process AO action on R&A request:', err);
    res.status(500).send('Failed to process request action');
  }
});

// PATCH /api/ra/requests/:id/warden-assign - Warden accepts & assigns rooms
raRouter.patch('/requests/:id/warden-assign', authenticateJWT, requireRole(['ROLE_BOYS_HOSTEL_WARDEN', 'ROLE_GIRLS_HOSTEL_WARDEN', 'ROLE_AO', 'ROLE_PRINCIPAL']), async (req, res) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { assignedRooms, remarks } = req.body;

  try {
    const existing = await db.get('SELECT * FROM refreshment_accommodation_requests WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).send('Request not found');
    }

    if (existing.has_accommodation && (!assignedRooms || !assignedRooms.trim())) {
      return res.status(400).send('Please enter assigned room numbers / block details for the hostel accommodation.');
    }

    await db.run(
      `UPDATE refreshment_accommodation_requests 
       SET status = 'WARDEN_ASSIGNED',
           warden_id = ?,
           warden_assigned_rooms = ?,
           warden_remarks = ?,
           warden_action_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [user.id, assignedRooms ? assignedRooms.trim() : 'Rooms and food confirmed by Warden', remarks ? remarks.trim() : null, id]
    );

    const updated = await db.get(`
      SELECT ra.*, u.name as requester_name, u.email as requester_email, d.name as dept_name, d.code as dept_code, ao_u.name as ao_action_user_name, w_u.name as warden_user_name
      FROM refreshment_accommodation_requests ra
      LEFT JOIN users u ON ra.requester_id = u.id
      LEFT JOIN departments d ON ra.department_id = d.id
      LEFT JOIN users ao_u ON ra.ao_action_by_id = ao_u.id
      LEFT JOIN users w_u ON ra.warden_id = w_u.id
      WHERE ra.id = ?
    `, [id]);

    const formatted = formatRARow(updated);
    sendToTopic('/topic/dashboard', { type: 'RA_WARDEN_ASSIGNED', payload: formatted });

    res.json(formatted);
  } catch (err) {
    console.error('Failed to assign warden rooms:', err);
    res.status(500).send('Failed to process warden assignment');
  }
});

// PATCH /api/ra/requests/:id/warden-checkout - Warden records checkouts
raRouter.patch('/requests/:id/warden-checkout', authenticateJWT, requireRole(['ROLE_BOYS_HOSTEL_WARDEN', 'ROLE_GIRLS_HOSTEL_WARDEN', 'ROLE_AO', 'ROLE_PRINCIPAL']), async (req, res) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { checkoutCount, checkoutAll } = req.body;

  try {
    const existing = await db.get('SELECT * FROM refreshment_accommodation_requests WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).send('Request not found');
    }

    const totalGuests = existing.total_guests || existing.accommodation_persons_count || existing.hostel_food_persons_count || 1;
    let newCheckedOut = existing.checked_out_count || 0;

    if (checkoutAll) {
      newCheckedOut = totalGuests;
    } else {
      const addCount = parseInt(checkoutCount, 10);
      if (isNaN(addCount) || addCount < 1) {
        return res.status(400).send('Please enter a valid checkout count (at least 1).');
      }
      newCheckedOut += addCount;
      if (newCheckedOut > totalGuests) {
        newCheckedOut = totalGuests;
      }
    }

    const isFullyCheckedOut = newCheckedOut >= totalGuests;
    const nextStatus = isFullyCheckedOut ? 'COMPLETED' : 'PARTIALLY_CHECKED_OUT';

    await db.run(
      `UPDATE refreshment_accommodation_requests 
       SET checked_out_count = ?,
           status = ?,
           checked_out_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newCheckedOut, nextStatus, id]
    );

    const updated = await db.get(`
      SELECT ra.*, u.name as requester_name, u.email as requester_email, d.name as dept_name, d.code as dept_code, ao_u.name as ao_action_user_name, w_u.name as warden_user_name
      FROM refreshment_accommodation_requests ra
      LEFT JOIN users u ON ra.requester_id = u.id
      LEFT JOIN departments d ON ra.department_id = d.id
      LEFT JOIN users ao_u ON ra.ao_action_by_id = ao_u.id
      LEFT JOIN users w_u ON ra.warden_id = w_u.id
      WHERE ra.id = ?
    `, [id]);

    const formatted = formatRARow(updated);
    sendToTopic('/topic/dashboard', { type: 'RA_CHECKOUT_UPDATED', payload: formatted });

    res.json(formatted);
  } catch (err) {
    console.error('Failed to update warden checkout:', err);
    res.status(500).send('Failed to update checkout');
  }
});

// DELETE /api/ra/requests/:id - Delete single request (HOD own dept / Principal)
raRouter.delete('/requests/:id', authenticateJWT, async (req, res) => {
  const user = (req as any).user;
  const { id } = req.params;

  try {
    const existing = await db.get('SELECT * FROM refreshment_accommodation_requests WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).send('Request not found');
    }

    if (user.roleName === 'ROLE_HOD' && user.deptId && existing.department_id !== user.deptId) {
      return res.status(403).send('Not authorized to delete request of another department');
    }

    await db.run('DELETE FROM refreshment_accommodation_requests WHERE id = ?', [id]);

    sendToTopic('/topic/dashboard', { type: 'RA_REQUEST_DELETED', payload: { id } });

    res.json({ success: true, message: `R&A request ${id} deleted successfully` });
  } catch (err) {
    console.error('Failed to delete R&A request:', err);
    res.status(500).send('Failed to delete request');
  }
});

// POST /api/ra/requests/bulk-delete - Bulk delete (Principal / HOD)
raRouter.post('/requests/bulk-delete', authenticateJWT, async (req, res) => {
  const user = (req as any).user;
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).send('Invalid or empty IDs array');
  }

  try {
    let deletedCount = 0;
    for (const id of ids) {
      const row = await db.get('SELECT id, department_id FROM refreshment_accommodation_requests WHERE id = ?', [id]);
      if (!row) continue;

      if (user.roleName === 'ROLE_HOD' && user.deptId && row.department_id !== user.deptId) {
        continue;
      }

      await db.run('DELETE FROM refreshment_accommodation_requests WHERE id = ?', [id]);
      deletedCount++;
    }

    sendToTopic('/topic/dashboard', { type: 'RA_BULK_DELETED', payload: { ids } });

    res.json({ success: true, message: `${deletedCount} R&A request(s) deleted successfully` });
  } catch (err) {
    console.error('Failed to bulk delete R&A requests:', err);
    res.status(500).send('Failed to delete requests');
  }
});
