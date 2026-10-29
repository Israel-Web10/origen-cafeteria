import { Fragment, ReactNode } from 'react';
import { Link } from 'react-router-dom';

// Renderizador de Markdown LIMITADO y seguro: nunca interpreta HTML.
// Soporta: ## / ### títulos, párrafos, listas "- ", citas "> ", **negrita**, *cursiva*,
// y enlaces [texto](https://... | /ruta-interna). Cualquier otra cosa se muestra como texto.
function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const token = m[0];
    const key = `${keyBase}-${i++}`;
    if (token.startsWith('**')) out.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith('*')) out.push(<em key={key}>{token.slice(1, -1)}</em>);
    else {
      const [, label, href] = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token) || [];
      // Solo rutas internas: empiezan con "/" y no contienen "//" ni "\" (evita redirecciones abiertas)
      if (href && href.startsWith('/') && !href.includes('//') && !href.includes('\\')) out.push(<Link key={key} to={href}>{label}</Link>);
      else if (href && /^https:\/\//.test(href)) out.push(<a key={key} href={href} target="_blank" rel="noopener noreferrer">{label}</a>);
      else out.push(label || token);
    }
    last = m.index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source, className = 'prose-origen' }: { source: string; className?: string }) {
  const blocks: ReactNode[] = [];
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  let para: string[] = [];
  let list: string[] = [];
  let quote: string[] = [];
  const flush = () => {
    const k = blocks.length;
    if (para.length) { blocks.push(<p key={k}>{inline(para.join(' '), `p${k}`)}</p>); para = []; }
    if (list.length) { blocks.push(<ul key={`${k}u`}>{list.map((li, j) => <li key={j}>{inline(li, `l${k}${j}`)}</li>)}</ul>); list = []; }
    if (quote.length) { blocks.push(<blockquote key={`${k}q`}>{inline(quote.join(' '), `q${k}`)}</blockquote>); quote = []; }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { flush(); continue; }
    if (line.startsWith('### ')) { flush(); blocks.push(<h3 key={blocks.length}>{inline(line.slice(4), `h${blocks.length}`)}</h3>); continue; }
    if (line.startsWith('## ')) { flush(); blocks.push(<h2 key={blocks.length}>{inline(line.slice(3), `h${blocks.length}`)}</h2>); continue; }
    if (line.startsWith('# ')) { flush(); blocks.push(<h2 key={blocks.length}>{inline(line.slice(2), `h${blocks.length}`)}</h2>); continue; }
    if (/^[-*] /.test(line)) { if (para.length || quote.length) flush(); list.push(line.slice(2)); continue; }
    if (line.startsWith('> ')) { if (para.length || list.length) flush(); quote.push(line.slice(2)); continue; }
    if (list.length || quote.length) flush();
    para.push(line.trim());
  }
  flush();
  return <div className={className}>{blocks.map((b, i) => <Fragment key={i}>{b}</Fragment>)}</div>;
}
