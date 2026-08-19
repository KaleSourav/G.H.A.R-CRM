export default function Pagination({ current, total, onChange, count }) {
  if (total <= 1) return null;

  const pages = [];
  const delta = 2;

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.75rem 0', flexWrap: 'wrap', gap: '0.75rem',
    }}>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        Showing page {current} of {total} ({count?.toLocaleString('en-IN')} records)
      </span>
      <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
        <button
          onClick={() => onChange(current - 1)}
          disabled={current === 1}
          className="btn btn-secondary btn-sm btn-icon"
          title="Previous"
        >
          ←
        </button>

        {pages.map((page, i) =>
          page === '...' ? (
            <span key={`ellipsis-${i}`} style={{ padding: '0 0.25rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>…</span>
          ) : (
            <button
              key={page}
              onClick={() => onChange(page)}
              className={`btn btn-sm ${page === current ? 'btn-primary' : 'btn-secondary'}`}
              style={{ minWidth: 36 }}
            >
              {page}
            </button>
          )
        )}

        <button
          onClick={() => onChange(current + 1)}
          disabled={current === total}
          className="btn btn-secondary btn-sm btn-icon"
          title="Next"
        >
          →
        </button>
      </div>
    </div>
  );
}
