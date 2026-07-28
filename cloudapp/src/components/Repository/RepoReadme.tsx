/**
 * RepoReadme — Markdown renderer for README files.
 * Supports: headings, bold/italic, inline code, code blocks, links, images,
 * unordered/ordered lists, blockquotes, horizontal rules, and tables.
 * No external dependency — pure regex-based.
 */
import React from 'react';
import { Box, Divider, Typography } from '@mui/material';
import { dashboardTokens } from '../../styles/dashboardDesignSystem';

const t    = dashboardTokens.colors;
const MONO = '"JetBrains Mono","Fira Code",monospace';
const FONT = dashboardTokens.typography.fontFamily;

// ─── Inline markdown parser (within a line) ────────────────────────────────────

interface InlineSegment {
  type:    'text' | 'bold' | 'italic' | 'code' | 'link' | 'image';
  text:    string;
  href?:   string;
  src?:    string;
  alt?:    string;
}

function parseInline(raw: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  // Regex covers: image, link, inline code, bold, italic
  const pattern = /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]*)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;

  while ((m = pattern.exec(raw)) !== null) {
    if (m.index > lastIdx) {
      segments.push({ type: 'text', text: raw.slice(lastIdx, m.index) });
    }
    if (m[0].startsWith('![')) {
      segments.push({ type: 'image', text: m[1], src: m[2], alt: m[1] });
    } else if (m[0].startsWith('[')) {
      segments.push({ type: 'link', text: m[3], href: m[4] });
    } else if (m[5] !== undefined) {
      segments.push({ type: 'code', text: m[5] });
    } else if (m[6] !== undefined || m[7] !== undefined) {
      segments.push({ type: 'bold', text: m[6] ?? m[7] });
    } else {
      segments.push({ type: 'italic', text: m[8] ?? m[9] });
    }
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < raw.length) segments.push({ type: 'text', text: raw.slice(lastIdx) });
  return segments;
}

const InlineContent: React.FC<{ raw: string }> = ({ raw }) => {
  const segs = parseInline(raw);
  return (
    <>
      {segs.map((s, i) => {
        switch (s.type) {
          case 'bold':   return <strong key={i}>{s.text}</strong>;
          case 'italic': return <em key={i}>{s.text}</em>;
          case 'code':   return (
            <Box key={i} component="code" sx={{ fontFamily: MONO, fontSize: '.85em', bgcolor: 'rgba(21,61,117,.08)', px: 0.6, py: 0.15, borderRadius: '4px', color: t.brandPrimary }}>
              {s.text}
            </Box>
          );
          case 'link': return (
            <Box key={i} component="a" href={s.href} target="_blank" rel="noopener noreferrer"
              sx={{ color: t.brandPrimary, textDecoration: 'underline', textDecorationColor: `${t.brandPrimary}60`, '&:hover': { textDecorationColor: t.brandPrimary } }}>
              {s.text}
            </Box>
          );
          case 'image': return (
            <Box key={i} component="img" src={s.src} alt={s.alt}
              sx={{ maxWidth: '100%', borderRadius: '6px', display: 'block', my: 1 }} />
          );
          default: return <React.Fragment key={i}>{s.text}</React.Fragment>;
        }
      })}
    </>
  );
};

// ─── Block-level renderer ──────────────────────────────────────────────────────

type BlockTokenType =
  | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  | 'ul' | 'ol'
  | 'fence'
  | 'blockquote'
  | 'hr'
  | 'table'
  | 'p';

interface Block {
  type:    BlockTokenType;
  content: string[];   // lines
  lang?:   string;     // for fences
}

function tokenize(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    const fenceMatch = line.match(/^```(\w*)/);
    if (fenceMatch) {
      const lang    = fenceMatch[1];
      const content: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        content.push(lines[i]);
        i++;
      }
      i++; // closing ```
      blocks.push({ type: 'fence', content, lang });
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1|2|3|4|5|6;
      blocks.push({ type: `h${level}` as BlockTokenType, content: [headingMatch[2]] });
      i++;
      continue;
    }

    // HR
    if (/^---+$/.test(line.trim()) || /^\*\*\*+$/.test(line.trim())) {
      blocks.push({ type: 'hr', content: [] });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const content: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        content.push(lines[i].slice(2));
        i++;
      }
      blocks.push({ type: 'blockquote', content });
      continue;
    }

    // Table
    if (line.includes('|') && i + 1 < lines.length && /^\|?\s*[-:]+[-| :]*\|/.test(lines[i + 1])) {
      const content: string[] = [line];
      i++;
      while (i < lines.length && lines[i].includes('|')) {
        content.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'table', content });
      continue;
    }

    // Unordered list
    if (/^[-*+]\s/.test(line)) {
      const content: string[] = [];
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        content.push(lines[i].replace(/^[-*+]\s/, ''));
        i++;
      }
      blocks.push({ type: 'ul', content });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const content: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        content.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      blocks.push({ type: 'ol', content });
      continue;
    }

    // Empty line → skip
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph — collect until blank line
    const content: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && !lines[i].startsWith('#') && !lines[i].startsWith('```') && !lines[i].startsWith('> ')) {
      content.push(lines[i]);
      i++;
    }
    if (content.length) blocks.push({ type: 'p', content });
  }

  return blocks;
}

// ─── Block renderers ───────────────────────────────────────────────────────────

