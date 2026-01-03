import { micromark } from 'micromark';
import { useMemo } from 'react';

type MarkdownReportProps = {
  content: string | null;
};

export function MarkdownReport({ content }: MarkdownReportProps) {
  const htmlContent = useMemo(() => {
    if (!content) return { __html: '' };
    return { __html: micromark(content) };
  }, [content]);

  return (
    <div
      className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground space-y-4 p-4 border rounded-lg bg-background/50"
      dangerouslySetInnerHTML={htmlContent}
    />
  );
}
