import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Automatically load .env if DATABASE_URL_UNPOOLED / DATABASE_URL is not set
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)$/);
      if (match) {
        const key = match[1];
        let val = match[2];
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}
loadEnv();

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!connectionString) {
  console.log('\n⚠️  DATABASE_URL ou DATABASE_URL_UNPOOLED não definida no .env.');
  console.log('💡 Defina a string de conexão do NeonDB no arquivo .env antes de executar o seed.\n');
  process.exit(0);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000
});

async function main() {
  try {
    const host = new URL(connectionString).hostname;
    console.log(`🔌 Conectando ao NeonDB em ${host}...`);
    await client.connect();
    console.log('✅ Conexão estabelecida com sucesso!');

    const schemaPath = path.join(__dirname, 'neon_schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      console.log('🛠️  Garantindo schema no NeonDB...');
      await client.query(schemaSql);
    }

    const sqlPath = path.join(__dirname, 'cloudsql_insert_all_data.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🚀 Executando carga de dados iniciais...');
    const res = await client.query(sql);

    const lastRes = Array.isArray(res) ? res[res.length - 1] : res;
    if (lastRes && lastRes.rows) {
      console.log('\n📊 Resumo dos dados no NeonDB:');
      console.table(lastRes.rows);
    }

    console.log('🎉 Todos os dados foram aplicados com sucesso no NeonDB!');
  } catch (err) {
    console.error('❌ Erro ao executar carga no NeonDB:', err.message);
  } finally {
    await client.end();
  }
}

main();
