/**
 * Sensitive Information & Markdown Security Service
 * 
 * Provides:
 * 1. Markdown marker detection (block :::secret ... ::: and inline ||...||)
 * 2. Cryptographic encryption/decryption of sensitive segments (enc_sec_v1:)
 * 3. Strict backend & database redaction for non-owners (strips confidential info before network transfer)
 * 4. Safe markdown formatting with security badges for authorized owners
 */

import { Project, Task } from '@/types';

export const SENSITIVE_CIPHER_PREFIX = 'enc_sec_v1:';
const SENSITIVE_SALT = 'GestaoProjetos#SensitiveSec2026!Key';

// Regex patterns for sensitive markdown markers
// Block: :::secret\n...content...\n::: (and aliases sensivel, sigiloso, confidential)
export const SENSITIVE_BLOCK_REGEX = /(?:^|\r?\n):::(?:secret|sensivel|sigiloso|confidential)\s*\r?\n([\s\S]*?)\r?\n:::(?:\r?\n|$)/gi;

// Inline: ||...content...|| or :::secret content::: or [secret]content[/secret]
export const SENSITIVE_INLINE_SPOILER_REGEX = /\|\|([\s\S]+?)\|\|/g;
export const SENSITIVE_INLINE_TAG_REGEX = /\[secret\]([\s\S]+?)\[\/secret\]/gi;
export const SENSITIVE_INLINE_COLON_REGEX = /:::(?:secret|sensivel|sigiloso)\s+([^\n\r]+?)\s*:::/gi;

/**
 * Checks whether a text contains sensitive markers (either block or inline)
 */
export function hasSensitiveMarkers(text?: string | null): boolean {
  if (!text) return false;
  return (
    /:::(?:secret|sensivel|sigiloso|confidential)/i.test(text) ||
    /\|\|[\s\S]+?\|\|/.test(text) ||
    /\[secret\][\s\S]+?\[\/secret\]/i.test(text)
  );
}

/**
 * Fast, reversible XOR stream cipher with UTF-8 encoding/decoding
 * Works uniformly in Browser, Node.js, Netlify Functions and Vitest
 */
export function encryptSensitivePayload(plainText: string): string {
  if (!plainText) return plainText;
  try {
    const textBytes = new TextEncoder().encode(plainText);
    const saltBytes = new TextEncoder().encode(SENSITIVE_SALT);
    const encryptedBytes = new Uint8Array(textBytes.length);

    for (let i = 0; i < textBytes.length; i++) {
      encryptedBytes[i] = textBytes[i] ^ saltBytes[i % saltBytes.length];
    }

    let binary = '';
    for (let i = 0; i < encryptedBytes.byteLength; i++) {
      binary += String.fromCharCode(encryptedBytes[i]);
    }

    const b64 = typeof btoa !== 'undefined'
      ? btoa(binary)
      : Buffer.from(binary, 'binary').toString('base64');

    return `${SENSITIVE_CIPHER_PREFIX}${b64}`;
  } catch (err) {
    console.warn('[SensitiveInfo] Encryption fallback:', err);
    return plainText;
  }
}

/**
 * Decrypts a sensitive payload prefixed with enc_sec_v1:
 */
export function decryptSensitivePayload(cipherText: string): string {
  if (!cipherText || !cipherText.startsWith(SENSITIVE_CIPHER_PREFIX)) {
    return cipherText;
  }
  try {
    const b64 = cipherText.slice(SENSITIVE_CIPHER_PREFIX.length);
    const binary = typeof atob !== 'undefined'
      ? atob(b64)
      : Buffer.from(b64, 'base64').toString('binary');

    const encryptedBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      encryptedBytes[i] = binary.charCodeAt(i);
    }

    const saltBytes = new TextEncoder().encode(SENSITIVE_SALT);
    const decryptedBytes = new Uint8Array(encryptedBytes.length);
    for (let i = 0; i < encryptedBytes.length; i++) {
      decryptedBytes[i] = encryptedBytes[i] ^ saltBytes[i % saltBytes.length];
    }

    return new TextDecoder().decode(decryptedBytes);
  } catch (err) {
    console.warn('[SensitiveInfo] Decryption fallback:', err);
    return cipherText;
  }
}

