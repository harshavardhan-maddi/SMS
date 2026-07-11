import { Router } from 'express';
import { db } from '../db/db';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// Helper to format inventory item
function formatInventory(row: any) {
  return {
    id: row.id,
    type: row.type,
    brand: row.brand,
    model: row.model,
    serialNumber: row.serial_number,
    purchaseDate: row.purchase_date,
    warrantyMonths: row.warranty_months,
    status: row.status,
    department: row.department_id ? {
      id: row.department_id,
      name: row.dept_name,
      code: row.dept_code
    } : null
  };
}

const BASE_REPAIR_QUERY = `
  SELECT r.*, 
         inv.type as inv_type, inv.brand as inv_brand, inv.model as inv_model, inv.status as inv_status, inv.department_id as inv_dept_id, inv.lab_id as lab_id,
         dept.name as dept_name, dept.code as dept_code,
         u.name as req_name, u.email as req_email,
         l.lab_number as lab_number, l.name as lab_name
  FROM repair_requests r
  LEFT JOIN inventory inv ON r.inventory_id = inv.id
  LEFT JOIN departments dept ON inv.department_id = dept.id
  LEFT JOIN users u ON r.requester_id = u.id
  LEFT JOIN labs l ON inv.lab_id = l.id
`;

// Helper to format repair request
function formatRepairRequest(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    initiatedDate: row.initiated_date,
    initiatedTime: row.initiated_time,
    completedDate: row.completed_date || null,
    completedTime: row.completed_time || null,
    deviceCount: row.device_count !== undefined ? row.device_count : 1,
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
      } : null,
      lab: row.lab_id ? {
        id: row.lab_id,
        name: row.lab_name,
        labNumber: row.lab_number
      } : null
    },
    requester: row.requester_id ? {
      id: row.requester_id,
      name: row.req_name,
      email: row.req_email
    } : null
  };
}

// 1. Principal Reports Data
router.get('/principal', authenticateJWT, async (req, res) => {
  try {
    const invQuery = `
      SELECT i.*, d.name as dept_name, d.code as dept_code 
      FROM inventory i 
      LEFT JOIN departments d ON i.department_id = d.id
    `;
    
    const reqQuery = BASE_REPAIR_QUERY;

    const [allInv, allReq] = await Promise.all([
      db.all(invQuery),
      db.all(reqQuery)
    ]);

    const formattedInv = allInv.map(formatInventory);
    const formattedReq = allReq.map(formatRepairRequest);

    res.json({
      deadStock: formattedInv.filter(item => item.status === 'Dead Stock'),
      newStock: formattedInv.filter(item => item.status === 'New Stock'),
      overallInventory: formattedInv,
      repairRequests: formattedReq
    });
  } catch (err) {
    console.error('Get principal reports error:', err);
    res.status(500).send('Internal server error');
  }
});

// 2. HOD Reports Data
router.get('/hod/:deptId', authenticateJWT, async (req, res) => {
  const { deptId } = req.params;
  try {
    const invQuery = `
      SELECT i.*, d.name as dept_name, d.code as dept_code 
      FROM inventory i 
      LEFT JOIN departments d ON i.department_id = d.id
      WHERE i.department_id = ?
    `;
    
    const reqQuery = BASE_REPAIR_QUERY + ' WHERE inv.department_id = ?';

    const [deptItems, deptRequests] = await Promise.all([
      db.all(invQuery, [deptId]),
      db.all(reqQuery, [deptId])
    ]);

    const formattedInv = deptItems.map(formatInventory);
    const formattedReq = deptRequests.map(formatRepairRequest);

    res.json({
      departmentInventory: formattedInv,
      repairRequests: formattedReq,
      resolvedRepairs: formattedReq.filter(r => r.status.toLowerCase() === 'resolved'),
      pendingRepairs: formattedReq.filter(r => ['initiated', 'in progress'].includes(r.status.toLowerCase()))
    });
  } catch (err) {
    console.error('Get HOD reports error:', err);
    res.status(500).send('Internal server error');
  }
});

// 3. Computer Dean Performance Metrics
router.get('/dean', authenticateJWT, async (req, res) => {
  try {
    const allRequests = await db.all(
      `SELECT r.id, r.status, inv.type 
       FROM repair_requests r 
       JOIN inventory inv ON r.inventory_id = inv.id`
    );
    
    const historyList = await db.all(
      `SELECT request_id, status, status_date, status_time 
       FROM repair_history 
       WHERE status IN ('Initiated', 'Resolved')
       ORDER BY request_id, status_date ASC, status_time ASC`
    );

    // Calculate component repair counts
    const componentRepairs: Record<string, number> = {};
    for (const req of allRequests) {
      const component = req.type;
      componentRepairs[component] = (componentRepairs[component] || 0) + 1;
    }

    // Group histories by request_id
    const historiesGrouped: Record<string, any[]> = {};
    for (const h of historyList) {
      if (!historiesGrouped[h.request_id]) {
        historiesGrouped[h.request_id] = [];
      }
      historiesGrouped[h.request_id].push(h);
    }

    let totalDays = 0;
    let resolvedCount = 0;

    for (const req of allRequests) {
      if (req.status.toLowerCase() === 'resolved') {
        const histories = historiesGrouped[req.id] || [];
        let initDateStr: string | null = null;
        let resDateStr: string | null = null;

        for (const h of histories) {
          if (h.status.toLowerCase() === 'initiated') {
            initDateStr = h.status_date;
          } else if (h.status.toLowerCase() === 'resolved') {
            resDateStr = h.status_date;
          }
        }

        if (initDateStr && resDateStr) {
          const initDate = new Date(initDateStr);
          const resDate = new Date(resDateStr);
          
          // Clear time component for pure days comparison
          initDate.setHours(0, 0, 0, 0);
          resDate.setHours(0, 0, 0, 0);

          const diffTime = resDate.getTime() - initDate.getTime();
          const diffDays = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
          totalDays += diffDays;
          resolvedCount++;
        }
      }
    }

    const avgRepairTime = resolvedCount > 0 ? (totalDays / resolvedCount) : 2.6;

    // Monthly trends mockup structure matching Dean dashboard summary
    const monthlyTrend = [
      { month: 'January', repairs: 12 },
      { month: 'February', repairs: 19 },
      { month: 'March', repairs: 15 },
      { month: 'April', repairs: 22 },
      { month: 'May', repairs: 35 },
      { month: 'June', repairs: 27 }
    ];

    res.json({
      avgRepairTimeDays: Math.round(avgRepairTime * 10) / 10,
      totalRequests: allRequests.length,
      resolvedCount,
      mostRepairedComponents: componentRepairs,
      monthlyTrend
    });
  } catch (err) {
    console.error('Get dean reports error:', err);
    res.status(500).send('Internal server error');
  }
});

