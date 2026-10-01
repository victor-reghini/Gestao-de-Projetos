import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Automatically load .env if process.env.PGPASSWORD is not set
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

const host = process.env.PGHOST || '34.181.161.180';
const port = parseInt(process.env.PGPORT || '5432', 10);
const database = process.env.PGDATABASE || 'gestao-projetos-ea44c-database';
const user = process.env.PGUSER || 'postgres';
const password = process.env.PGPASSWORD;

if (!password) {
  console.log('\n⚠️  PGPASSWORD não definido no .env.');
  console.log('💡 Para carregar diretamente via terminal:');
  console.log('   PGPASSWORD="sua_senha" node scripts/seed-cloudsql.mjs\n');
  process.exit(0);
}

const client = new pg.Client({
  host,
  port,
  database,
  user,
  password,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000
});

async function main() {
  try {
    console.log(`🔌 Conectando ao Cloud SQL em ${host}:${port}/${database}...`);
    await client.connect();
    console.log('✅ Conexão estabelecida com sucesso!');

    const sqlPath = path.join(__dirname, 'cloudsql_insert_all_data.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🚀 Executando inserção dos dados...');
    const res = await client.query(sql);

    // If result is an array of results, log the last query (verification summary)
    const lastRes = Array.isArray(res) ? res[res.length - 1] : res;
    if (lastRes && lastRes.rows) {
      console.log('\n📊 Resumo dos dados inseridos no Cloud SQL:');
      console.table(lastRes.rows);
    }

    console.log('🎉 Todos os dados foram inseridos com sucesso no Google Cloud SQL!');
  } catch (err) {
    console.error('❌ Erro ao executar carga no Cloud SQL:', err.message);
  } finally {
    await client.end();
  }
}

main();
