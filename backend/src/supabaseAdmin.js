const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

// Service role client — bypasses RLS, used for backend operations
// ws is required for Node.js < 22 which lacks native WebSocket support
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: {
      transport: ws,
    },
  }
);

module.exports = { supabaseAdmin };