/**
 * Encrypts all sensitive markers within a markdown text before persisting to database/storage
 * Turns:
 * :::secret\nminha senha\n:::
 * into:
 * :::secret\nenc_sec_v1:...\n:::
 */
export function encryptSensitiveMarkers(text?: string | null): string {
  if (!text) return text || '';

  let result = text;

  // 1. Process block markers
  result = result.replace(
    /(?:^|\r?\n):::(secret|sensivel|sigiloso|confidential)\s*\r?\n([\s\S]*?)\r?\n:::(?:\r?\n|$)/gi,
    (match, tag, inner) => {
      const trimmed = inner.trim();
      if (!trimmed) return match;
      if (trimmed.startsWith(SENSITIVE_CIPHER_PREFIX)) {
        return `\n:::secret\n${trimmed}\n:::\n`;
      }
      const encrypted = encryptSensitivePayload(trimmed);
      return `\n:::secret\n${encrypted}\n:::\n`;
    }
  );

  // 2. Process inline spoiler markers ||...||
  result = result.replace(/\|\|([\s\S]+?)\|\|/g, (match, inner) => {
    const trimmed = inner.trim();
    if (!trimmed) return match;
    if (trimmed.startsWith(SENSITIVE_CIPHER_PREFIX)) {
      return `||${trimmed}||`;
    }
    const encrypted = encryptSensitivePayload(trimmed);
    return `||${encrypted}||`;
  });

  // 3. Process [secret]...[/secret]
  result = result.replace(/\[secret\]([\s\S]+?)\[\/secret\]/gi, (match, inner) => {
    const trimmed = inner.trim();
    if (!trimmed) return match;
    if (trimmed.startsWith(SENSITIVE_CIPHER_PREFIX)) {
      return `[secret]${trimmed}[/secret]`;
    }
    const encrypted = encryptSensitivePayload(trimmed);
    return `[secret]${encrypted}[/secret]`;
  });

  return result;
}

/**
 * Decrypts all sensitive markers within markdown text for authorized project owners
 */
export function decryptSensitiveMarkers(text?: string | null): string {
  if (!text) return text || '';

  let result = text;

  // 1. Decrypt block markers
  result = result.replace(
    /(?:^|\r?\n):::(?:secret|sensivel|sigiloso|confidential)\s*\r?\n([\s\S]*?)\r?\n:::(?:\r?\n|$)/gi,
    (match, inner) => {
      const trimmed = inner.trim();
      if (trimmed.startsWith(SENSITIVE_CIPHER_PREFIX)) {
        const decrypted = decryptSensitivePayload(trimmed);
        return `\n:::secret\n${decrypted}\n:::\n`;
      }
      return match;
    }
  );

  // 2. Decrypt inline spoiler markers ||...||
  result = result.replace(/\|\|([\s\S]+?)\|\|/g, (match, inner) => {
    const trimmed = inner.trim();
    if (trimmed.startsWith(SENSITIVE_CIPHER_PREFIX)) {
      const decrypted = decryptSensitivePayload(trimmed);
      return `||${decrypted}||`;
    }
    return match;
  });

  // 3. Decrypt [secret]...[/secret]
  result = result.replace(/\[secret\]([\s\S]+?)\[\/secret\]/gi, (match, inner) => {
    const trimmed = inner.trim();
    if (trimmed.startsWith(SENSITIVE_CIPHER_PREFIX)) {
      const decrypted = decryptSensitivePayload(trimmed);
      return `[secret]${decrypted}[/secret]`;
    }
    return match;
  });

  return result;
}

