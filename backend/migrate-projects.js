const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://ikeamkudlburujwwiyvj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZWFta3VkbGJ1cnVqd3dpeXZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzA2NDY2NCwiZXhwIjoyMTAyNjQwNjY0fQ.8rLuHJly2hOuqoFYXytVAE-niXN_ItvtK_iuwUvSp7c';
const ORG_ID = 'a1b2c3d4-0000-0000-0000-000000000001';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { realtime: { transport: require('ws') } });

// Only using columns that exist: id,org_id,name,developer_name,location,location_lat,location_lng,
// rera_number,launch_date,possession_date,amenities,brochure_url,status,total_units,available_units,price_min,price_max
const PROJECTS = [
  { name:'Indiabulls Sky Forest', developer_name:'Indiabulls Real Estate', location:'Lower Parel, South Mumbai', rera_number:'P51900000812', price_min:90000000, price_max:1000000000, amenities:['Infinity pool','Sky lounge','Wellness spa','Private lift','Concierge','Helipad'], status:'active', possession_date:null, total_units:200, available_units:50 },
  { name:'Lodha World Towers', developer_name:'Lodha Group', location:'Lower Parel, South Mumbai', rera_number:'P51900000829', price_min:110000000, price_max:300000000, amenities:['Concierge','Infinity pool','Spa','Valet parking','Private dining','Sky bridge'], status:'active', possession_date:null, total_units:300, available_units:40 },
  { name:'Lodha Park', developer_name:'Lodha Group', location:'Lower Parel, South Mumbai', rera_number:'P51900001339', price_min:50000000, price_max:180000000, amenities:['6 swimming pools','Organic garden','Tea pavilion','Outdoor cinema','1 km jogging track','Multi-sport courts'], status:'active', possession_date:'2026-12-31', total_units:450, available_units:80 },
  { name:'Rustomjee Crown', developer_name:'Rustomjee', location:'Prabhadevi, South Mumbai', rera_number:'P51900003268', price_min:80000000, price_max:280000000, amenities:['Grand clubhouse','Infinity pool','Wellness centre','Private dining','Play village','EV charging'], status:'active', possession_date:'2026-06-30', total_units:380, available_units:65 },
  { name:'Aga Hall Estate', developer_name:'Prince Aly Khan Hospital Trust', location:'Mazgaon, South Mumbai', rera_number:'P51900004112', price_min:90000000, price_max:300000000, amenities:['Heritage gardens','Premium clubhouse','Swimming pool','High security','IGBC Gold certified','Medical concierge'], status:'upcoming', possession_date:'2027-12-31', total_units:120, available_units:100 },
  { name:'Monte South', developer_name:'Marathon Group & Adani Realty', location:'Byculla, South Mumbai', rera_number:'P51900001936', price_min:50000000, price_max:200000000, amenities:['2.5-acre amenity podium','Sand beach','Infinity pool','Sky lounge','Banquet hall','Business lounge'], status:'active', possession_date:'2026-06-30', total_units:600, available_units:120 },
  { name:'Piramal Aranya', developer_name:'Piramal Realty', location:'Byculla, South Mumbai', rera_number:'P51900003324', price_min:40000000, price_max:220000000, amenities:['Byculla Zoo views','Infinity pool','Spa','Gym','Jogging track','Play area'], status:'active', possession_date:'2026-12-31', total_units:400, available_units:90 },
  { name:'Piramal Mahalaxmi', developer_name:'Piramal Realty', location:'Mahalaxmi, South Mumbai', rera_number:'P51900015854', price_min:50000000, price_max:250000000, amenities:['Private lift','Infinity pool','Wellness club','Sky lounge','Concierge','Racecourse views'], status:'active', possession_date:'2026-12-31', total_units:350, available_units:75 },
  { name:'Runwal 7 Mahalaxmi', developer_name:'Runwal Group', location:'Upper Mahalaxmi, South Mumbai', rera_number:'P51900030012', price_min:45000000, price_max:150000000, amenities:['Infinity pool','Sky deck','Clubhouse','Fitness centre','Landscaped podium','Play area'], status:'upcoming', possession_date:'2027-12-31', total_units:280, available_units:250 },
];

async function migrate() {
  console.log('\n🏗️  G.H.A.R CRM — Portfolio Projects Migration\n');
  const { data: existing } = await sb.from('projects').select('name,rera_number').eq('org_id', ORG_ID);
  const existingNames = new Set((existing||[]).map(p=>p.name.toLowerCase()));
  const existingReras = new Set((existing||[]).map(p=>p.rera_number).filter(Boolean));
  let inserted=0, skipped=0;
  for (const p of PROJECTS) {
    if (existingNames.has(p.name.toLowerCase()) || existingReras.has(p.rera_number)) {
      console.log('  ⏭️  Skipped (exists): '+p.name); skipped++; continue;
    }
    const { data, error } = await sb.from('projects').insert({...p, org_id:ORG_ID}).select().single();
    if (error) { console.log('  ❌ Failed: '+p.name+' — '+error.message); }
    else { console.log('  ✅ Inserted: '+p.name+' ('+data.id+')'); inserted++; }
  }
  console.log('\n🎉 Done! Inserted: '+inserted+'  Skipped: '+skipped+'\n');
  process.exit(0);
}
migrate().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
