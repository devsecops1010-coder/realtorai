import { PrismaClient, UserRole, UserStatus, TenantStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.PLATFORM_ADMIN_EMAIL ?? 'admin@realtorai.local';
  const adminPassword = process.env.PLATFORM_ADMIN_PASSWORD ?? 'ChangeMeNow1!';

  const existing = await prisma.user.findFirst({
    where: { email: adminEmail.toLowerCase(), role: UserRole.platform_admin },
  });
  if (existing) {
    // eslint-disable-next-line no-console
    console.log(`Platform admin ${adminEmail} already exists (id=${existing.id})`);
    return;
  }

  const tenant = await prisma.tenant.create({
    data: {
      name: 'Realtorai Platform',
      status: TenantStatus.active,
      plan: 'platform',
    },
  });

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: 'Platform Admin',
      email: adminEmail.toLowerCase(),
      role: UserRole.platform_admin,
      status: UserStatus.active,
      passwordHash,
    },
  });

  // eslint-disable-next-line no-console
  console.log(`Seeded platform_admin: ${admin.email} (tenantId=${tenant.id})`);
  // eslint-disable-next-line no-console
  console.log(`Password: ${adminPassword === 'ChangeMeNow1!' ? 'ChangeMeNow1! — CHANGE IT' : '(from env)'}`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