/**
 * Redacts/cuts all sensitive sections from markdown text before sending to non-owners
 * "A informação sigilosa não deve sair do backend caso o usuário requisitando a informação
 * não seja o proprietário do projeto, o texto deve ser recortado antes de ser retornado para exibição no frontend."
 */
export function redactSensitiveMarkers(text?: string | null): string {
  if (!text) return '';

  let result = text;

  // 1. Cut block markers entirely
  result = result.replace(
    /(?:^|\r?\n):::(?:secret|sensivel|sigiloso|confidential)\s*\r?\n([\s\S]*?)\r?\n:::(?:\r?\n|$)/gi,
    '\n'
  );

  // 2. Cut inline spoilers ||...||
  result = result.replace(/\|\|([\s\S]+?)\|\|/g, '');

  // 3. Cut [secret]...[/secret]
  result = result.replace(/\[secret\]([\s\S]+?)\[\/secret\]/gi, '');

  // 4. Cut single-line :::secret ... :::
  result = result.replace(/:::(?:secret|sensivel|sigiloso)\s+([^\n\r]+?)\s*:::/gi, '');

  // Clean up excess whitespace and consecutive line breaks
  result = result
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return result;
}

/**
 * Sanitizes a Project entity for the requesting user
 * If requesting user is the owner (or superuser), decrypts sensitive markers
 * If not owner, cuts out all sensitive content completely before returning
 */
export function sanitizeProjectForUser<T extends { ownerId?: string; description?: string; shortDescription?: string }>(
  project: T,
  requestingUserId?: string | null,
  isSuperUser = false
): T {
  if (!project) return project;

  const isOwner = Boolean(
    requestingUserId &&
    (project.ownerId === requestingUserId || isSuperUser)
  );

  const cleanDescription = isOwner
    ? decryptSensitiveMarkers(project.description)
    : redactSensitiveMarkers(project.description);

  const cleanShortDesc = project.shortDescription
    ? (isOwner
        ? decryptSensitiveMarkers(project.shortDescription)
        : redactSensitiveMarkers(project.shortDescription))
    : project.shortDescription;

  return {
    ...project,
    description: cleanDescription,
    ...(cleanShortDesc !== undefined ? { shortDescription: cleanShortDesc } : {})
  };
}

/**
 * Sanitizes a Task entity for the requesting user based on the project's owner
 */
export function sanitizeTaskForUser<T extends { description?: string }>(
  task: T,
  projectOwnerId?: string | null,
  requestingUserId?: string | null,
  isSuperUser = false
): T {
  if (!task) return task;

  const isOwner = Boolean(
    requestingUserId &&
    (projectOwnerId === requestingUserId || isSuperUser)
  );

  const cleanDescription = isOwner
    ? decryptSensitiveMarkers(task.description)
    : redactSensitiveMarkers(task.description);

  return {
    ...task,
    description: cleanDescription
  };
}

/**
 * Converts markdown text into formatted HTML with support for sensitive blocks
 * If isOwner is true, formats sensitive blocks with an amber/security badge
 * If isOwner is false, redacts sensitive sections completely
 */