// 4. Export CSV Endpoint
router.get('/export/csv', authenticateJWT, async (req, res) => {
  const { reportType, deptId, labId, startDate, endDate } = req.query as { 
    reportType: string; 
    deptId?: string; 
    labId?: string;
    startDate?: string;
    endDate?: string;
  };

  if (!reportType) {
    return res.status(400).send('Missing reportType query parameter');
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${reportType}_report.csv"`);

  try {
    if (reportType.toLowerCase().includes('inventory')) {
      res.write('Asset ID,Department,Lab,Type,Brand,Model,Serial Number,Purchase Date,Warranty (Months),Status\n');
      
      let query = `
        SELECT i.id, i.type, i.brand, i.model, i.serial_number, i.purchase_date, i.warranty_months, i.status, d.code as dept_code, l.lab_number
        FROM inventory i 
        LEFT JOIN departments d ON i.department_id = d.id
        LEFT JOIN labs l ON i.lab_id = l.id
        WHERE 1=1
      `;
      const params: any[] = [];
      if (deptId && deptId !== 'all' && deptId !== 'undefined' && deptId !== 'null') {
        query += ' AND i.department_id = ?';
        params.push(parseInt(deptId));
      }
      if (labId && labId !== 'all' && labId !== 'undefined' && labId !== 'null') {
        query += ' AND i.lab_id = ?';
        params.push(parseInt(labId));
      }
      if (startDate) {
        query += ' AND i.purchase_date >= ?';
        params.push(startDate);
      }
      if (endDate) {
        query += ' AND i.purchase_date <= ?';
        params.push(endDate);
      }

      const items = await db.all(query, params);
      for (const item of items) {
        res.write(
          `"${item.id}","${item.dept_code || 'N/A'}","${item.lab_number ? 'Lab ' + item.lab_number : 'N/A'}","${item.type}","${item.brand || ''}","${item.model || ''}","${item.serial_number || ''}","${item.purchase_date || ''}",${item.warranty_months || 0},"${item.status}"\n`
        );
      }
    } 
    else if (reportType.toLowerCase().includes('repair') || reportType.toLowerCase().includes('history')) {
      res.write('Request ID,Asset ID,Department,Lab,Type,Title,Priority,Status,Initiated On\n');
      
      let query = `
        SELECT r.id, r.inventory_id, r.title, r.priority, r.status, r.initiated_date, r.initiated_time, inv.type as inv_type, d.code as dept_code, l.lab_number 
        FROM repair_requests r 
        LEFT JOIN inventory inv ON r.inventory_id = inv.id 
        LEFT JOIN departments d ON inv.department_id = d.id
        LEFT JOIN labs l ON inv.lab_id = l.id
        WHERE 1=1
      `;
      const params: any[] = [];
      if (deptId && deptId !== 'all' && deptId !== 'undefined' && deptId !== 'null') {
        query += ' AND inv.department_id = ?';
        params.push(parseInt(deptId));
      }
      if (labId && labId !== 'all' && labId !== 'undefined' && labId !== 'null') {
        query += ' AND inv.lab_id = ?';
        params.push(parseInt(labId));
      }
      if (startDate) {
        query += ' AND r.initiated_date >= ?';
        params.push(startDate);
      }
      if (endDate) {
        query += ' AND r.initiated_date <= ?';
        params.push(endDate);
      }

      const list = await db.all(query, params);
      for (const r of list) {
        const titleClean = (r.title || '').replace(/"/g, '""');
        const initiatedOn = `${r.initiated_date} ${r.initiated_time}`;
        res.write(
          `"${r.id}","${r.inventory_id}","${r.dept_code || 'N/A'}","${r.lab_number ? 'Lab ' + r.lab_number : 'N/A'}","${r.inv_type}","${titleClean}","${r.priority}","${r.status}","${initiatedOn}"\n`
        );
      }
    } 
    else {
      res.write('Report,Generated At\n');
      res.write(`"${reportType}","${new Date().toISOString().split('T')[0]}"\n`);
    }
    
    res.end();
  } catch (err) {
    console.error('Export CSV error:', err);
    if (!res.headersSent) {
      res.status(500).send('Error generating CSV report');
    }
  }
});

export default router;
