const axios = require('axios');
require('dotenv').config({ path: './backend/.env' });

const API_URL = 'http://localhost:5000/api';

async function testRoutes() {
    console.log('Testing GET /api/food/admin/me (with token)');
    // We need a valid token. Let's assume we can get one or just check the 404 behavior.
    
    console.log('\nTesting GET /api/food/SOME_SHOP_ID (which frontend calls)');
    try {
        const res = await axios.get(`${API_URL}/food/some-uuid`);
        console.log('GET /food/uuid status:', res.status);
    } catch (err) {
        console.log('GET /food/uuid failed as expected:', err.response?.status, err.response?.data);
    }

    console.log('\nTesting POST /api/food');
    try {
        const res = await axios.post(`${API_URL}/food`, {});
        console.log('POST /food status:', res.status);
    } catch (err) {
        console.log('POST /food status:', err.response?.status, err.response?.data);
    }
}

testRoutes();
