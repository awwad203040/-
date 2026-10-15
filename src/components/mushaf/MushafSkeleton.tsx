export default function MushafSkeleton() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FBF8EF' }}>
      {/* Header skeleton */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: '#123B2A' }}>
        <div className="w-8 h-8 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <div className="text-center">
          <div className="w-20 h-4 rounded mx-auto mb-1" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
          <div className="w-28 h-3 rounded mx-auto" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
        </div>
        <div className="w-8 h-8 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
      </div>

      {/* Content skeleton */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-center mb-8">
          <h2
            className="text-2xl font-bold mb-2"
            style={{ color: '#123B2A', fontFamily: "'Tajawal', sans-serif" }}
          >
            نور القرآن
          </h2>
          <p className="text-sm" style={{ color: '#C8A85B', fontFamily: "'Tajawal', sans-serif" }}>
            جاري تحميل المصحف...
          </p>
        </div>

        <div className="w-full max-w-md space-y-4 px-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="skeleton h-6 rounded"
              style={{ width: `${85 - (i % 3) * 15}%`, marginLeft: 'auto', marginRight: 'auto' }}
            />
          ))}
        </div>

        <div className="mt-8">
          <div className="w-8 h-8 border-3 rounded-full animate-spin" style={{ borderColor: '#C8A85B', borderTopColor: 'transparent' }} />
        </div>
      </div>
    </div>
  );
}
