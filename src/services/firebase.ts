import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';

// Cache para fallback de valores presentes nos documentos .env
let envFileCache: Record<string, string> | null = null;

function getEnvFileFallback(key: string): string {
  if (envDocCacheLoaded) {
    return envFileCache?.[key] || '';
  }

  envFileCache = {};
  envDocCacheLoaded = true;

  try {
    // 1. Tenta carregar nativamente via Node.js loadEnvFile se disponível (Node 20+)
    if (typeof process !== 'undefined' && typeof (process as any).loadEnvFile === 'function') {
      try {
        (process as any).loadEnvFile('.env');
      } catch {}
    }
  } catch {}

  try {
    // 2. Faz o parsing direto dos arquivos .env e .env.local caso no ambiente Node
    if (typeof process !== 'undefined' && process.versions?.node) {
      const req = typeof (globalThis as any).require === 'function' ? (globalThis as any).require : null;
      if (req) {
        const fs = req('fs');
        const path = req('path');
        for (const envName of ['.env', '.env.local']) {
          const envPath = path.resolve(process.cwd(), envName);
          if (fs.existsSync(envPath)) {
            const lines = fs.readFileSync(envPath, 'utf8').split('\n');
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith('#')) continue;
              const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)$/);
              if (match) {
                let val = match[2];
                if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                  val = val.slice(1, -1);
                }
                envFileCache[match[1]] = val;
              }
            }
          }
        }
      }
    }
  } catch {}

  return envFileCache[key] || '';
}

let envDocCacheLoaded = false;

/**
 * Obtém o valor de configuração seguindo a nova regra de negócio:
 * - Valor padrão: Variáveis de ambiente (process.env no Node/Netlify ou import.meta.env no Vite)
 * - Fallback: Valor presente nos documentos .env locais (sem expor secrets diretamente no código)
 */
export const getEnvVar = (key: string, customFallback?: string): string => {
  // 1. Valor padrão: Variáveis de ambiente do host/sistema
  try {
    if (typeof process !== 'undefined' && process?.env && process.env[key]) {
      return process.env[key]!;
    }
  } catch {}

  try {
    if (typeof import.meta !== 'undefined' && import.meta?.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch {}

  // 2. Fallback: Valor presente nos documentos .env
  const fromEnvDoc = getEnvFileFallback(key);
  if (fromEnvDoc) {
    return fromEnvDoc;
  }

  // 3. Fallback adicional se fornecido
  return customFallback || '';
};

const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID'),
  databaseURL: getEnvVar('VITE_FIREBASE_DATABASE_URL')
};

// Initialize Firebase App singleton
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();

