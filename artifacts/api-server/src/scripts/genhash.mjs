import bcrypt from 'bcryptjs';
const hash = await bcrypt.hash('password123', 10);
console.log(hash);
