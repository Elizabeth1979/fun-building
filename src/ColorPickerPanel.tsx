import type { Surface, RoomColors } from './useRoomColors'
import { SURFACES } from './useRoomColors'

const SWATCHES = [
  '#ffe9c8', '#c8a96e', '#ffffff',
  '#ffb3b3', '#ffd93d', '#6bcb77',
  '#4d96ff', '#c084fc', '#ff6b6b',
]

interface Props {
  selectedSurface: Surface
  onSurfaceChange: (s: Surface) => void
  colors: RoomColors
  onColorChange: (surface: Surface, color: string) => void
  onSave: () => void
  onLoad: () => void
}

export function ColorPickerPanel({
  selectedSurface,
  onSurfaceChange,
  colors,
  onColorChange,
  onSave,
  onLoad,
}: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        background: 'rgba(255,255,255,0.92)',
        borderRadius: 14,
        padding: '14px 16px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        minWidth: 172,
        fontFamily: 'system-ui, sans-serif',
        userSelect: 'none',
      }}
    >
      {/* Surface selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {SURFACES.map(s => (
          <button
            key={s}
            onClick={() => onSurfaceChange(s)}
            style={{
              flex: 1,
              padding: '5px 0',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              background: selectedSurface === s ? '#4d96ff' : '#eee',
              color: selectedSurface === s ? '#fff' : '#555',
              transition: 'background 0.15s',
            }}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Color swatches */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 }}>
        {SWATCHES.map(c => (
          <button
            key={c}
            onClick={() => onColorChange(selectedSurface, c)}
            aria-label={c}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: c,
              border: colors[selectedSurface] === c
                ? '3px solid #333'
                : '2px solid rgba(0,0,0,0.12)',
              cursor: 'pointer',
              padding: 0,
            }}
          />
        ))}
      </div>

      {/* Free color input */}
      <input
        type="color"
        value={colors[selectedSurface]}
        onChange={e => onColorChange(selectedSurface, e.target.value)}
        style={{
          width: '100%',
          height: 34,
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          padding: 2,
        }}
        title="Pick any color"
      />

      {/* Save / Load */}
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        <button
          onClick={onSave}
          style={{
            flex: 1,
            padding: '5px 0',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
            background: '#6bcb77',
            color: '#fff',
          }}
        >
          Save
        </button>
        <button
          onClick={onLoad}
          style={{
            flex: 1,
            padding: '5px 0',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
            background: '#4d96ff',
            color: '#fff',
          }}
        >
          Load
        </button>
      </div>
    </div>
  )
}
