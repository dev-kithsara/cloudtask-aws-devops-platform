import { PrismaClient, Priority } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const email = 'demo@cloudtask.local';
const passwordHash = await bcrypt.hash('DemoPassword123!', 12);
const user = await prisma.user.upsert({
  where: { email },
  update: {},
  create: { email, passwordHash },
});
await prisma.task.createMany({
  data: [
    { title: 'Review Terraform plan', priority: Priority.HIGH, userId: user.id },
    { title: 'Capture architecture evidence', priority: Priority.MEDIUM, userId: user.id },
  ],
  skipDuplicates: true,
});
await prisma.$disconnect();
