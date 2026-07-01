const assert = require('assert');

(async () => {
  const { logger } = await import('../src/config/logger.js');
  assert.strictEqual(typeof logger.info, 'function');
  assert.strictEqual(typeof logger.warn, 'function');
  assert.strictEqual(typeof logger.error, 'function');
  assert.strictEqual(typeof logger.debug, 'function');
  console.log('Logger helper test passed');
})();
