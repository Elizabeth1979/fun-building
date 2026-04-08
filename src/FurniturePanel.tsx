import type { FurnitureItem } from './furniture'
import { FURNITURE_CATALOG, FURNITURE_CATEGORIES } from './furniture'

const MESH_ICON: Record<FurnitureItem['meshType'], string> = {
  box:      '■',
  cylinder: '⬤',
  sphere:   '●',
}

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
        background: 'rgba(255,255,255,0.92)',
        borderRadius: 14,
        padding: '12px 10px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        width: 160,
        maxHeight: 'calc(100vh - 32px)',
        overflowY: 'auto',
        fontFamily: 'system-ui, sans-serif',
        userSelect: 'none',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 2, letterSpacing: 0.5 }}>
        FURNITURE
      </div>
      {FURNITURE_CATEGORIES.map(category => {
        const items = FURNITURE_CATALOG.filter(i => i.category === category)
        return (
          <div key={category}>
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#aaa',
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              padding: '6px 4px 3px',
              borderTop: '1px solid #e0e0e0',
              marginTop: 2,
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
                  gap: 7,
                  padding: '5px 10px',
                  borderRadius: 8,
                  border: '1.5px solid rgba(0,0,0,0.08)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  background: '#f5f5f5',
                  color: '#333',
                  transition: 'background 0.12s',
                  textAlign: 'left',
                  width: '100%',
                  marginBottom: 2,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#e8f0fe' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f5f5f5' }}
              >
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: item.meshType === 'box' ? 3 : '50%',
                    background: item.color,
                    display: 'inline-block',
                    flexShrink: 0,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}
                  aria-label={MESH_ICON[item.meshType]}
                />
                {item.name}
              </button>
            ))}
          </div>
        )
      })}
    </div>
  )
}
