const bcrypt = require('bcryptjs');

const password = 'superadmin123';
const hashInSchema = '$2a$12$rfneTWcwHonq2DoI3mMF8.AsBW66sIOttkQu6vwq9uyJQsECXnooS';

bcrypt.compare(password, hashInSchema).then(res => {
    console.log('Comparison result with Schema Hash:', res);
});

bcrypt.hash(password, 12).then(hash => {
    console.log('Newly generated hash:', hash);
});
