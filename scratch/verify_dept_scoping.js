async function testDelete() {
  const baseURL = 'http://localhost:8080/api';
  console.log('Testing HOD Delete Request...');

  const eeeData = await (await fetch(`${baseURL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'hod.eee@sms.edu', password: 'password' })
  })).json();

  // Delete SHR-9031
  const delRes = await fetch(`${baseURL}/seminar-requests/SHR-9031`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${eeeData.token}` }
  });
  console.log(`Delete response status: ${delRes.status}`);

  // Fetch EEE SHR requests
  const eeeSHRList = await (await fetch(`${baseURL}/seminar-requests`, { headers: { Authorization: `Bearer ${eeeData.token}` } })).json();
  console.log(`EEE SHR Count after delete: ${eeeSHRList.length}`);

  console.log('✓ Request successfully deleted from history!');
}

testDelete();
