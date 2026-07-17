import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const p = new PrismaClient();
const user = await p.user.findUnique({ where: { username: 'hod_cse' } });

if (!user) {
  console.log('User not found!');
} else {
  console.log('User found:', user.username, user.role);
  console.log('Password hash:', user.passwordHash);
  
  const test1 = await bcrypt.compare('hod@2024', user.passwordHash);
  console.log('Password "hod@2024" matches:', test1);
  
  const test2 = await bcrypt.compare('amcec@2024', user.passwordHash);
  console.log('Password "amcec@2024" matches:', test2);
}

await p.$disconnect();
