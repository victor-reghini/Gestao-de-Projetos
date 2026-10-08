import { describe, it, expect } from 'vitest';
import {
  connectorConfig,
  upsertTaskRef,
  upsertTask,
  deleteTaskRef,
  deleteTask,
  listTasksByProjectRef,
  listTasksByProject,
  upsertProjectRef,
  upsertProject,
  deleteProjectRef,
  deleteProject,
  listProjectsRef,
  listProjects,
  upsertProjectColumnRef,
  upsertProjectColumn,
  deleteProjectColumnRef,
  deleteProjectColumn,
  listProjectColumnsRef,
  listProjectColumns
} from '../dataconnect-generated/esm/index.esm.js';
import { app, auth, rtdb, storage } from '../config/firebase';
import { dcUpsertTask, dcDeleteTask, dcUpsertColumn, dcUpsertProject } from '../config/dataconnect';
import { DataConnectService } from '../services/dataConnectService';

describe('Firebase Data Connect Integration Suite', () => {
  it('has correct connectorConfig with provided Cloud SQL service and region', () => {
    expect(connectorConfig).toBeDefined();
    expect(connectorConfig.connector).toBe('default');
    expect(connectorConfig.service).toBe('gestao-projetos-service');
    expect(connectorConfig.location).toBe('us-east4');
  });

  it('exports valid SDK references and mutation functions matching user screenshot structure', () => {
    expect(typeof upsertTaskRef).toBe('function');
    expect(upsertTaskRef.operationName).toBe('UpsertTask');
    expect(typeof upsertTask).toBe('function');

    expect(typeof deleteTaskRef).toBe('function');
    expect(deleteTaskRef.operationName).toBe('DeleteTask');
    expect(typeof deleteTask).toBe('function');

    expect(typeof listTasksByProjectRef).toBe('function');
    expect(listTasksByProjectRef.operationName).toBe('ListTasksByProject');
    expect(typeof listTasksByProject).toBe('function');

    expect(typeof upsertProjectRef).toBe('function');
    expect(upsertProjectRef.operationName).toBe('UpsertProject');
    expect(typeof upsertProject).toBe('function');

    expect(typeof deleteProjectRef).toBe('function');
    expect(deleteProjectRef.operationName).toBe('DeleteProject');
    expect(typeof deleteProject).toBe('function');

    expect(typeof listProjectsRef).toBe('function');
    expect(listProjectsRef.operationName).toBe('ListProjects');
    expect(typeof listProjects).toBe('function');

    expect(typeof upsertProjectColumnRef).toBe('function');
    expect(upsertProjectColumnRef.operationName).toBe('UpsertProjectColumn');
    expect(typeof upsertProjectColumn).toBe('function');

    expect(typeof deleteProjectColumnRef).toBe('function');
    expect(deleteProjectColumnRef.operationName).toBe('DeleteProjectColumn');
    expect(typeof deleteProjectColumn).toBe('function');

    expect(typeof listProjectColumnsRef).toBe('function');
    expect(listProjectColumnsRef.operationName).toBe('ListProjectColumns');
    expect(typeof listProjectColumns).toBe('function');
  });

  it('exports Firebase singletons in src/config/firebase.ts matching the directory layout', () => {
    expect(app).toBeDefined();
    expect(auth).toBeDefined();
    expect(rtdb).toBeDefined();
    expect(storage).toBeDefined();
  });

  it('exports DataConnect instance and bound helpers in src/config/dataconnect.ts', () => {
    expect(typeof dcUpsertTask).toBe('function');
    expect(typeof dcDeleteTask).toBe('function');
    expect(typeof dcUpsertColumn).toBe('function');
    expect(typeof dcUpsertProject).toBe('function');
  });

  it('DataConnectService safely executes operations without unhandled rejections', async () => {
    const testTask = {
      id: 'test_task_dc_1',
      projectId: 'proj-1',
      columnId: 'col-1',
      title: 'Teste Data Connect',
      description: 'Descrição de teste',
      priority: 'ALTA' as const,
      status: 'A Fazer',
      position: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdById: 'user-1',
      createdByName: 'Admin',
      attachments: [],
      comments: []
    };

    await expect(DataConnectService.syncTask(testTask)).resolves.not.toThrow();
    await expect(DataConnectService.deleteTask(testTask.id)).resolves.not.toThrow();

    const testCol = {
      id: 'test_col_dc_1',
      projectId: 'proj-1',
      name: 'Coluna DC',
      key: 'coluna-dc',
      position: 0,
      color: '#3b82f6',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await expect(DataConnectService.syncColumn(testCol)).resolves.not.toThrow();
    await expect(DataConnectService.deleteColumn(testCol.id)).resolves.not.toThrow();

    const testProj = {
      id: 'test_proj_dc_1',
      name: 'Projeto DC',
      slug: 'projeto-dc',
      description: 'Projeto Data Connect',
      visibility: 'PUBLIC' as const,
      status: 'EM_ANDAMENTO' as const,
      ownerId: 'user-1',
      ownerName: 'Admin',
      technologies: ['React', 'Firebase'],
      links: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await expect(DataConnectService.syncProject(testProj)).resolves.not.toThrow();
    await expect(DataConnectService.deleteProject(testProj.id)).resolves.not.toThrow();
  });
});
