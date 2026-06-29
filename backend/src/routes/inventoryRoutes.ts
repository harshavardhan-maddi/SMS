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
    workstationNumber: row.workstation_number || 1,
    department: row.department_id
      ? { id: row.department_id, name: row.dept_name, code: row.dept_code }
      : null,
    lab: row.lab_id
      ? { id: row.lab_id, name: row.lab_name, labNumber: row.lab_number }
      : null,
  };
}

// 1. Get all inventory items (optionally filtered by departmentId or labId)
router.get('/', authenticateJWT, async (req, res) => {
  const departmentId = req.query.departmentId;
  const labId = req.query.labId;
  try {
    let query = `
      SELECT i.*, d.name as dept_name, d.code as dept_code, l.name as lab_name, l.lab_number as lab_number
      FROM inventory i 
      LEFT JOIN departments d ON i.department_id = d.id
      LEFT JOIN labs l ON i.lab_id = l.id
    `;
    const params: any[] = [];
    const conditions: string[] = [];
    
    if (departmentId && departmentId !== 'undefined' && departmentId !== 'null') {
      conditions.push('i.department_id = ?');
      params.push(parseInt(departmentId as string));
    }
    if (labId && labId !== 'undefined' && labId !== 'null') {
      conditions.push('i.lab_id = ?');
      params.push(parseInt(labId as string));
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const rows = await db.all(query, params);
    res.json(rows.map(formatInventory));
  } catch (err) {
    console.error('Get inventory error:', err);
    res.status(500).send('Internal server error');
  }
});

// 2. Get overall aggregated counts (Principal Dashboard)
router.get('/counts', authenticateJWT, async (req, res) => {
  try {
    const types = ['CPU', 'Monitor', 'Keyboard', 'Mouse', 'Hotspot'];
    
    const counts: Record<string, Record<string, number>> = {
      CollegeSystems: { CPU: 0, Monitor: 0, Keyboard: 0, Mouse: 0, Hotspot: 0, Total: 0 },
      Working: { CPU: 0, Monitor: 0, Keyboard: 0, Mouse: 0, Hotspot: 0, Total: 0 },
      DeadStock: { CPU: 0, Monitor: 0, Keyboard: 0, Mouse: 0, Hotspot: 0, Total: 0 },
      NewStock: { CPU: 0, Monitor: 0, Keyboard: 0, Mouse: 0, Hotspot: 0, Total: 0 },
      Repairing: { CPU: 0, Monitor: 0, Keyboard: 0, Mouse: 0, Hotspot: 0, Total: 0 },
    };

    const depts = await db.all('SELECT id FROM departments');

    for (const dept of depts) {
      const deptId = dept.id;

      const finalized = await db.all(
        'SELECT type, total, working, not_working FROM finalized_hardware_counts WHERE department_id = ?',
        [deptId]
      );

      if (finalized && finalized.length > 0) {
        for (const row of finalized) {
          const type = row.type;
          if (counts.CollegeSystems[type] !== undefined) {
            counts.CollegeSystems[type] += row.total;
            counts.CollegeSystems.Total += row.total;

            counts.Working[type] += row.working;
            counts.Working.Total += row.working;

            counts.Repairing[type] += row.not_working;
            counts.Repairing.Total += row.not_working;
          }
        }
      } else {
        const invRows = await db.all(
          'SELECT type, status, COUNT(*) as count FROM inventory WHERE department_id = ? GROUP BY type, status',
          [deptId]
        );

        for (const row of invRows) {
          const type = row.type;
          const status = row.status;
          const countVal = parseInt(row.count);

          if (counts.CollegeSystems[type] !== undefined) {
            counts.CollegeSystems[type] += countVal;
            counts.CollegeSystems.Total += countVal;

            if (status === 'Working' || status === 'New Stock') {
              counts.Working[type] += countVal;
              counts.Working.Total += countVal;
            } else if (status === 'Dead Stock') {
              counts.DeadStock[type] += countVal;
              counts.DeadStock.Total += countVal;
            } else {
              counts.Repairing[type] += countVal;
              counts.Repairing.Total += countVal;
            }
          }
        }
      }
    }

    const dynamicInv = await db.all(
      "SELECT type, status, COUNT(*) as count FROM inventory WHERE status IN ('New Stock', 'Repairing', 'Dead Stock') GROUP BY type, status"
    );

    for (const row of dynamicInv) {
      const type = row.type;
      const status = row.status;
      const countVal = parseInt(row.count);

      const statusKey = status.replace(/\s+/g, '');
      if (counts[statusKey] && counts[statusKey][type] !== undefined) {
        counts[statusKey][type] = countVal;
        counts[statusKey].Total += countVal;
      }
    }

    res.json(counts);
  } catch (err) {
    console.error('Get overall counts error:', err);
    res.status(500).send('Internal server error');
  }
});

// 3. Get department counts (HOD Dashboard)
router.get('/counts/department/:deptId', authenticateJWT, async (req, res) => {
  const { deptId } = req.params;
  const numericDeptId = parseInt(deptId);
  try {
    const types = ['CPU', 'Monitor', 'Keyboard', 'Mouse', 'Hotspot'];
    
    const rows = await db.all(
      'SELECT type, status, COUNT(*) as count FROM inventory WHERE department_id = ? GROUP BY type, status',
      [numericDeptId]
    );

    const counts: Record<string, Record<string, number>> = {};
    for (const type of types) {
      counts[type] = { Total: 0, Working: 0, Repairing: 0, Dead: 0, NewStock: 0 };
    }

    for (const row of rows) {
      const type = row.type;
      const status = row.status;
      const countVal = parseInt(row.count);

      if (counts[type]) {
        counts[type].Total += countVal;
        if (status === 'Working') counts[type].Working += countVal;
        else if (status === 'Repairing') counts[type].Repairing += countVal;
        else if (status === 'Dead Stock') counts[type].Dead += countVal;
        else if (status === 'New Stock') counts[type].NewStock += countVal;
      }
    }

    const finalized = await db.all(
      'SELECT type, SUM(total) as total, SUM(working) as working, SUM(not_working) as not_working FROM finalized_hardware_counts WHERE department_id = ? GROUP BY type',
      [numericDeptId]
    );

    if (finalized && finalized.length > 0) {
      for (const row of finalized) {
        const type = row.type;
        if (counts[type]) {
          counts[type].Total = row.total || 0;
          counts[type].Working = row.working || 0;
          counts[type].Repairing = row.not_working || 0;
          // Retain actual dead stock count from inventory table if marked dead
        }
      }
    }

    res.json(counts);
  } catch (err) {
    console.error('Get department counts error:', err);
    res.status(500).send('Internal server error');
  }
});

// 4. Get inventory by ID
router.get('/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  try {
    const row = await db.get(
      `SELECT i.*, d.name as dept_name, d.code as dept_code, l.name as lab_name, l.lab_number as lab_number
       FROM inventory i 
       LEFT JOIN departments d ON i.department_id = d.id
       LEFT JOIN labs l ON i.lab_id = l.id
       WHERE i.id = ?`,
      [id]
    );

    if (!row) {
      return res.status(404).send('Inventory item not found');
    }

    res.json(formatInventory(row));
  } catch (err) {
    console.error('Get inventory by ID error:', err);
    res.status(500).send('Internal server error');
  }
});

