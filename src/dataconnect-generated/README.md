# Firebase Data Connect Generated SDK

This SDK was generated for the Data Connect service `gestao-projetos-service` connected to PostgreSQL on Cloud SQL (`gestao-projetos-ea44c:us-east4:gestao-projetos-ea44c-instance`).

## Connector Configuration

- **Connector:** `default`
- **Service:** `gestao-projetos-service`
- **Location:** `us-east4`
- **Host:** `34.181.161.180`
- **Port:** `5432`

## Usage

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { app } from '../config/firebase';
import { connectorConfig, upsertTask, listTasksByProject } from './esm/index.esm.js';

const dataConnect = getDataConnect(app, connectorConfig);

// Execute Mutation
await upsertTask(dataConnect, {
  id: 'task-123',
  title: 'Minha Atividade',
  projectId: 'proj-1',
  columnId: 'todo',
  status: 'A Fazer'
});
```
