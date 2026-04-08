import React from "react";

/**
 * Renders inline markdown formatting: **bold**, *italic*, and ***bold italic***.
 * Does NOT support block-level elements — use for single lines/paragraphs only.
 */
export function MarkdownText({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return <span className={className}>{parseInlineMarkdown(children)}</span>;
}

function parseInlineMarkdown(text: string): React.ReactNode[] {
  // Match ***bold italic***, **bold**, or *italic*
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Push text before the match
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // ***bold italic***
      nodes.push(
        <strong key={match.index}>
          <em>{match[2]}</em>
        </strong>
      );
    } else if (match[3]) {
      // **bold**
      nodes.push(<strong key={match.index}>{match[3]}</strong>);
    } else if (match[4]) {
      // *italic*
      nodes.push(<em key={match.index}>{match[4]}</em>);
    }

    lastIndex = match.index + match[0].length;
  }

  // Push remaining text
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}