export function renderFormattedMarkdown(text?: string | null, isOwner = true): string {
  if (!text || !text.trim()) {
    return '<p class="text-slate-500 italic text-xs">Nenhuma descrição informada.</p>';
  }

  // If not owner, strip sensitive info before rendering
  let content = isOwner ? decryptSensitiveMarkers(text) : redactSensitiveMarkers(text);

  if (!content.trim()) {
    return '<p class="text-slate-500 italic text-xs">Conteúdo confidencial protegido.</p>';
  }

  // Pre-process Sensitive Blocks into temporary tokens to avoid escaping
  const secretBlocks: string[] = [];
  content = content.replace(
    /(?:^|\r?\n):::(?:secret|sensivel|sigiloso|confidential)\s*\r?\n([\s\S]*?)\r?\n:::(?:\r?\n|$)/gi,
    (_, inner) => {
      const idx = secretBlocks.length;
      secretBlocks.push(inner.trim());
      return `\n\n__SECRET_BLOCK_${idx}__\n\n`;
    }
  );

  // Pre-process Inline Spoilers
  const secretInlines: string[] = [];
  content = content.replace(/\|\|([\s\S]+?)\|\|/g, (_, inner) => {
    const idx = secretInlines.length;
    secretInlines.push(inner.trim());
    return `__SECRET_INLINE_${idx}__`;
  });
  content = content.replace(/\[secret\]([\s\S]+?)\[\/secret\]/gi, (_, inner) => {
    const idx = secretInlines.length;
    secretInlines.push(inner.trim());
    return `__SECRET_INLINE_${idx}__`;
  });

  // Basic HTML Escaping for security
  let html = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headings
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-sm font-bold text-blue-300 mt-3 mb-1.5">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-base font-bold text-white mt-4 mb-2 pb-1 border-b border-slate-800">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-lg font-extrabold text-white mt-2 mb-3">$1</h1>');

  // Code blocks (multiline)
  html = html.replace(/```([a-z]*)\r?\n([\s\S]*?)```/gim, '<pre class="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 my-2.5 overflow-x-auto"><code>$2</code></pre>');
  
  // Inline code
  html = html.replace(/`([^`]+)`/gim, '<code class="px-1.5 py-0.5 rounded bg-slate-800 text-blue-300 font-mono text-xs">$1</code>');

  // Bold & Italic
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong class="font-bold text-white">$1</strong>');
  html = html.replace(/\*(.*?)\*/gim, '<em class="italic text-slate-300">$1</em>');

  // Blockquotes
  html = html.replace(/^> (.*$)/gim, '<blockquote class="border-l-2 border-blue-500 pl-3 py-1 my-2 text-xs text-slate-400 italic bg-slate-900/40 rounded-r">$1</blockquote>');

  // Lists
  html = html.replace(/^\- (.*$)/gim, '<li class="ml-4 list-disc text-slate-300 mb-1 text-xs">$1</li>');
  html = html.replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal text-slate-300 mb-1 text-xs">$1</li>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noreferrer" class="text-blue-400 hover:underline inline-flex items-center gap-1">$1 ↗</a>');

  // Paragraphs
  html = html.replace(/\n\n+/gim, '</p><p class="my-2 text-xs text-slate-300 leading-relaxed">');
  html = `<p class="my-1 text-xs text-slate-300 leading-relaxed">${html}</p>`;

  // Restore Secret Inlines
  secretInlines.forEach((secret, idx) => {
    const renderedSecret = `
      <span class="inline-flex items-center gap-1.5 px-2 py-0.5 mx-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-semibold" title="Dado sigiloso visível apenas para o proprietário">
        <svg class="w-3 h-3 text-amber-400 shrink-0 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
        </svg>
        <span>${secret.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
      </span>
    `.trim();
    html = html.replace(new RegExp(`__SECRET_INLINE_${idx}__`, 'g'), renderedSecret);
  });

  // Restore Secret Blocks
  secretBlocks.forEach((secret, idx) => {
    const renderedBlock = `
      <div class="my-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
        <div class="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-amber-500/20 text-xs font-semibold text-amber-400">
          <div class="flex items-center gap-1.5">
            <svg class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
            <span>Informação Sigilosa (Confidencial)</span>
          </div>
          <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300">
            Apenas Proprietário
          </span>
        </div>
        <div class="text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed select-text bg-slate-950/40 p-2.5 rounded-lg border border-amber-500/10">
${secret.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
        </div>
      </div>
    `.trim();
    html = html.replace(new RegExp(`__SECRET_BLOCK_${idx}__`, 'g'), renderedBlock);
  });

  return html;
}
