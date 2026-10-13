# 🔥 Configurações e Regras do Firebase - Gestão de Projetos

Este documento consolida todas as regras de segurança, indexação, configurações de ambiente e instruções de deploy para o Firebase do projeto **Gestão de Projetos** (`gestao-projetos-ea44c`).

---

## 1. ⚙️ Variáveis de Ambiente & Credenciais

As configurações do Firebase no frontend (`src/services/firebase.ts`) utilizam as variáveis de ambiente abaixo (definidas em `.env` ou nas configurações de build do Netlify/Vercel):

```env
# Firebase Configuration (Frontend)
VITE_FIREBASE_API_KEY=AIzaSyBjRfirLy7Rcstm5yAA36EHzlrIxIgLS04
VITE_FIREBASE_AUTH_DOMAIN=gestao-projetos-ea44c.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=gestao-projetos-ea44c
VITE_FIREBASE_STORAGE_BUCKET=gestao-projetos-ea44c.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=947089271740
VITE_FIREBASE_APP_ID=1:947089271740:web:97823942e9df0e58cf59b9
VITE_FIREBASE_DATABASE_URL=https://gestao-projetos-ea44c-default-rtdb.firebaseio.com
```

---

## 2. ⚡ Firebase Realtime Database (`database.rules.json`)

Utilizado para **sincronização bidirecional em tempo real** entre abas, navegadores e múltiplos usuários.

### Regras JSON:
```json
{
  "rules": {
    ".read": true,
    ".write": true,
    "projects": {
      "$projectId": {
        ".read": true,
        ".write": true,
        "tasks": {
          ".indexOn": ["columnId", "position", "updatedAt", "projectId"]
        },
        "columns": {
          ".indexOn": ["position", "projectId"]
        },
        "_syncInfo": {
          ".indexOn": ["lastSyncAt", "taskCount"]
        }
      }
    }
  }
}
```

### Explicação das Regras:
- **Índices (`.indexOn`):** Aceleram consultas por `columnId`, ordenação por `position` no quadro Kanban e verificação de timestamp `updatedAt` / `lastSyncAt`.
- **Projetos Públicos & Privados:** Permite leitura e escrita no nó `projects/$projectId` para manter o live sync responsivo, com fila de sincronização offline e fallback automático em caso de desconexão.

---

## 3. 📦 Firebase Storage (`storage.rules`)

Utilizado para armazenamento de fotos de perfil (avatars), capturas de tela anexadas aos relatórios de bugs e anexos de tarefas.

### Regras de Segurança:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // 1. Avatars de Usuários (Leitura pública, escrita restrita a imagens até 5MB)
    match /avatars/{fileName} {
      allow read: if true;
      allow write: if request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }

    // 2. Screenshots de Bug Reports (Leitura pública, envio de prints até 10MB)
    match /bug-reports/{fileName} {
      allow read: if true;
      allow write: if request.resource.size < 10 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }

    // 3. Anexos de Projetos e Documentos (Até 25MB)
    match /attachments/{projectId}/{fileName} {
      allow read: if true;
      allow write: if request.resource.size < 25 * 1024 * 1024;
    }

    // 4. Regra Geral para Usuários Autenticados
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### Fallback Automático no Código:
Se o Firebase Storage não estiver acessível (`storage/unknown`), o serviço `src/services/dbService.ts` converte a imagem automaticamente para **Base64 Data URL**, impedindo que a aplicação trave.

---

## 4. 🗄️ Firebase Data Connect / Cloud SQL (`dataconnect/dataconnect.yaml`)

O serviço conecta o Firebase diretamente à instância **Google Cloud SQL PostgreSQL**:
- **Instância:** `gestao-projetos-ea44c-instance`
- **Banco de Dados:** `postgres`
- **Região:** `us-east4`
- **Service ID:** `gestao-projetos-service`

---

## 5. 🚀 Comandos de Deploy via Firebase CLI

Para aplicar todas as regras e configurações diretamente no Firebase Console via terminal:

```bash
# 1. Login no Firebase CLI (se necessário)
npx firebase-tools login

# 2. Selecionar o projeto
npx firebase-tools use gestao-projetos-ea44c

# 3. Fazer deploy de todas as regras (Database + Storage + Firestore + DataConnect)
npx firebase-tools deploy --only database,storage,firestore,dataconnect

# 4. Ou fazer deploy individual:
npx firebase-tools deploy --only database   # Apenas Realtime Database
npx firebase-tools deploy --only storage    # Apenas Firebase Storage
```
