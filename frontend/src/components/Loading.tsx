export function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function PageLoading() {
  return (
    <div className="flex items-center justify-center py-24 text-espresso/60">
      <Spinner className="w-8 h-8" />
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-almond" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-almond rounded w-3/4" />
        <div className="h-3 bg-almond rounded w-full" />
        <div className="h-3 bg-almond rounded w-1/2" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 bg-almond rounded w-full" />
        </td>
      ))}
    </tr>
  );
}
