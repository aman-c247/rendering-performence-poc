'use client'
import { useEffect, useState } from 'react';

export default function CardContent({ id }: { id: number }) {
  const [data, setData] = useState<{ title: string; body: string } | null>(null)

  useEffect(() => {
    fetch(`/api/card/${id}`)
      .then((r) => r.json())
      .then(setData)
  }, [id])

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://picsum.photos/seed/${id}/600/200`}
        width={600}
        height={200}
        alt={`Card ${id}`}
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      <h3>{data?.title ?? 'Loading...'}</h3>
      <p>{data?.body}</p>
    </div>
  )
}
