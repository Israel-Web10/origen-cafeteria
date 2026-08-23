require('dotenv').config();
const app = require('./app');
const { checkConnection } = require('./config/db');

const PORT = process.env.PORT || 4000;

app.listen(PORT, async () => {
  console.log(`[server] ORIGEN backend escuchando en http://localhost:${PORT}`);
  await checkConnection();
});
