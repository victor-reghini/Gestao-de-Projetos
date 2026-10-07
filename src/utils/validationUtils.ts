/**
 * Utilitários de validação e sanitização de dados.
 * Centraliza regras de validação para garantir consistência e facilidade de teste.
 */

/**
 * Converte um texto qualquer para um slug URL seguro em minúsculas sem acentos.
 */
export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Valida se um slug segue o formato padronizado (kebab-case alfanumérico).
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || slug.trim().length === 0) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/**
 * Validação simplificada de e-mail.
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

/**
 * Valida se uma string é uma URL http/https válida.
 */
export function isValidUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Valida os campos obrigatórios na criação/edição de um projeto.
 */
export function validateProjectData(data: { name?: string; slug?: string }): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.name || !data.name.trim()) {
    errors.name = 'O nome do projeto é obrigatório.';
  }

  if (data.slug && !isValidSlug(slugify(data.slug))) {
    errors.slug = 'O slug informado possui caracteres inválidos.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Valida os campos obrigatórios na criação/edição de uma atividade.
 */
export function validateTaskData(data: { title?: string; columnId?: string }): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.title || !data.title.trim()) {
    errors.title = 'O título da atividade é obrigatório.';
  }

  if (!data.columnId || !data.columnId.trim()) {
    errors.columnId = 'Selecione uma coluna válida para a atividade.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
