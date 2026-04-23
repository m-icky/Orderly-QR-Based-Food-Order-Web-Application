const bcrypt = require('bcryptjs');

const password = 'superadmin123';
const hash = '$2a$12$rfneTWcwHonq2DoI3mMF8.AsBW66sIOttkQu6vwq9uyJQsECXnooS';

console.log('Comparing...');
bcrypt.compare(password, hash).then(res => {
    console.log('Match:', res);
}).catch(err => {
    console.error('Error:', err);
});
