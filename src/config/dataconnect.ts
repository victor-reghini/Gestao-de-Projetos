import { getDataConnect, type DataConnect } from 'firebase/data-connect';
import { app } from './firebase';
import {
  connectorConfig,
  upsertUser,
  deleteUser,
  getUser,
  upsertProject,
  deleteProject,
  listProjects,
  getProjectBySlug,
  upsertProjectColumn,
  deleteProjectColumn,
  listProjectColumns,
  upsertTask,
  deleteTask,
  listTasksByProject,
  upsertIdea,
  deleteIdea,
  upsertSuggestion,
  upsertBugReport,
  upsertProjectDocument
} from '../dataconnect-generated/esm/index.esm.js';

let dataConnectInstance: DataConnect | null = null;

try {
  dataConnectInstance = getDataConnect(app, connectorConfig);
} catch (error) {
  console.warn('[DataConnect] Initialization notice:', error);
}

export const dataConnect = dataConnectInstance;
export { connectorConfig };

// Bound operations passing dataConnect instance automatically
export const dcUpsertTask = (vars: any) =>
  dataConnect ? upsertTask(dataConnect, vars) : Promise.resolve(null);

export const dcDeleteTask = (vars: any) =>
  dataConnect ? deleteTask(dataConnect, vars) : Promise.resolve(null);

export const dcListTasks = (vars: any) =>
  dataConnect ? listTasksByProject(dataConnect, vars) : Promise.resolve({ data: { tasks: [] } });

export const dcUpsertColumn = (vars: any) =>
  dataConnect ? upsertProjectColumn(dataConnect, vars) : Promise.resolve(null);

export const dcDeleteColumn = (vars: any) =>
  dataConnect ? deleteProjectColumn(dataConnect, vars) : Promise.resolve(null);

export const dcListColumns = (vars: any) =>
  dataConnect ? listProjectColumns(dataConnect, vars) : Promise.resolve({ data: { projectColumns: [] } });

export const dcUpsertProject = (vars: any) =>
  dataConnect ? upsertProject(dataConnect, vars) : Promise.resolve(null);

export const dcDeleteProject = (vars: any) =>
  dataConnect ? deleteProject(dataConnect, vars) : Promise.resolve(null);

export const dcListProjects = () =>
  dataConnect ? listProjects(dataConnect) : Promise.resolve({ data: { projects: [] } });

export {
  upsertUser,
  deleteUser,
  getUser,
  upsertProject,
  deleteProject,
  listProjects,
  getProjectBySlug,
  upsertProjectColumn,
  deleteProjectColumn,
  listProjectColumns,
  upsertTask,
  deleteTask,
  listTasksByProject,
  upsertIdea,
  deleteIdea,
  upsertSuggestion,
  upsertBugReport,
  upsertProjectDocument
};

export default dataConnect;
