const db = require('../db');
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

console.log('DB connection info:', process.env.DB_NAME, process.env.DB_USER, process.env.DB_HOST);

(async () => {
  try {
    const res = await db.query('SELECT id, password_hash FROM users');
    for (const user of res.rows) {
      const { id, password_hash } = user;
      const newHash = await bcrypt.hash(password_hash, SALT_ROUNDS);
      await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, id]);
      console.log(`User ${id}: Password forcibly migrated to bcrypt.`);
    }
    console.log('Migration complete.');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
})(); 