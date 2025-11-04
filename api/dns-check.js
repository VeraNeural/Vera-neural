const dns = require('dns').promises;

module.exports = async (req, res) => {
  console.log('[dns-check] Starting connectivity tests');
  
  const results = {};

  // Test DNS resolution to Supabase pooler
  try {
    console.log('[dns-check] Resolving aws-1-us-east-1.pooler.supabase.com');
    const addresses = await dns.resolve4('aws-1-us-east-1.pooler.supabase.com');
    results.supabasePooler = {
      success: true,
      addresses: addresses
    };
    console.log('[dns-check] DNS resolution successful:', addresses);
  } catch (error) {
    results.supabasePooler = {
      success: false,
      error: error.message
    };
    console.error('[dns-check] DNS resolution failed:', error.message);
  }

  // Test to db.supabase.co (direct database)
  try {
    console.log('[dns-check] Resolving db.supabase.co');
    const addresses = await dns.resolve4('db.supabase.co');
    results.supabaseDb = {
      success: true,
      addresses: addresses
    };
    console.log('[dns-check] DNS resolution successful:', addresses);
  } catch (error) {
    results.supabaseDb = {
      success: false,
      error: error.message
    };
    console.error('[dns-check] DNS resolution failed:', error.message);
  }

  res.status(200).json(results);
};
