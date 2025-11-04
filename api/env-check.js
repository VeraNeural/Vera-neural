module.exports = async (req, res) => {
  console.log('[env-check] Environment variables check:');
  console.log('[env-check] POSTGRES_URL_NON_POOLING:', process.env.POSTGRES_URL_NON_POOLING ? 'SET' : 'NOT SET');
  console.log('[env-check] POSTGRES_URL:', process.env.POSTGRES_URL ? 'SET' : 'NOT SET');
  console.log('[env-check] DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
  console.log('[env-check] PGSSLMODE:', process.env.PGSSLMODE);
  console.log('[env-check] NODE_ENV:', process.env.NODE_ENV);
  console.log('[env-check] VERCEL_ENV:', process.env.VERCEL_ENV);
  
  // Log the actual connection string (masked for security)
  const connStr = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (connStr) {
    const masked = connStr.replace(/:[^@]*@/, ':***@');
    console.log('[env-check] Using connection string:', masked);
  }

  res.status(200).json({
    hasPostgresUrlNonPooling: !!process.env.POSTGRES_URL_NON_POOLING,
    hasPostgresUrl: !!process.env.POSTGRES_URL,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    pgsslmode: process.env.PGSSLMODE,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV
  });
};
