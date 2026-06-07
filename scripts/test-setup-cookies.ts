/**
 * test-setup-cookies.ts — (اختبار فقط) يجهّز مستخدمين ويولّد NextAuth JWT cookies للعزل.
 * يكتب /tmp/cookieA.txt (الأدمن) و /tmp/cookieB.txt (مستخدم تاني).
 *   NEXTAUTH_SECRET=... ADMIN_EMAIL=... DATABASE_URL="file:..." bun scripts/test-setup-cookies.ts
 */
import { PrismaClient } from '@prisma/client';
import { encode } from 'next-auth/jwt';
import { writeFileSync } from 'fs';
import { bootstrapNewUser } from '../src/lib/workspace-defaults';

const db = new PrismaClient();
const DEFAULT_USER_ID = 'cmp4wfs1q0000jkubmtfn4mhc';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'quantaacademy12@gmail.com').toLowerCase();
const B_EMAIL = 'testb-isolation@example.com';
const secret = process.env.NEXTAUTH_SECRET || '';

async function mint(uid: string, email: string, name: string) {
  return encode({ token: { uid, email, name, sub: uid }, secret });
}

async function main() {
  if (!secret) throw new Error('NEXTAUTH_SECRET missing');

  // (A) الأدمن يتبنّى الـ legacy
  await db.user.update({ where: { id: DEFAULT_USER_ID }, data: { email: ADMIN_EMAIL } });

  // (B) مستخدم تاني + bootstrap
  let userB = await db.user.findUnique({ where: { email: B_EMAIL } });
  if (!userB) {
    userB = await db.user.create({ data: { email: B_EMAIL, name: 'Tester B' } });
    await bootstrapNewUser(db, userB.id);
    console.log('[test] created user B', userB.id);
  } else {
    console.log('[test] user B exists', userB.id);
  }

  const cookieA = await mint(DEFAULT_USER_ID, ADMIN_EMAIL, 'Admin');
  const cookieB = await mint(userB.id, B_EMAIL, 'Tester B');
  writeFileSync('/tmp/cookieA.txt', cookieA);
  writeFileSync('/tmp/cookieB.txt', cookieB);
  writeFileSync('/tmp/userB.txt', userB.id);

  console.log('[test] admin id:', DEFAULT_USER_ID);
  console.log('[test] userB id:', userB.id);
  console.log('[test] cookies written to /tmp/cookie{A,B}.txt');
  await db.$disconnect();
}

main().catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
