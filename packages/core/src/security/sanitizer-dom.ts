import { safeUrl } from './safe-url.js';
import {
  SANITIZER_CONFIG,
  SUI_CLASS,
  type SanitizerConfig,
} from './sanitizer-config.js';

/**
 * Sanitasi DOM dengan allowlist tetap. Diuji di browser nyata (ADR-0009) dan
 * tidak dihitung pada coverage unit Node.
 */

function sanitizeClassList(element: Element): void {
  const kept = element.className
    .split(/\s+/)
    .filter((token) => SUI_CLASS.test(token));

  if (kept.length === 0) element.removeAttribute('class');
  else element.setAttribute('class', kept.join(' '));
}

function sanitizeAttributes(element: Element, config: SanitizerConfig): void {
  const allowed = new Set(config.allowedAttributes);

  for (const attribute of [...element.attributes]) {
    const name = attribute.name.toLowerCase();

    if (!allowed.has(name)) {
      element.removeAttribute(attribute.name);
      continue;
    }

    if (name === 'href') {
      const url = safeUrl(attribute.value);
      if (url) element.setAttribute('href', url);
      else element.removeAttribute('href');
    }

    if (name === 'class') sanitizeClassList(element);
  }

  if (element.getAttribute('target') === '_blank') {
    element.setAttribute('rel', 'noopener noreferrer');
  }
}

function sanitizeChildren(parent: ParentNode, config: SanitizerConfig): void {
  const tags = new Set(config.allowedTags);

  for (const node of [...parent.childNodes]) {
    if (node.nodeType === 3) continue; // text node
    if (node.nodeType !== 1) {
      node.remove();
      continue;
    }

    const element = node as Element;
    if (!tags.has(element.tagName.toLowerCase())) {
      element.remove();
      continue;
    }

    sanitizeAttributes(element, config);
    sanitizeChildren(element, config);
  }
}

/** Sanitasi HTML memakai parser DOM; hanya dipanggil saat `document` ada. */
export function sanitizeWithDom(
  html: string,
  config: SanitizerConfig = SANITIZER_CONFIG,
): string {
  const template = document.createElement('template');
  template.innerHTML = html;
  sanitizeChildren(template.content, config);
  return template.innerHTML;
}
