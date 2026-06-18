import DOMPurify from 'dompurify';

/** Lista blanca alineada al toolbar de Quill en RichTextEditor.vue */
const ALLOWED_TAGS = [
  'p',
  'br',
  'div',
  'span',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'h1',
  'h2',
  'h3',
  'ul',
  'ol',
  'li',
  'a',
];

const ALLOWED_ATTR = ['class', 'href', 'target', 'rel'];

export function sanitizeRichHtml(html: string | null | undefined): string {
  if (!html || html.trim() === '') {
    return '';
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}