// 5. Create Inventory item
router.post('/', authenticateJWT, async (req, res) => {
  const { type, brand, model, serialNumber, purchaseDate, warrantyMonths, status, labId, workstationNumber } = req.body;
  const departmentId = req.query.departmentId || req.body.departmentId;

  if (!type || !departmentId) {
    return res.status(400).send('Missing required type or departmentId');
  }

  try {
    const dept = await db.get('SELECT id FROM departments WHERE id = ?', [departmentId]);
    if (!dept) {
      return res.status(400).send('Department not found');
    }

    let assetId = req.body.id;
    if (!assetId || assetId.trim() === '') {
      const countRes = await db.get('SELECT COUNT(*) as count FROM inventory');
      const count = countRes ? countRes.count : 0;
      assetId = `AST-${String(count + 1).padStart(3, '0')}`;
    }

    await db.run(
      `INSERT INTO inventory (id, department_id, lab_id, workstation_number, type, brand, model, serial_number, purchase_date, warranty_months, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        assetId,
        departmentId,
        labId || null,
        workstationNumber || 1,
        type,
        brand || null,
        model || null,
        serialNumber || null,
        purchaseDate || null,
        warrantyMonths || 12,
        status || 'Working',
      ]
    );

    const created = await db.get(
      `SELECT i.*, d.name as dept_name, d.code as dept_code, l.name as lab_name, l.lab_number as lab_number
       FROM inventory i 
       LEFT JOIN departments d ON i.department_id = d.id
       LEFT JOIN labs l ON i.lab_id = l.id
       WHERE i.id = ?`,
      [assetId]
    );

    res.json(formatInventory(created));
  } catch (err) {
    console.error('Create inventory item error:', err);
    res.status(400).send((err as Error).message);
  }
});

// 6. Update Inventory item
router.put('/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { type, brand, model, serialNumber, purchaseDate, warrantyMonths, status, labId, workstationNumber } = req.body;
  const departmentId = req.query.departmentId || req.body.departmentId;

  try {
    const item = await db.get('SELECT id FROM inventory WHERE id = ?', [id]);
    if (!item) {
      return res.status(404).send('Inventory item not found');
    }

    let deptId = null;
    if (departmentId) {
      const dept = await db.get('SELECT id FROM departments WHERE id = ?', [departmentId]);
      if (!dept) {
        return res.status(400).send('Department not found');
      }
      deptId = dept.id;
    }

    await db.run(
      `UPDATE inventory 
       SET type = ?, brand = ?, model = ?, serial_number = ?, purchase_date = ?, warranty_months = ?, status = ?, department_id = COALESCE(?, department_id), lab_id = ?, workstation_number = COALESCE(?, workstation_number)
       WHERE id = ?`,
      [
        type,
        brand || null,
        model || null,
        serialNumber || null,
        purchaseDate || null,
        warrantyMonths || 12,
        status,
        deptId,
        labId || null,
        workstationNumber || null,
        id,
      ]
    );

    const updated = await db.get(
      `SELECT i.*, d.name as dept_name, d.code as dept_code, l.name as lab_name, l.lab_number as lab_number
       FROM inventory i 
       LEFT JOIN departments d ON i.department_id = d.id
       LEFT JOIN labs l ON i.lab_id = l.id
       WHERE i.id = ?`,
      [id]
    );

    res.json(formatInventory(updated));
  } catch (err) {
    console.error('Update inventory item error:', err);
    res.status(400).send((err as Error).message);
  }
});

// 7. Delete Inventory item
router.delete('/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  try {
    const item = await db.get('SELECT id FROM inventory WHERE id = ?', [id]);
    if (!item) {
      return res.status(404).send('Inventory item not found');
    }

    await db.run('DELETE FROM inventory WHERE id = ?', [id]);
    res.sendStatus(200);
  } catch (err) {
    console.error('Delete inventory item error:', err);
    res.status(400).send((err as Error).message);
  }
});

// 8. Get finalized counts for HOD's department (optionally by labId)
router.get('/finalized-counts/department/:deptId', authenticateJWT, async (req, res) => {
  const { deptId } = req.params;
  const authUser = (req as any).user;
  let numericDeptId = (deptId && deptId !== 'undefined' && deptId !== 'null') ? parseInt(deptId) : 0;

  if (!numericDeptId && authUser?.id) {
    const userRow = await db.get('SELECT department_id FROM users WHERE id = ?', [authUser.id]);
    if (userRow && userRow.department_id) {
      numericDeptId = parseInt(userRow.department_id);
    } else {
      const deptRow = await db.get('SELECT id FROM departments WHERE hod_id = ?', [authUser.id]);
      if (deptRow) {
        numericDeptId = parseInt(deptRow.id);
      }
    }
  }

  const labId = req.query.labId ? parseInt(req.query.labId as string) : 0;
  try {
    const types = ['CPU', 'Monitor', 'Keyboard', 'Mouse', 'Hotspot'];
    
    const rows = await db.all(
      'SELECT type, total, working, not_working FROM finalized_hardware_counts WHERE department_id = ? AND lab_id = ?',
      [numericDeptId, labId]
    );

    const counts: Record<string, any> = {};
    for (const type of types) {
      counts[type] = { total: 0, working: 0, not_working: 0 };
    }

    if (rows && rows.length > 0) {
      for (const row of rows) {
        counts[row.type] = {
          total: row.total,
          working: row.working,
          not_working: row.not_working
        };
      }
      return res.json(counts);
    }

    // Fallback: compute from active inventory for this lab or dept
    let query = 'SELECT type, status, COUNT(*) as count FROM inventory WHERE department_id = ?';
    const params: any[] = [numericDeptId];
    if (labId > 0) {
      query += ' AND lab_id = ?';
      params.push(labId);
    }
    query += ' GROUP BY type, status';

    const invRows = await db.all(query, params);

    for (const row of invRows) {
      const type = row.type;
      const status = row.status;
      const countVal = parseInt(row.count);

      if (counts[type]) {
        counts[type].total += countVal;
        if (status === 'Working' || status === 'New Stock') {
          counts[type].working += countVal;
        } else {
          counts[type].not_working += countVal;
        }
      }
    }

    res.json(counts);
  } catch (err) {
    console.error('Get finalized counts error:', err);
    res.status(500).send('Internal server error');
  }
});

// 9. Save finalized counts for a department and lab
router.post('/finalize-counts', authenticateJWT, async (req, res) => {
  const { departmentId, labId, counts } = req.body;
  const authUser = (req as any).user;
  let numericDeptId = (departmentId && departmentId !== 'undefined' && departmentId !== 'null') ? parseInt(departmentId) : 0;

  if (!numericDeptId && authUser?.id) {
    const userRow = await db.get('SELECT department_id FROM users WHERE id = ?', [authUser.id]);
    if (userRow && userRow.department_id) {
      numericDeptId = parseInt(userRow.department_id);
    } else {
      const deptRow = await db.get('SELECT id FROM departments WHERE hod_id = ?', [authUser.id]);
      if (deptRow) {
        numericDeptId = parseInt(deptRow.id);
      }
    }
  }

  const targetLabId = labId ? parseInt(labId) : 0;

  if (!numericDeptId || !counts || !Array.isArray(counts)) {
    return res.status(400).send('Missing departmentId or counts array');
  }

  try {
    await db.transaction(async () => {
      for (const item of counts) {
        const { type, total, working, not_working } = item;
        if (!type) continue;

        const targetWorking = parseInt(working) || 0;
        const targetNotWorking = parseInt(not_working) || 0;
        const targetTotal = parseInt(total) || (targetWorking + targetNotWorking);

        const existing = await db.get(
          'SELECT 1 FROM finalized_hardware_counts WHERE department_id = ? AND lab_id = ? AND type = ?',
          [numericDeptId, targetLabId, type]
        );

        if (existing) {
          await db.run(
            `UPDATE finalized_hardware_counts 
             SET total = ?, working = ?, not_working = ?, updated_at = CURRENT_TIMESTAMP
             WHERE department_id = ? AND lab_id = ? AND type = ?`,
            [targetTotal, targetWorking, targetNotWorking, numericDeptId, targetLabId, type]
          );
        } else {
          await db.run(
            `INSERT INTO finalized_hardware_counts (department_id, lab_id, type, total, working, not_working)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [numericDeptId, targetLabId, type, targetTotal, targetWorking, targetNotWorking]
          );
        }

        // Auto-synchronize inventory items for this lab and hardware type by specifications & workstation
        if (targetLabId > 0 && targetTotal > 0) {
          try {
            const existingItems = await db.all(
              'SELECT * FROM inventory WHERE department_id = ? AND lab_id = ? AND type = ? ORDER BY workstation_number ASC, id ASC',
              [numericDeptId, targetLabId, type]
            );

            const defaultBrands: Record<string, string> = {
              CPU: 'Dell',
              Monitor: 'HP',
              Keyboard: 'Logitech',
              Mouse: 'Lenovo',
              Hotspot: 'TP-Link'
            };
            const brand = defaultBrands[type] || 'Standard';

            // Create missing items if total count exceeds existing inventory items
            if (existingItems.length < targetTotal) {
              const missingCount = targetTotal - existingItems.length;
              for (let i = 0; i < missingCount; i++) {
                const wsNum = existingItems.length + i + 1;
                const randSuffix = Math.floor(1000 + Math.random() * 9000);
                const assetId = `AST-L${targetLabId}-${type.substring(0, 3).toUpperCase()}-${wsNum}-${randSuffix}`;
                const serialNumber = `SN-L${targetLabId}-${type.substring(0, 3).toUpperCase()}-${wsNum}-${randSuffix}`;
                
                try {
                  await db.run(
                    `INSERT INTO inventory (id, department_id, lab_id, workstation_number, type, brand, model, serial_number, purchase_date, warranty_months, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                      assetId,
                      numericDeptId,
                      targetLabId,
                      wsNum,
                      type,
                      brand,
                      `Model v${wsNum}`,
                      serialNumber,
                      new Date().toISOString().split('T')[0],
                      24,
                      i < targetWorking ? 'Working' : 'Repairing'
                    ]
                  );
                } catch (errIns) {
                  // Fallback without specifying custom primary key if schema uses serial/auto-id
                  try {
                    await db.run(
                      `INSERT INTO inventory (department_id, lab_id, workstation_number, type, brand, model, serial_number, purchase_date, warranty_months, status)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                      [
                        numericDeptId,
                        targetLabId,
                        wsNum,
                        type,
                        brand,
                        `Model v${wsNum}`,
                        serialNumber,
                        new Date().toISOString().split('T')[0],
                        24,
                        i < targetWorking ? 'Working' : 'Repairing'
                      ]
                    );
                  } catch (errIns2) {}
                }
              }
            }

            // Fetch updated list and assign working / not_working statuses and workstation numbers
            const allLabTypeItems = await db.all(
              'SELECT * FROM inventory WHERE department_id = ? AND lab_id = ? AND type = ? ORDER BY workstation_number ASC, id ASC',
              [numericDeptId, targetLabId, type]
            );

            for (let idx = 0; idx < allLabTypeItems.length; idx++) {
              const itemObj = allLabTypeItems[idx];
              const wsNum = idx + 1;
              const status = idx < targetWorking ? 'Working' : 'Repairing';
              try {
                await db.run(
                  'UPDATE inventory SET workstation_number = ?, status = ? WHERE id = ?',
                  [wsNum, status, itemObj.id]
                );
              } catch (errUpd) {}
            }
          } catch (errSync) {
            console.error('Inventory sync error during finalization:', errSync);
          }
        }
      }
    });

    const { notificationService } = require('../services/notificationService');
    notificationService.broadcastDashboardUpdate();

    res.json({ message: 'Counts finalized and inventory workstations updated successfully!' });
  } catch (err) {
    console.error('Finalize counts error:', err);
    res.status(400).send((err as Error).message);
  }
});

export default router;

