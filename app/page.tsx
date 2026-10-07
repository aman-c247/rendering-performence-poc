import CardContent from '@/components/CardContent'
import LazyLoad from '@/components/LazyLoad'


export default function Home() {
  const ids = Array.from({ length: 30 }, (_, i) => i + 1)
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <h1>Viewport-based loading POC</h1>
      {ids.map((id) => (
        <div key={id} style={{ marginBottom: 24 }}>
          <LazyLoad minHeight={320}>
            <CardContent id={id} />
          </LazyLoad>
        </div>
      ))}
    </main>
  )
}
