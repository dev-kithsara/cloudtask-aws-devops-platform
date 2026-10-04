import { PrismaClient } from '@prisma/client';
import type { DataStore } from './types.js';

export class PrismaDataStore implements DataStore {
  private readonly prisma = new PrismaClient();
  connect = () => this.prisma.$connect();
  disconnect = () => this.prisma.$disconnect();
  user = {
    findByEmail: (email: string) => this.prisma.user.findUnique({ where: { email } }),
    create: (email: string, passwordHash: string) =>
      this.prisma.user.create({ data: { email, passwordHash } }),
  };
  task = {
    list: (userId: string) =>
      this.prisma.task.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    find: (id: string, userId: string) => this.prisma.task.findFirst({ where: { id, userId } }),
    create: (input: Parameters<DataStore['task']['create']>[0]) =>
      this.prisma.task.create({ data: input }),
    update: async (
      id: string,
      userId: string,
      input: Parameters<DataStore['task']['update']>[2],
    ) => {
      const result = await this.prisma.task.updateMany({ where: { id, userId }, data: input });
      return result.count ? this.prisma.task.findUnique({ where: { id } }) : null;
    },
    delete: async (id: string, userId: string) =>
      (await this.prisma.task.deleteMany({ where: { id, userId } })).count > 0,
  };
}
