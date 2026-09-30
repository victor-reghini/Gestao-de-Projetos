import { ConnectorConfig, DataConnect, MutationRef, QueryRef, OperationResult } from 'firebase/data-connect';

export declare const connectorConfig: ConnectorConfig;

export interface OperationRefWithMeta<R> {
  (dcOrVars?: any, vars?: any): R;
  operationName: string;
}

// 1. Users
export declare const upsertUserRef: OperationRefWithMeta<MutationRef<any, any>>;
export declare function upsertUser(dcOrVars?: any, vars?: any): Promise<OperationResult<any, any>>;
export declare const deleteUserRef: OperationRefWithMeta<MutationRef<any, any>>;
export declare function deleteUser(dcOrVars?: any, vars?: any): Promise<OperationResult<any, any>>;
export declare const getUserRef: OperationRefWithMeta<QueryRef<any, any>>;
export declare function getUser(dcOrVars?: any, vars?: any): Promise<OperationResult<any, any>>;

// 2. Projects
export declare const upsertProjectRef: OperationRefWithMeta<MutationRef<any, any>>;
export declare function upsertProject(dcOrVars?: any, vars?: any): Promise<OperationResult<any, any>>;
export declare const deleteProjectRef: OperationRefWithMeta<MutationRef<any, any>>;
export declare function deleteProject(dcOrVars?: any, vars?: any): Promise<OperationResult<any, any>>;
export declare const listProjectsRef: OperationRefWithMeta<QueryRef<any, any>>;
export declare function listProjects(dcOrVars?: any, vars?: any): Promise<OperationResult<any, any>>;
export declare const getProjectBySlugRef: OperationRefWithMeta<QueryRef<any, any>>;
export declare function getProjectBySlug(dcOrVars?: any, vars?: any): Promise<OperationResult<any, any>>;

// 3. Columns
export declare const upsertProjectColumnRef: OperationRefWithMeta<MutationRef<any, any>>;
export declare function upsertProjectColumn(dcOrVars?: any, vars?: any): Promise<OperationResult<any, any>>;
export declare const deleteProjectColumnRef: OperationRefWithMeta<MutationRef<any, any>>;
export declare function deleteProjectColumn(dcOrVars?: any, vars?: any): Promise<OperationResult<any, any>>;
export declare const listProjectColumnsRef: OperationRefWithMeta<QueryRef<any, any>>;
export declare function listProjectColumns(dcOrVars?: any, vars?: any): Promise<OperationResult<any, any>>;

// 4. Tasks
export declare const upsertTaskRef: OperationRefWithMeta<MutationRef<any, any>>;
export declare function upsertTask(dcOrVars?: any, vars?: any): Promise<OperationResult<any, any>>;
export declare const deleteTaskRef: OperationRefWithMeta<MutationRef<any, any>>;
export declare function deleteTask(dcOrVars?: any, vars?: any): Promise<OperationResult<any, any>>;
export declare const listTasksByProjectRef: OperationRefWithMeta<QueryRef<any, any>>;
export declare function listTasksByProject(dcOrVars?: any, vars?: any): Promise<OperationResult<any, any>>;

// 5. Ideas
export declare const upsertIdeaRef: OperationRefWithMeta<MutationRef<any, any>>;
export declare function upsertIdea(dcOrVars?: any, vars?: any): Promise<OperationResult<any, any>>;
export declare const deleteIdeaRef: OperationRefWithMeta<MutationRef<any, any>>;
export declare function deleteIdea(dcOrVars?: any, vars?: any): Promise<OperationResult<any, any>>;

// 6. Suggestions
export declare const upsertSuggestionRef: OperationRefWithMeta<MutationRef<any, any>>;
export declare function upsertSuggestion(dcOrVars?: any, vars?: any): Promise<OperationResult<any, any>>;

// 7. Bug Reports
export declare const upsertBugReportRef: OperationRefWithMeta<MutationRef<any, any>>;
export declare function upsertBugReport(dcOrVars?: any, vars?: any): Promise<OperationResult<any, any>>;

// 8. Documents
export declare const upsertProjectDocumentRef: OperationRefWithMeta<MutationRef<any, any>>;
export declare function upsertProjectDocument(dcOrVars?: any, vars?: any): Promise<OperationResult<any, any>>;
