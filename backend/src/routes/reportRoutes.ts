import { Router } from 'express';
import { db } from '../db/db';
import { authenticateJWT, AuthRequest } from '../middleware/auth';

const router = Router();

function formatDateOnly(dateVal: any): string {
  if (!dateVal) return '-';
  const str = String(dateVal).trim();
  if (!str) return '-';
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return str;
}

// Helper to format inventory item
function formatInventory(row: any) {
  return {
    id: row.id,
    type: row.type,
    brand: row.brand,
    model: row.model,
    serialNumber: row.serial_number,
    purchaseDate: formatDateOnly(row.purchase_date),
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
         u2.name as assigned_name, u2.email as assigned_email,
         l.lab_number as lab_number, l.name as lab_name
  FROM repair_requests r
  LEFT JOIN inventory inv ON r.inventory_id = inv.id
  LEFT JOIN departments dept ON inv.department_id = dept.id
  LEFT JOIN users u ON r.requester_id = u.id
  LEFT JOIN users u2 ON r.assigned_to_id = u2.id
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
    initiatedDate: formatDateOnly(row.initiated_date),
    initiatedTime: row.initiated_time,
    completedDate: row.completed_date ? formatDateOnly(row.completed_date) : null,
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
    } : null,
    assignedTo: row.assigned_to_id ? {
      id: row.assigned_to_id,
      name: row.assigned_name,
      email: row.assigned_email
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

function getRepairStatusRankInitiatedToCompleted(statusStr: string) {
  const s = (statusStr || '').toLowerCase().trim();
  if (s.includes('initiated')) return 1;
  if (s.includes('dead')) return 3;
  if (s.includes('resolved') || s.includes('completed')) return 4;
  return 2; // In Progress / Spare Parts Needed / active repair states
}

function getRepairStatusRankCompletedToInitiated(statusStr: string) {
  const s = (statusStr || '').toLowerCase().trim();
  if (s.includes('resolved') || s.includes('completed')) return 1;
  if (s.includes('dead')) return 2;
  if (s.includes('initiated')) return 4;
  return 3; // In Progress / Spare Parts Needed / active repair states
}

function getInvStatusRankInitiatedToCompleted(statusStr: string) {
  const s = (statusStr || '').toLowerCase().trim();
  if (s.includes('new') || s.includes('unallocated') || s.includes('initiated')) return 1;
  if (s.includes('working') || s.includes('allocated') || s.includes('progress') || s.includes('repair')) return 2;
  if (s.includes('dead')) return 3;
  if (s.includes('resolved') || s.includes('completed')) return 4;
  return 5;
}

function getInvStatusRankCompletedToInitiated(statusStr: string) {
  const s = (statusStr || '').toLowerCase().trim();
  if (s.includes('resolved') || s.includes('completed')) return 1;
  if (s.includes('dead')) return 2;
  if (s.includes('working') || s.includes('allocated') || s.includes('progress') || s.includes('repair')) return 3;
  if (s.includes('new') || s.includes('unallocated') || s.includes('initiated')) return 4;
  return 5;
}

// 4. Export CSV / Excel Endpoint
router.get('/export/csv', authenticateJWT, async (req: AuthRequest, res) => {
  const { reportType, deptId, labId, startDate, endDate, sortBy, format } = req.query as { 
    reportType: string; 
    deptId?: string; 
    labId?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    format?: string;
  };

  if (!reportType) {
    return res.status(400).send('Missing reportType query parameter');
  }

  const isExcel = !format || format.toLowerCase() === 'excel';

  if (isExcel) {
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${reportType}_report.xls"`);
  } else {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${reportType}_report.csv"`);
  }
  res.write('\uFEFF');

  try {
    // Resolve department label
    let deptNameStr = 'All Departments';
    if (deptId && deptId !== 'all' && deptId !== 'undefined' && deptId !== 'null') {
      const deptRow = await db.get('SELECT name, code FROM departments WHERE id = ?', [parseInt(deptId)]);
      if (deptRow) deptNameStr = `${deptRow.name} (${deptRow.code})`;
    } else if (req.user?.departmentCode) {
      deptNameStr = req.user.departmentCode;
    }

    // Resolve lab label
    let labNameStr = 'All Labs';
    if (labId && labId !== 'all' && labId !== 'undefined' && labId !== 'null') {
      const labRow = await db.get('SELECT lab_number, name FROM labs WHERE id = ?', [parseInt(labId)]);
      if (labRow) labNameStr = `Lab ${labRow.lab_number} (${labRow.name})`;
    }

    // Date range label
    const dateRangeStr = startDate || endDate ? `${formatDateOnly(startDate) || 'Beginning'} to ${formatDateOnly(endDate) || 'Present'}` : 'All Time';

    // Sort option label
    let sortByStr = 'Date (Latest First)';
    if (sortBy === 'status_initiated_to_completed') sortByStr = 'Status (Initiated to Completed)';
    else if (sortBy === 'status_completed_to_initiated') sortByStr = 'Status (Completed to Initiated Latest)';

    // Compiled by label
    const compiledByStr = `${req.user?.name || 'Authorized User'} (${req.user?.role === 'ROLE_PRINCIPAL' ? 'Principal' : req.user?.role === 'ROLE_DEAN' ? 'Computer Dean' : req.user?.role === 'ROLE_HOD' ? 'HOD' : 'Asset Manager'})`;
    const timestampStr = formatDateOnly(new Date());

    if (reportType.toLowerCase().includes('inventory')) {
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

      if (sortBy === 'date') {
        items.sort((a: any, b: any) => {
          const dateA = new Date(formatDateOnly(a.purchase_date || '')).getTime() || a.id || 0;
          const dateB = new Date(formatDateOnly(b.purchase_date || '')).getTime() || b.id || 0;
          return dateB - dateA;
        });
      } else if (sortBy === 'status_initiated_to_completed') {
        items.sort((a: any, b: any) => {
          const rankA = getInvStatusRankInitiatedToCompleted(a.status);
          const rankB = getInvStatusRankInitiatedToCompleted(b.status);
          if (rankA !== rankB) return rankA - rankB;
          const dateA = new Date(formatDateOnly(a.purchase_date || '')).getTime() || a.id || 0;
          const dateB = new Date(formatDateOnly(b.purchase_date || '')).getTime() || b.id || 0;
          return dateB - dateA;
        });
      } else if (sortBy === 'status_completed_to_initiated') {
        items.sort((a: any, b: any) => {
          const rankA = getInvStatusRankCompletedToInitiated(a.status);
          const rankB = getInvStatusRankCompletedToInitiated(b.status);
          if (rankA !== rankB) return rankA - rankB;
          const dateA = new Date(formatDateOnly(a.purchase_date || '')).getTime() || a.id || 0;
          const dateB = new Date(formatDateOnly(b.purchase_date || '')).getTime() || b.id || 0;
          return dateB - dateA;
        });
      }

      if (isExcel) {
        let tableRows = items.map((item: any) => {
          const rawStatus = (item.status || '').toLowerCase();
          let badgeClass = 'status-working';
          if (rawStatus.includes('new') || rawStatus.includes('unallocated')) badgeClass = 'status-new-stock';
          else if (rawStatus.includes('dead')) badgeClass = 'status-dead-stock';
          else if (rawStatus.includes('repair')) badgeClass = 'status-in-progress';
          else badgeClass = 'status-working';

          return `
            <tr>
              <td class="col-fit"><strong>${item.dept_code || 'N/A'}</strong></td>
              <td class="col-fit">${item.lab_number ? 'Lab ' + item.lab_number : 'N/A'}</td>
              <td class="col-fit"><strong>${item.type}</strong></td>
              <td class="col-fit">${item.brand || '-'}</td>
              <td class="col-expand">${item.model || '-'}</td>
              <td class="col-fit" style="font-family: monospace;">${item.serial_number || '-'}</td>
              <td class="col-fit">${formatDateOnly(item.purchase_date)}</td>
              <td class="col-fit text-center">${item.warranty_months || 0}</td>
              <td class="col-fit text-center ${badgeClass}">${item.status}</td>
            </tr>
          `;
        }).join('');

        if (items.length === 0) {
          tableRows = `<tr><td colspan="9" style="text-align: center; font-weight: bold; color: #64748B; padding: 20px;">No matching inventory records found</td></tr>`;
        }

        const htmlContent = `
          <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
            <!--[if gte mso 9]>
            <xml>
              <x:ExcelWorkbook>
                <x:ExcelWorksheets>
                  <x:ExcelWorksheet>
                    <x:Name>Asset Register</x:Name>
                    <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                  </x:ExcelWorksheet>
                </x:ExcelWorksheets>
              </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <style>
              body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #1e293b; }
              .college-title { font-size: 16pt; font-weight: bold; color: #0c2340; text-align: center; text-transform: uppercase; }
              .college-sub { font-size: 10pt; font-weight: bold; color: #c5a059; text-align: center; text-transform: uppercase; }
              .college-tag { font-size: 8pt; color: #64748b; text-align: center; }
              .report-title { font-size: 13pt; font-weight: bold; color: #0c2340; text-align: center; text-transform: uppercase; background-color: #f1f5f9; padding: 8px; }
              .meta-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
              .meta-table td { padding: 6px 10px; font-size: 9pt; border: 1px solid #cbd5e1; }
              .meta-label { font-weight: bold; color: #475569; background-color: #f8fafc; width: 15%; text-transform: uppercase; }
              .meta-val { color: #0f172a; font-weight: bold; }
              .data-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; table-layout: auto; }
              .data-table th { background-color: #0c2340; color: #ffffff; font-weight: bold; text-transform: uppercase; font-size: 8.5pt; border: 1px solid #0c2340; padding: 8px 10px; text-align: left; white-space: nowrap; }
              .data-table td { border: 1px solid #cbd5e1; padding: 6px 10px; color: #334155; vertical-align: middle; }
              .data-table .col-fit { width: 1%; white-space: nowrap; }
              .data-table .col-expand { width: auto; min-width: 160px; word-break: break-word; }
              .data-table .text-center { text-align: center; }
              .data-table tr:nth-child(even) td { background-color: #f8fafc; }
              .status-initiated { background-color: #fee2e2; color: #b91c1c; font-weight: bold; text-align: center; }
              .status-in-progress { background-color: #fef3c7; color: #b45309; font-weight: bold; text-align: center; }
              .status-spare-parts { background-color: #f3e8ff; color: #6b21a8; font-weight: bold; text-align: center; }
              .status-resolved { background-color: #dcfce7; color: #15803d; font-weight: bold; text-align: center; }
              .status-dead-stock { background-color: #fee2e2; color: #b91c1c; font-weight: bold; text-align: center; }
              .status-new-stock { background-color: #dbeafe; color: #1d4ed8; font-weight: bold; text-align: center; }
              .status-working { background-color: #dcfce7; color: #15803d; font-weight: bold; text-align: center; }
              .sig-cell { text-align: center; font-size: 9.5pt; font-weight: bold; color: #475569; padding-top: 30px; }
            </style>
          </head>
          <body>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td colspan="9" class="college-title">NARASARAOPETA ENGINEERING COLLEGE (AUTONOMOUS)</td></tr>
              <tr><td colspan="9" class="college-sub">(AUTONOMOUS) &mdash; Approved by AICTE, Permanent Affiliation to JNTUK, Accredited by NBA & NAAC with 'A' Grade</td></tr>
              <tr><td colspan="9" class="college-tag">Kotappakonda Road, Yellamanda (P.O), Narasaraopet, Palnadu (Dt) - 522601, Andhra Pradesh</td></tr>
              <tr><td colspan="9" style="height: 10px;"></td></tr>
              <tr><td colspan="9" class="report-title">Department of ${deptNameStr} &mdash; Hardware Asset Register</td></tr>
            </table>

            <table class="meta-table">
              <tr>
                <td class="meta-label">Department:</td>
                <td class="meta-val">${deptNameStr}</td>
                <td class="meta-label">Compiled By:</td>
                <td class="meta-val">${compiledByStr}</td>
              </tr>
              <tr>
                <td class="meta-label">Laboratory:</td>
                <td class="meta-val">${labNameStr}</td>
                <td class="meta-label">Timestamp:</td>
                <td class="meta-val">${timestampStr}</td>
              </tr>
              <tr>
                <td class="meta-label">Date Filter:</td>
                <td class="meta-val">${dateRangeStr}</td>
                <td class="meta-label">Sort Option:</td>
                <td class="meta-val">${sortByStr}</td>
              </tr>
              <tr>
                <td class="meta-label">Total Records:</td>
                <td class="meta-val">${items.length} Units</td>
                <td class="meta-label">Status:</td>
                <td class="meta-val" style="color: #15803d;">OFFICIAL INDUSTRIAL LEDGER</td>
              </tr>
            </table>

            <table class="data-table">
              <thead>
                <tr>
                  <th class="col-fit">Department</th>
                  <th class="col-fit">Laboratory</th>
                  <th class="col-fit">Asset Type</th>
                  <th class="col-fit">Brand</th>
                  <th class="col-expand">Model</th>
                  <th class="col-fit">Serial Number</th>
                  <th class="col-fit">Purchase Date</th>
                  <th class="col-fit text-center">Warranty (Months)</th>
                  <th class="col-fit text-center">Current Status</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>

            <table style="width: 100%; border-collapse: collapse; margin-top: 40px;">
              <tr>
                <td class="sig-cell">----------------------------------------<br/>Prepared By / Lab Programmer</td>
                <td class="sig-cell">----------------------------------------<br/>Head of the Department</td>
                <td class="sig-cell">----------------------------------------<br/>Principal</td>
              </tr>
            </table>
          </body>
          </html>
        `;
        res.write(htmlContent);
      } else {
        res.write('Department,Lab,Type,Brand,Model,Serial Number,Purchase Date,Warranty (Months),Status\n');
        for (const item of items) {
          res.write(
            `"${item.dept_code || 'N/A'}","${item.lab_number ? 'Lab ' + item.lab_number : 'N/A'}","${item.type}","${item.brand || ''}","${item.model || ''}","${item.serial_number || ''}","${formatDateOnly(item.purchase_date)}",${item.warranty_months || 0},"${item.status}"\n`
          );
        }
      }
    } 
    else if (reportType.toLowerCase().includes('repair') || reportType.toLowerCase().includes('history') || reportType.toLowerCase().includes('performance')) {
      let query = `
        SELECT r.id, r.inventory_id, r.title, r.priority, r.status, r.initiated_date, r.initiated_time, r.completed_date, r.completed_time,
               inv.type as inv_type, d.code as dept_code, l.lab_number, l.name as lab_name,
               u.name as req_name, u2.name as assigned_name
        FROM repair_requests r 
        LEFT JOIN inventory inv ON r.inventory_id = inv.id 
        LEFT JOIN departments d ON inv.department_id = d.id
        LEFT JOIN labs l ON inv.lab_id = l.id
        LEFT JOIN users u ON r.requester_id = u.id
        LEFT JOIN users u2 ON r.assigned_to_id = u2.id
        WHERE 1=1
      `;
      const params: any[] = [];
      if (req.user?.role === 'ROLE_EEE_ASSET_MANAGER') {
        query += " AND (inv.type = 'Electrical Hardware' OR r.title LIKE '%Electrical Hardware%' OR r.description LIKE '%Electrical Hardware%')";
      }
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

      if (sortBy === 'date') {
        list.sort((a: any, b: any) => {
          const dateA = new Date(formatDateOnly(a.initiated_date || '')).getTime() || a.id || 0;
          const dateB = new Date(formatDateOnly(b.initiated_date || '')).getTime() || b.id || 0;
          return dateB - dateA;
        });
      } else if (sortBy === 'status_initiated_to_completed') {
        list.sort((a: any, b: any) => {
          const rankA = getRepairStatusRankInitiatedToCompleted(a.status);
          const rankB = getRepairStatusRankInitiatedToCompleted(b.status);
          if (rankA !== rankB) return rankA - rankB;
          const dateA = new Date(formatDateOnly(a.initiated_date || '')).getTime() || a.id || 0;
          const dateB = new Date(formatDateOnly(b.initiated_date || '')).getTime() || b.id || 0;
          return dateB - dateA;
        });
      } else if (sortBy === 'status_completed_to_initiated') {
        list.sort((a: any, b: any) => {
          const rankA = getRepairStatusRankCompletedToInitiated(a.status);
          const rankB = getRepairStatusRankCompletedToInitiated(b.status);
          if (rankA !== rankB) return rankA - rankB;
          const dateA = new Date(formatDateOnly(a.initiated_date || '')).getTime() || a.id || 0;
          const dateB = new Date(formatDateOnly(b.initiated_date || '')).getTime() || b.id || 0;
          return dateB - dateA;
        });
      }

      if (isExcel) {
        let tableRows = list.map((r: any) => {
          const titleClean = r.title || r.inv_type || '-';
          const raisedDate = formatDateOnly(r.initiated_date);
          const closingDate = r.completed_date ? formatDateOnly(r.completed_date) : '-';
          
          let daysTaken = '-';
          if (r.initiated_date) {
            const sD = new Date(formatDateOnly(r.initiated_date));
            const eD = r.completed_date ? new Date(formatDateOnly(r.completed_date)) : new Date();
            sD.setHours(0, 0, 0, 0);
            eD.setHours(0, 0, 0, 0);
            const diffTime = eD.getTime() - sD.getTime();
            const diffDays = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
            const isClosed = r.completed_date || (r.status && ['resolved', 'dead stock'].includes(r.status.toLowerCase()));
            daysTaken = isClosed ? `${diffDays} days` : `${diffDays} days (Ongoing)`;
          }

          const rawStatus = (r.status || '').toLowerCase();
          let finalResult = 'In Progress';
          let badgeClass = 'status-in-progress';
          if (rawStatus === 'initiated') {
            finalResult = 'Initiated';
            badgeClass = 'status-initiated';
          } else if (rawStatus === 'resolved') {
            finalResult = 'Resolved';
            badgeClass = 'status-resolved';
          } else if (rawStatus === 'dead stock' || rawStatus === 'deadstock') {
            finalResult = 'Dead Stock';
            badgeClass = 'status-dead-stock';
          } else if (rawStatus === 'parts requested' || rawStatus === 'spare parts needed') {
            finalResult = 'Spare Parts Needed';
            badgeClass = 'status-spare-parts';
          } else {
            finalResult = 'In Progress';
            badgeClass = 'status-in-progress';
          }

          return `
            <tr>
              <td class="col-fit"><strong>#${r.id}</strong></td>
              <td class="col-fit"><strong>${r.dept_code || 'N/A'}</strong></td>
              <td class="col-fit">${r.lab_number ? 'Lab ' + r.lab_number : 'N/A'}</td>
              <td class="col-expand"><strong>${titleClean}</strong></td>
              <td class="col-fit">${raisedDate}</td>
              <td class="col-fit">${closingDate}</td>
              <td class="col-fit text-center">${daysTaken}</td>
              <td class="col-fit text-center ${badgeClass}">${finalResult}</td>
              <td class="col-fit">${r.req_name || 'N/A'}</td>
              <td class="col-fit">${r.assigned_name || 'Not Assigned'}</td>
            </tr>
          `;
        }).join('');

        if (list.length === 0) {
          tableRows = `<tr><td colspan="10" style="text-align: center; font-weight: bold; color: #64748B; padding: 20px;">No matching repair records found</td></tr>`;
        }

        const htmlContent = `
          <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
            <!--[if gte mso 9]>
            <xml>
              <x:ExcelWorkbook>
                <x:ExcelWorksheets>
                  <x:ExcelWorksheet>
                    <x:Name>Repair Ledger</x:Name>
                    <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                  </x:ExcelWorksheet>
                </x:ExcelWorksheets>
              </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <style>
              body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #1e293b; }
              .college-title { font-size: 16pt; font-weight: bold; color: #0c2340; text-align: center; text-transform: uppercase; }
              .college-sub { font-size: 10pt; font-weight: bold; color: #c5a059; text-align: center; text-transform: uppercase; }
              .college-tag { font-size: 8pt; color: #64748b; text-align: center; }
              .report-title { font-size: 13pt; font-weight: bold; color: #0c2340; text-align: center; text-transform: uppercase; background-color: #f1f5f9; padding: 8px; }
              .meta-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
              .meta-table td { padding: 6px 10px; font-size: 9pt; border: 1px solid #cbd5e1; }
              .meta-label { font-weight: bold; color: #475569; background-color: #f8fafc; width: 15%; text-transform: uppercase; }
              .meta-val { color: #0f172a; font-weight: bold; }
              .data-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; table-layout: auto; }
              .data-table th { background-color: #0c2340; color: #ffffff; font-weight: bold; text-transform: uppercase; font-size: 8.5pt; border: 1px solid #0c2340; padding: 8px 10px; text-align: left; white-space: nowrap; }
              .data-table td { border: 1px solid #cbd5e1; padding: 6px 10px; color: #334155; vertical-align: middle; }
              .data-table .col-fit { width: 1%; white-space: nowrap; }
              .data-table .col-expand { width: auto; min-width: 160px; word-break: break-word; }
              .data-table .text-center { text-align: center; }
              .data-table tr:nth-child(even) td { background-color: #f8fafc; }
              .status-initiated { background-color: #fee2e2; color: #b91c1c; font-weight: bold; text-align: center; }
              .status-in-progress { background-color: #fef3c7; color: #b45309; font-weight: bold; text-align: center; }
              .status-spare-parts { background-color: #f3e8ff; color: #6b21a8; font-weight: bold; text-align: center; }
              .status-resolved { background-color: #dcfce7; color: #15803d; font-weight: bold; text-align: center; }
              .status-dead-stock { background-color: #fee2e2; color: #b91c1c; font-weight: bold; text-align: center; }
              .status-new-stock { background-color: #dbeafe; color: #1d4ed8; font-weight: bold; text-align: center; }
              .status-working { background-color: #dcfce7; color: #15803d; font-weight: bold; text-align: center; }
              .sig-cell { text-align: center; font-size: 9.5pt; font-weight: bold; color: #475569; padding-top: 30px; }
            </style>
          </head>
          <body>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td colspan="10" class="college-title">NARASARAOPETA ENGINEERING COLLEGE (AUTONOMOUS)</td></tr>
              <tr><td colspan="10" class="college-sub">(AUTONOMOUS) &mdash; Approved by AICTE, Permanent Affiliation to JNTUK, Accredited by NBA & NAAC with 'A' Grade</td></tr>
              <tr><td colspan="10" class="college-tag">Kotappakonda Road, Yellamanda (P.O), Narasaraopet, Palnadu (Dt) - 522601, Andhra Pradesh</td></tr>
              <tr><td colspan="10" style="height: 10px;"></td></tr>
              <tr><td colspan="10" class="report-title">Department of ${deptNameStr} &mdash; ${reportType}</td></tr>
            </table>

            <table class="meta-table">
              <tr>
                <td class="meta-label">Department:</td>
                <td class="meta-val">${deptNameStr}</td>
                <td class="meta-label">Compiled By:</td>
                <td class="meta-val">${compiledByStr}</td>
              </tr>
              <tr>
                <td class="meta-label">Laboratory:</td>
                <td class="meta-val">${labNameStr}</td>
                <td class="meta-label">Timestamp:</td>
                <td class="meta-val">${timestampStr}</td>
              </tr>
              <tr>
                <td class="meta-label">Date Filter:</td>
                <td class="meta-val">${dateRangeStr}</td>
                <td class="meta-label">Sort Option:</td>
                <td class="meta-val">${sortByStr}</td>
              </tr>
              <tr>
                <td class="meta-label">Total Records:</td>
                <td class="meta-val">${list.length} Tickets</td>
                <td class="meta-label">Status:</td>
                <td class="meta-val" style="color: #15803d;">OFFICIAL INDUSTRIAL AUDIT LOG</td>
              </tr>
            </table>

            <table class="data-table">
              <thead>
                <tr>
                  <th class="col-fit">Ticket ID</th>
                  <th class="col-fit">Department</th>
                  <th class="col-fit">Laboratory</th>
                  <th class="col-expand">Location & Issue Title</th>
                  <th class="col-fit">Complaint Raised Date</th>
                  <th class="col-fit">Closing Date</th>
                  <th class="col-fit text-center">Time Taken</th>
                  <th class="col-fit text-center">Final Result / Status</th>
                  <th class="col-fit">Requester</th>
                  <th class="col-fit">Assigned Technician</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>

            <table style="width: 100%; border-collapse: collapse; margin-top: 40px;">
              <tr>
                <td class="sig-cell">----------------------------------------<br/>Prepared By / Lab Programmer</td>
                <td class="sig-cell">----------------------------------------<br/>Head of the Department</td>
                <td class="sig-cell">----------------------------------------<br/>Principal</td>
              </tr>
            </table>
          </body>
          </html>
        `;
        res.write(htmlContent);
      } else {
        res.write('Ticket ID,Department,Lab,Title / Issue,Complaint Raised Date,Closing Date,No of Days Taken to Complete,Final Result of Ticket,Requester Name,Technician Name\n');
        for (const r of list) {
          const titleClean = (r.title || r.inv_type || '').replace(/"/g, '""');
          const raisedDate = formatDateOnly(r.initiated_date);
          const closingDate = r.completed_date ? formatDateOnly(r.completed_date) : '-';
          
          let daysTaken = '-';
          if (r.initiated_date) {
            const sD = new Date(formatDateOnly(r.initiated_date));
            const eD = r.completed_date ? new Date(formatDateOnly(r.completed_date)) : new Date();
            sD.setHours(0, 0, 0, 0);
            eD.setHours(0, 0, 0, 0);
            const diffTime = eD.getTime() - sD.getTime();
            const diffDays = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
            const isClosed = r.completed_date || (r.status && ['resolved', 'dead stock'].includes(r.status.toLowerCase()));
            daysTaken = isClosed ? `${diffDays} days` : `${diffDays} days (Ongoing)`;
          }

          const rawStatus = (r.status || '').toLowerCase();
          let finalResult = 'In Progress';
          if (rawStatus === 'initiated') finalResult = 'Initiated';
          else if (rawStatus === 'resolved') finalResult = 'Resolved';
          else if (rawStatus === 'dead stock' || rawStatus === 'deadstock') finalResult = 'Dead Stock';
          else if (rawStatus === 'parts requested' || rawStatus === 'spare parts needed') finalResult = 'Spare Parts Needed';
          else finalResult = 'In Progress';

          res.write(
            `"${r.id}","${r.dept_code || 'N/A'}","${r.lab_number ? 'Lab ' + r.lab_number : 'N/A'}","${titleClean}","${raisedDate}","${closingDate}","${daysTaken}","${finalResult}","${r.req_name || 'N/A'}","${r.assigned_name || 'Not Assigned'}"\n`
          );
        }
      }
    } 
    else {
      if (isExcel) {
        res.write(`<html><body><h2>${reportType}</h2><p>Generated At: ${formatDateOnly(new Date())}</p></body></html>`);
      } else {
        res.write('Report,Generated At\n');
        res.write(`"${reportType}","${formatDateOnly(new Date())}"\n`);
      }
    }
    
    res.end();
  } catch (err) {
    console.error('Export CSV/Excel error:', err);
    if (!res.headersSent) {
      res.status(500).send('Error generating report');
    }
  }
});

export default router;
