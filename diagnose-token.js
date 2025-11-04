#!/usr/bin/env node
/**
 * Debug magic link token issue
 */

const crypto = require('crypto');
const { getMagicLink, createMagicLink } = require('./lib/database');

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function getExpirationTime() {
  const now = new Date();
  now.setHours(now.getHours() + 1);
  return now;
}

async function diagnose() {
  console.log('\n🔍 MAGIC LINK DIAGNOSTIC\n');

  try {
    // Generate a test token
    const testToken = generateToken();
    const expiresAt = getExpirationTime();
    
    console.log('✅ Generated test token:', testToken.substring(0, 20) + '...');
    console.log('✅ Expires at:', expiresAt);

    // Create magic link in database
    console.log('\n📝 Creating magic link in database...');
    const created = await createMagicLink('test@diagnostic.com', testToken, expiresAt);
    console.log('✅ Magic link created:', created ? 'YES' : 'NO');

    // Retrieve it immediately
    console.log('\n🔎 Retrieving magic link from database...');
    const retrieved = await getMagicLink(testToken);
    
    if (retrieved) {
      console.log('✅ FOUND! Token is in database');
      console.log('   Email:', retrieved.email);
      console.log('   Token matches:', retrieved.token === testToken);
      console.log('   Expires at:', retrieved.expires_at);
      console.log('   Used:', retrieved.used);
    } else {
      console.log('❌ NOT FOUND - Token not in database!');
      console.log('   This could mean:');
      console.log('   1. Database connection failed');
      console.log('   2. Token was already marked as used');
      console.log('   3. Token expired');
    }

    console.log('\n✅ Diagnostic complete\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

diagnose();
