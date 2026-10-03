import * as runtime from 'react/jsx-runtime'
import type { ComponentType } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MDXComponents = Record<string, ComponentType<any>>

function getMDXComponent(code: string) {
  const fn = new Function(code)
  return fn({ ...runtime }).default as ComponentType<{ components?: MDXComponents }>
}

export function MDXContent({ code, components }: { code: string; components?: MDXComponents }) {
  const Component = getMDXComponent(code)
  return <Component components={components} />
}
