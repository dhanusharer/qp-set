import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
const users = await p.user.findMany({
  select: {
    id: true,
    username: true,
    role: true,
    name: true,
    dept: true,
    email: true,
    hodId: true,
  }
});
console.log('All Users in DB:', users);
await p.$disconnect();

