import * as runtime from 'react/jsx-runtime'
import type { ComponentProps, ComponentType } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MDXComponents = Record<string, ComponentType<any>>

function getMDXComponent(code: string) {
  const fn = new Function(code)
  return fn({ ...runtime }).default as ComponentType<{ components?: MDXComponents }>
}

/** A wide table scrolls inside the lesson; how wide it is depends on the machine's fonts. */
function ScrollingTable(props: ComponentProps<'table'>) {
  return (
    <div className="overflow-x-auto" tabIndex={0}>
      <table {...props} />
    </div>
  )
}

export function MDXContent({ code, components }: { code: string; components?: MDXComponents }) {
  const Component = getMDXComponent(code)
  return <Component components={{ table: ScrollingTable, ...components }} />
}
