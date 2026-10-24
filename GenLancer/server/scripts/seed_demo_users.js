import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in server/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const DEMO_ACCOUNTS = [
  {
    email: 'creator@genlancer.io',
    password: 'pass123456',
    role: 'freelancer',
    fullName: 'Aarav Sharma',
    metadata: {
      role: 'freelancer',
      full_name: 'Aarav Sharma',
      specialization: 'AI Pipeline Developer'
    }
  },
  {
    email: 'brand@genlancer.io',
    password: 'pass123456',
    role: 'company',
    fullName: 'Apex Creative Agency',
    metadata: {
      role: 'company',
      full_name: 'Apex Creative Agency',
      company_name: 'Apex Creative Agency'
    }
  }
];

async function seed() {
  console.log('--- GenLancer Demo Users Seed Script ---');

  for (const acc of DEMO_ACCOUNTS) {
    const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) {
      console.error(`Error listing users: ${listErr.message}`);
      process.exit(1);
    }

    const existing = users.find(u => u.email.toLowerCase() === acc.email.toLowerCase());

    if (existing) {
      console.log(`Updating existing demo account: ${acc.email} (${acc.role})...`);
      const { error: updateErr } = await supabase.auth.admin.updateUserById(existing.id, {
        password: acc.password,
        email_confirm: true,
        user_metadata: acc.metadata,
        app_metadata: { role: acc.role, provider: 'email' }
      });
      if (updateErr) {
        console.error(`Failed to update ${acc.email}:`, updateErr.message);
      } else {
        console.log(`✓ Updated ${acc.email}`);
      }
    } else {
      console.log(`Creating new demo account: ${acc.email} (${acc.role})...`);
      const { data, error: createErr } = await supabase.auth.admin.createUser({
        email: acc.email,
        password: acc.password,
        email_confirm: true,
        user_metadata: acc.metadata,
        app_metadata: { role: acc.role, provider: 'email' }
      });
      if (createErr) {
        console.error(`Failed to create ${acc.email}:`, createErr.message);
      } else {
        console.log(`✓ Created ${acc.email} (ID: ${data.user.id})`);
      }
    }
  }

  console.log('Demo accounts seeded and verified successfully.');
}

seed();
