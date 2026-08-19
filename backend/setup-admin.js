/**
 * G.H.A.R CRM — One-Time Admin Setup Script
 * Run this ONCE after running the 3 SQL migrations.
 * Usage: node setup-admin.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: ws },
  }
);

const ADMIN = {
  name:     'Admin User',
  email:    'admin@ghar.in',
  password: 'Admin@1234',
  phone:    '+91 9000000001',
  role:     'admin',
};

const ORG_ID = 'a1b2c3d4-0000-0000-0000-000000000001';

async function setup() {
  console.log('\n🏠 G.H.A.R CRM — Admin Setup\n');

  // ── Step 1: Check org exists ────────────────────────────────────────────
  console.log('1️⃣  Checking organization record...');
  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', ORG_ID)
    .single();

  if (orgErr || !org) {
    console.error('❌  Organization not found!');
    console.error('   → Please run the 3 SQL migration files in Supabase first:');
    console.error('   → 001_core_schema.sql → 002_rls_policies.sql → 003_seed_data.sql');
    process.exit(1);
  }
  console.log(`   ✅ Found org: "${org.name}"`);

  // ── Step 2: Create Supabase Auth user ──────────────────────────────────
  console.log(`\n2️⃣  Creating auth user: ${ADMIN.email}...`);
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email:            ADMIN.email,
    password:         ADMIN.password,
    email_confirm:    true,
  });

  let userId;
  if (authErr) {
    if (authErr.message?.includes('already been registered') || authErr.code === 'email_exists') {
      console.log('   ℹ️  Auth user already exists, looking up ID...');
      // List users and find the matching one
      const { data: users } = await supabase.auth.admin.listUsers();
      const existing = users?.users?.find(u => u.email === ADMIN.email);
      if (!existing) {
        console.error('   ❌ Could not find existing auth user. Please delete and re-run.');
        process.exit(1);
      }
      userId = existing.id;
      console.log(`   ✅ Found existing auth user (ID: ${userId})`);
    } else {
      console.error('   ❌ Failed to create auth user:', authErr.message);
      process.exit(1);
    }
  } else {
    userId = authData.user.id;
    console.log(`   ✅ Auth user created (ID: ${userId})`);
  }

  // ── Step 3: Insert into users table ────────────────────────────────────
  console.log('\n3️⃣  Creating user profile in CRM database...');
  const { data: profile, error: profileErr } = await supabase
    .from('users')
    .upsert({
      id:     userId,
      org_id: ORG_ID,
      name:   ADMIN.name,
      email:  ADMIN.email,
      phone:  ADMIN.phone,
      role:   ADMIN.role,
      status: 'active',
    }, { onConflict: 'id' })
    .select()
    .single();

  if (profileErr) {
    console.error('   ❌ Failed to create user profile:', profileErr.message);
    process.exit(1);
  }
  console.log(`   ✅ Profile created: ${profile.name} (${profile.role})`);

  // ── Done! ────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(50));
  console.log('🎉  Setup complete! You can now log in:');
  console.log('─'.repeat(50));
  console.log(`   🌐 URL:      http://localhost:5173/login`);
  console.log(`   📧 Email:    ${ADMIN.email}`);
  console.log(`   🔑 Password: ${ADMIN.password}`);
  console.log('─'.repeat(50) + '\n');
}

setup().catch(err => {
  console.error('Unexpected error:', err.message);
  process.exit(1);
});
