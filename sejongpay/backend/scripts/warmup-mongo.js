// Warm the mongodb-memory-server binary cache and verify a replica set actually launches.
// Run once so the ~600MB mongod binary is cached before the Jest concurrency suite runs.
// require() resolves mongodb-memory-server from sejongpay/backend/node_modules (walks up from this script dir).
const { MongoMemoryReplSet } = require('mongodb-memory-server');

(async () => {
  console.log('[warmup] creating MongoMemoryReplSet (downloads mongod binary on first run)...');
  const rs = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  console.log('[warmup] replica set up at', rs.getUri());
  await rs.stop();
  console.log('[warmup] done — mongod binary cached, replica set verified');
})().catch((e) => {
  console.error('[warmup] FAILED:', e && e.message ? e.message : e);
  process.exit(1);
});
