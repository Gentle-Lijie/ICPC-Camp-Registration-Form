'use client';

import { useEffect, useRef } from 'react';
import hljs from 'highlight.js';

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export default function CodeBlock({ code, language = 'plaintext', className = '' }: CodeBlockProps) {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.removeAttribute('data-highlighted');
      hljs.highlightElement(codeRef.current);
    }
  }, [code, language]);

  return (
    <div className={`rounded-lg overflow-hidden ${className}`} style={{
      background: '#0d1117',
      border: '1px solid rgba(0, 229, 255, 0.15)',
    }}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2" style={{
        background: 'rgba(0, 229, 255, 0.06)',
        borderBottom: '1px solid rgba(0, 229, 255, 0.1)',
      }}>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f57' }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#febc2e' }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#28c840' }} />
          </div>
          <span className="text-[10px] font-mono ml-2" style={{ color: 'var(--text-muted)' }}>
            pseudocode
          </span>
        </div>
        <button
          className="text-[10px] font-mono px-2 py-0.5 rounded transition-colors"
          style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          onClick={() => navigator.clipboard?.writeText(code)}
          title="复制代码"
        >
          复制
        </button>
      </div>
      {/* Code content */}
      <pre className="!m-0 !p-4 overflow-x-auto" style={{ background: '#0d1117' }}>
        <code
          ref={codeRef}
          className={`language-${language}`}
          style={{
            fontFamily: '"IBM Plex Mono", "Fira Code", "Consolas", monospace',
            fontSize: '13px',
            lineHeight: '1.6',
            color: '#c9d1d9',
          }}
        >
          {code}
        </code>
      </pre>
    </div>
  );
}
