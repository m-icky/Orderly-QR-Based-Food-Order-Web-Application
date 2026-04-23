async function testLogin() {
  const loginData = {
    email: 'superadmin@orderly.com',
    password: 'superadmin123'
  };

  console.log('Attempting login with:', loginData.email);

  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginData)
    });

    const data = await response.json();

    if (response.ok) {
      console.log('Login successful!');
      console.log('Response Status:', response.status);
      console.log('Token received:', data.token ? 'Yes' : 'No');
      console.log('User Role:', data.user.role);
    } else {
      console.error('Login failed.');
      console.error('Status:', response.status);
      console.error('Message:', data.message);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testLogin();
