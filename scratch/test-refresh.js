import fetch from 'node-fetch';

async function testRefresh() {
  const loginRes = await fetch('http://localhost:4005/api/auth/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'infano@admin.com', password: 'Infano@2026' })
  });
  
  if (!loginRes.ok) {
    console.log('Login failed', await loginRes.text());
    return;
  }
  
  const loginData = await loginRes.json();
  console.log('Login success');
  
  const refreshRes = await fetch('http://localhost:4005/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: loginData.refreshToken })
  });
  
  console.log('Refresh status:', refreshRes.status);
  const text = await refreshRes.text();
  console.log('Refresh body:', text);
}

testRefresh();
