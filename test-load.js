#!/usr/bin/env node
try {
  console.log('Loading database module...');
  require('./lib/database');
  console.log('✓ Database module loaded successfully');
  process.exit(0);
} catch (err) {
  console.error('✗ Failed to load database module:', err.message);
  console.error(err.stack);
  process.exit(1);
}
