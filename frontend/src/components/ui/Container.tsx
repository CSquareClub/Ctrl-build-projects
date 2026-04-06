import type { ReactNode } from 'react'

type ContainerProps = {
  children: ReactNode
  className?: string
}

export function Container({ children, className = '' }: ContainerProps) {
  return <div className={['w-full max-w-[1400px] mx-auto', className].join(' ')}>{children}</div>
}
