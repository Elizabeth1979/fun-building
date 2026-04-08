import type { FurnitureItem } from './furniture'
import { FURNITURE_CATALOG } from './furniture'

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
        gap: 6,
        minWidth: 110,
        fontFamily: 'system-ui, sans-serif',
        userSelect: 'none',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 2, letterSpacing: 0.5 }}>
        FURNITURE
      </div>
      {FURNITURE_CATALOG.map(item => (
        <button
          key={item.id}
          onClick={() => onPlaceItem(item)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '6px 10px',
            borderRadius: 8,
            border: '1.5px solid rgba(0,0,0,0.08)',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            background: '#f5f5f5',
            color: '#333',
            transition: 'background 0.12s',
            textAlign: 'left',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#e8f0fe' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f5f5f5' }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: item.meshType === 'sphere' ? '50%' : item.meshType === 'cylinder' ? '50%' : 3,
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
}
