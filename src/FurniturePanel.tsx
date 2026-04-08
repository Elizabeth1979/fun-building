import type { FurnitureItem } from './furniture'
import { FURNITURE_CATALOG, FURNITURE_CATEGORIES } from './furniture'

interface Props {
  onPlaceItem: (template: FurnitureItem) => void
}

export function FurniturePanel({ onPlaceItem }: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        background: '#ffffff',
        borderRadius: 16,
        padding: '14px 12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        minWidth: 160,
        maxHeight: 'calc(100vh - 32px)',
        overflowY: 'auto',
        fontFamily: 'system-ui, sans-serif',
        userSelect: 'none',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: '#666', marginBottom: 4, letterSpacing: 0.5 }}>
        FURNITURE
      </div>
      {FURNITURE_CATEGORIES.map(category => {
        const items = FURNITURE_CATALOG.filter(i => i.category === category)
        return (
          <div key={category}>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#aaa',
              textTransform: 'uppercase',
              letterSpacing: 1,
              padding: '8px 4px 4px',
              borderTop: '1px solid #e8e8e8',
              marginTop: 8,
            }}>
              {category}
            </div>
            {items.map(item => (
              <button
                key={item.id}
                onClick={() => onPlaceItem(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1.5px solid rgba(0,0,0,0.06)',
                  cursor: 'pointer',
                  fontSize: 15,
                  fontWeight: 700,
                  background: '#f5f5f5',
                  color: '#333',
                  transition: 'background 0.12s',
                  textAlign: 'left',
                  width: '100%',
                  marginBottom: 3,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#e0f7f4' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f5f5f5' }}
              >
                <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>
                  {item.emoji ?? '📦'}
                </span>
                {item.name}
              </button>
            ))}
          </div>
        )
      })}
    </div>
  )
}
