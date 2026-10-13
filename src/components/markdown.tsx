import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/** Renders trusted-format Markdown from content files. Raw HTML is never rendered. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  )
}
