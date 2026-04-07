const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./db');
const User = require('../models/User');

const seed = async () => {
  await connectDB();

  const existing = await User.findOne({ role: 'super_admin' });
  if (existing) {
    console.log('Super admin already exists.');
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash('superadmin123', 12);
  await User.create({
    name: 'Super Admin',
    email: 'superadmin@orderly.com',
    password: hashedPassword,
    role: 'super_admin',
  });

  console.log('✅ Super Admin created:');
  console.log('   Email: superadmin@orderly.com');
  console.log('   Password: superadmin123');
  process.exit(0);
};

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
