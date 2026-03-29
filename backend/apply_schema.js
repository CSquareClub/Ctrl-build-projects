const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const runSchema = async () => {
  const connectionString = 'postgresql://postgres:[papa&mummy@2005]@db.qvafeexkjmylncaeisri.supabase.co:5432/postgres';
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false } // Required for external Supabase connections
  });

  try {
    console.log('Connecting to Supabase Database...');
    await client.connect();
    
    console.log('Reading supabase_schema.sql...');
    const sqlPath = path.join(__dirname, '../supabase_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Executing SQL...');
    await client.query(sql);
    console.log('✅ Schema successfully applied to Supabase!');
  } catch (err) {
    console.error('❌ Failed to apply schema:', err.message);
  } finally {
    await client.end();
  }
};

runSchema();
