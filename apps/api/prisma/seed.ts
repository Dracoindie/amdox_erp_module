import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Amdox ERP database...');

  // ── Admin user ──────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin@1234', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@amdox.com' },
    update: {},
    create: {
      email: 'admin@amdox.com',
      passwordHash: adminHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  console.log(`✓ Admin user: ${admin.email}`);

  // ── Departments ─────────────────────────────────────────────────────────────
  const engineering = await prisma.department.upsert({
    where: { name: 'Engineering' },
    update: {},
    create: { name: 'Engineering' },
  });
  const hr = await prisma.department.upsert({
    where: { name: 'Human Resources' },
    update: {},
    create: { name: 'Human Resources' },
  });
  await prisma.department.upsert({
    where: { name: 'Finance' },
    update: {},
    create: { name: 'Finance' },
  });
  console.log('✓ Departments seeded');

  // ── Employees ───────────────────────────────────────────────────────────────
  await prisma.employee.upsert({
    where: { email: 'alice@amdox.com' },
    update: {},
    create: {
      name: 'Alice Johnson',
      email: 'alice@amdox.com',
      departmentId: engineering.id,
      designation: 'Frontend Lead',
      grossSalary: 120000,
      joinDate: new Date('2024-01-15'),
      status: 'ACTIVE',
    },
  });
  await prisma.employee.upsert({
    where: { email: 'bob@amdox.com' },
    update: {},
    create: {
      name: 'Bob Smith',
      email: 'bob@amdox.com',
      departmentId: engineering.id,
      designation: 'Backend Developer',
      grossSalary: 95000,
      joinDate: new Date('2024-03-01'),
      status: 'ACTIVE',
    },
  });
  await prisma.employee.upsert({
    where: { email: 'carol@amdox.com' },
    update: {},
    create: {
      name: 'Carol White',
      email: 'carol@amdox.com',
      departmentId: hr.id,
      designation: 'HR Manager',
      grossSalary: 85000,
      joinDate: new Date('2023-06-01'),
      status: 'ACTIVE',
    },
  });
  console.log('✓ Employees seeded');

  // ── Products / Inventory ────────────────────────────────────────────────────
  const laptop = await prisma.product.upsert({
    where: { sku: 'SKU-1001' },
    update: {},
    create: {
      sku: 'SKU-1001',
      name: 'ThinkPad T14 Gen 3',
      category: 'Electronics',
      unitPrice: 1200,
      reorderLevel: 10,
    },
  });
  await prisma.product.upsert({
    where: { sku: 'SKU-1002' },
    update: {},
    create: {
      sku: 'SKU-1002',
      name: 'Ergonomic Office Chair',
      category: 'Furniture',
      unitPrice: 250,
      reorderLevel: 15,
    },
  });
  await prisma.product.upsert({
    where: { sku: 'SKU-1003' },
    update: {},
    create: {
      sku: 'SKU-1003',
      name: 'Wireless Mouse M720',
      category: 'Accessories',
      unitPrice: 40,
      reorderLevel: 30,
    },
  });
  await prisma.product.upsert({
    where: { sku: 'SKU-1004' },
    update: {},
    create: {
      sku: 'SKU-1004',
      name: '27-inch 4K Monitor',
      category: 'Electronics',
      unitPrice: 350,
      reorderLevel: 10,
    },
  });

  // ── Warehouse ───────────────────────────────────────────────────────────────
  const warehouse = await prisma.warehouse.upsert({
    where: { id: 'wh-main-001' },
    update: {},
    create: {
      id: 'wh-main-001',
      name: 'Main Warehouse',
      location: 'Bangalore, India',
    },
  });

  await prisma.stockLevel.upsert({
    where: { productId_warehouseId: { productId: laptop.id, warehouseId: warehouse.id } },
    update: {},
    create: { productId: laptop.id, warehouseId: warehouse.id, quantity: 45 },
  });
  console.log('✓ Inventory seeded');

  // ── Suppliers ───────────────────────────────────────────────────────────────
  await prisma.supplier.upsert({
    where: { id: 'sup-001' },
    update: {},
    create: {
      id: 'sup-001',
      name: 'TechCorp Distribution',
      email: 'orders@techcorp.io',
      leadTimeDays: 7,
      paymentTerms: 'Net 30',
    },
  });
  console.log('✓ Suppliers seeded');

  // ── Chart of Accounts ───────────────────────────────────────────────────────
  const accounts = [
    { code: '1000', name: 'Cash & Bank', type: 'asset' },
    { code: '1100', name: 'Accounts Receivable', type: 'asset' },
    { code: '1200', name: 'Inventory', type: 'asset' },
    { code: '2000', name: 'Accounts Payable', type: 'liability' },
    { code: '2100', name: 'Payroll Payable', type: 'liability' },
    { code: '2200', name: 'Tax Payable', type: 'liability' },
    { code: '3000', name: 'Owner Equity', type: 'equity' },
    { code: '4000', name: 'Revenue', type: 'income' },
    { code: '5000', name: 'Salaries Expense', type: 'expense' },
    { code: '5100', name: 'Operating Expenses', type: 'expense' },
  ];
  for (const acc of accounts) {
    await prisma.account.upsert({
      where: { code: acc.code },
      update: {},
      create: acc,
    });
  }
  console.log('✓ Chart of accounts seeded');

  // ── CRM: Customers & Leads ──────────────────────────────────────────────────
  const techCorp = await prisma.customer.upsert({
    where: { email: 'james@techcorp.io' },
    update: {},
    create: {
      name: 'James Carter',
      email: 'james@techcorp.io',
      phone: '+1-415-555-0101',
      company: 'TechCorp Solutions',
      assignedTo: 'Alice Johnson',
      tags: ['Enterprise', 'Q2 Target'],
    },
  });
  await prisma.lead.create({
    data: {
      customerId: techCorp.id,
      stage: 'PROPOSAL',
      value: 120000,
      assignedTo: 'Alice Johnson',
    },
  }).catch(() => {}); // idempotent skip
  console.log('✓ CRM data seeded');

  console.log('\n✅ Database seeded successfully!');
  console.log('   Admin login: admin@amdox.com / Admin@1234');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
