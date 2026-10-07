'use client'
import { ReactNode } from 'react'
import { useInView } from '@/hooks/useInView'

interface Props {
  children: ReactNode
  placeholder?: ReactNode
  minHeight?: number
  rootMargin?: string
}

export default function LazyLoad({
  children,
  placeholder,
  minHeight = 300,
  rootMargin = '200px 0px',
}: Props) {
  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin })

  return (
    <div ref={ref} style={{ minHeight }}>
      {inView
        ? children
        : (placeholder ?? (
            <div
              style={{
                height: minHeight,
                background: '#e5e7eb',
                borderRadius: 8,
              }}
              aria-busy="true"
            />
          ))}
    </div>
  )
}