const HEADING_SX: Record<string, object> = {
  h1: { fontSize: '1.75rem', fontWeight: 800, borderBottom: `2px solid ${t.border}`, pb: 0.75, mb: 1.5 },
  h2: { fontSize: '1.35rem', fontWeight: 700, borderBottom: `1px solid ${t.border}`, pb: 0.5, mb: 1.25 },
  h3: { fontSize: '1.1rem',  fontWeight: 700, mb: 1 },
  h4: { fontSize: '.95rem',  fontWeight: 700, mb: 0.75 },
  h5: { fontSize: '.88rem',  fontWeight: 700, mb: 0.5 },
  h6: { fontSize: '.82rem',  fontWeight: 600, color: t.textSecondary, mb: 0.5 },
};

function renderBlock(block: Block, idx: number): React.ReactNode {
  switch (block.type) {
    case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
      return (
        <Typography key={idx} component={block.type} sx={{ ...HEADING_SX[block.type], mt: idx > 0 ? 2.5 : 0, color: t.textPrimary, lineHeight: 1.3 }}>
          <InlineContent raw={block.content[0]} />
        </Typography>
      );

    case 'p':
      return (
        <Typography key={idx} sx={{ fontSize: '.92rem', color: t.textPrimary, lineHeight: 1.75, mb: 1 }}>
          {block.content.map((line, li) => (
            <React.Fragment key={li}>
              <InlineContent raw={line} />
              {li < block.content.length - 1 && ' '}
            </React.Fragment>
          ))}
        </Typography>
      );

    case 'fence':
      return (
        <Box key={idx} sx={{ mb: 1.5, borderRadius: '8px', overflow: 'hidden', border: `1px solid ${t.border}` }}>
          {block.lang && (
            <Box sx={{ px: 1.5, py: 0.5, bgcolor: t.surfaceSubtle, borderBottom: `1px solid ${t.border}` }}>
              <Typography sx={{ fontSize: '.72rem', color: t.textTertiary, fontFamily: MONO, fontWeight: 600 }}>
                {block.lang}
              </Typography>
            </Box>
          )}
          <Box component="pre" sx={{
            m: 0, p: 2,
            fontFamily: MONO, fontSize: '.82rem', lineHeight: 1.7,
            bgcolor: t.surfaceSubtle,
            color: t.textPrimary,
            overflowX: 'auto',
            whiteSpace: 'pre',
          }}>
            {block.content.join('\n')}
          </Box>
        </Box>
      );

    case 'blockquote':
      return (
        <Box key={idx} sx={{
          borderLeft: `4px solid ${t.brandPrimary}`,
          pl: 2, py: 0.5, mb: 1.5,
          bgcolor: 'rgba(21,61,117,.04)',
          borderRadius: '0 6px 6px 0',
        }}>
          {block.content.map((line, li) => (
            <Typography key={li} sx={{ fontSize: '.88rem', color: t.textSecondary, lineHeight: 1.65, fontStyle: 'italic' }}>
              <InlineContent raw={line} />
            </Typography>
          ))}
        </Box>
      );

    case 'ul':
      return (
        <Box key={idx} component="ul" sx={{ pl: 3, mb: 1.5, '& li + li': { mt: 0.4 } }}>
          {block.content.map((item, li) => (
            <Box key={li} component="li" sx={{ fontSize: '.92rem', color: t.textPrimary, lineHeight: 1.65, listStyleType: 'disc' }}>
              <InlineContent raw={item} />
            </Box>
          ))}
        </Box>
      );

    case 'ol':
      return (
        <Box key={idx} component="ol" sx={{ pl: 3, mb: 1.5, '& li + li': { mt: 0.4 } }}>
          {block.content.map((item, li) => (
            <Box key={li} component="li" sx={{ fontSize: '.92rem', color: t.textPrimary, lineHeight: 1.65 }}>
              <InlineContent raw={item} />
            </Box>
          ))}
        </Box>
      );

    case 'hr':
      return <Divider key={idx} sx={{ my: 2, borderColor: t.border }} />;

    case 'table': {
      const rows = block.content
        .filter(r => !/^\|?\s*[-:]+[-| :]*\|/.test(r))
        .map(r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
      if (rows.length === 0) return null;
      const [header, ...body] = rows;
      return (
        <Box key={idx} sx={{ mb: 2, overflowX: 'auto' }}>
          <Box component="table" sx={{ borderCollapse: 'collapse', width: '100%', fontSize: '.88rem' }}>
            <Box component="thead">
              <Box component="tr">
                {header.map((h: string, hi: number) => (
                  <Box key={hi} component="th" sx={{ px: 1.5, py: 0.75, textAlign: 'left', fontWeight: 700, color: t.textPrimary, bgcolor: t.surfaceSubtle, border: `1px solid ${t.border}` }}>
                    <InlineContent raw={h} />
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {body.map((row: string[], ri: number) => (
                <Box key={ri} component="tr" sx={{ '&:nth-of-type(even) td': { bgcolor: t.surfaceSubtle } }}>
                  {row.map((cell: string, ci: number) => (
                    <Box key={ci} component="td" sx={{ px: 1.5, py: 0.6, color: t.textPrimary, border: `1px solid ${t.border}` }}>
                      <InlineContent raw={cell} />
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      );
    }

    default: return null;
  }
}

// ─── Main exported component ───────────────────────────────────────────────────

interface RepoReadmeProps {
  content: string;
}

export const RepoReadme: React.FC<RepoReadmeProps> = ({ content }) => {
  const lines  = content.split('\n');
  const blocks = tokenize(lines);

  return (
    <Box sx={{
      p: 3,
      fontFamily: FONT,
      color: t.textPrimary,
      maxWidth: 900,
      '& a': { color: t.brandPrimary },
      '& img': { maxWidth: '100%' },
    }}>
      {blocks.map((b, i) => renderBlock(b, i))}
    </Box>
  );
};

export default RepoReadme;
