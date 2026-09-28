const { db } = require('../dist/db/db');
const bcrypt = require('bcryptjs');

async function seedElectrician() {
  try {
    let elecRole = await db.get("SELECT id FROM roles WHERE name = 'ROLE_ELECTRICIAN'");
    if (!elecRole) {
      const maxRole = await db.get("SELECT MAX(id) as max_id FROM roles");
      const nextRoleId = ((maxRole?.max_id || 11) + 1);
      await db.run("INSERT INTO roles (id, name) VALUES (?, 'ROLE_ELECTRICIAN')", [nextRoleId]);
      elecRole = await db.get("SELECT id FROM roles WHERE name = 'ROLE_ELECTRICIAN'");
    }
    console.log('ROLE_ELECTRICIAN:', elecRole);

    const hash = await bcrypt.hash('nrtec@nec', 10);
    const existing = await db.get("SELECT id, email FROM users WHERE email = 'electrician@sms.edu'");
    if (!existing) {
      await db.run(
        "INSERT INTO users (name, email, password, role_id, department_id, active) VALUES (?, ?, ?, ?, 3, true)",
        ['Campus Electrician', 'electrician@sms.edu', hash, elecRole.id]
      );
      console.log('Created electrician@sms.edu user with role', elecRole.id);
    } else {
      await db.run("UPDATE users SET role_id = ? WHERE email = 'electrician@sms.edu'", [elecRole.id]);
      console.log('Updated electrician@sms.edu user');
    }

    const elecTableItem = await db.get("SELECT id FROM electricians WHERE name = 'Campus Electrician'");
    if (!elecTableItem) {
      await db.run("INSERT INTO electricians (name) VALUES ('Campus Electrician')");
      console.log('Inserted Campus Electrician into electricians table');
    }
  } catch (err) {
    console.error('Error seeding electrician:', err);
  }
}

seedElectrician().then(() => process.exit(0));
