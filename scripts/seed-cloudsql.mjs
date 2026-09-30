import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const host = process.env.PGHOST || '34.181.161.180';
const port = parseInt(process.env.PGPORT || '5432', 10);
const database = process.env.PGDATABASE || 'postgres';
const user = process.env.PGUSER || 'postgres';
const password = process.env.PGPASSWORD;

if (!password) {
  console.log('\n⚠️  PGPASSWORD não definido no .env.');
  console.log('💡 Para carregar diretamente via terminal:');
  console.log('   PGPASSWORD="sua_senha" node scripts/seed-cloudsql.mjs\n');
  console.log('📄 Ou copie e cole o conteúdo de "scripts/cloudsql_insert_all_data.sql"');
  console.log('   diretamente no Cloud SQL Studio do Google Cloud Console e clique em Executar!\n');
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
    await client.query(sql);

    console.log('🎉 Todos os dados foram inseridos com sucesso no Google Cloud SQL!');
  } catch (err) {
    console.error('❌ Erro ao executar carga no Cloud SQL:', err.message);
  } finally {
    await client.end();
  }
}

main();
