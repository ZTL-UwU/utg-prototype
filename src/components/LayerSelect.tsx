// import { useEffect } from "react";
// import { SceneManager } from "../sceneManager";
// import { LevelScene } from "../scenes/level";

interface LayerSelectProps {
  onClose: () => void;
}
function LayerSelect({ onClose }: LayerSelectProps) {
  // const manager = new SceneManager();
  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        className="relative"
        style={{
          background: '#f5e9c8',
          border: '3px solid #c8a96e',
          borderRadius: 12,
          padding: '48px 56px',
          width: 540,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* X button */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 16,
            left: 20,
            background: 'none',
            border: 'none',
            fontSize: 22,
            fontWeight: 700,
            color: '#7a4a2a',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>

        {/* Swap this div for your PNG once you're ready */}
        <div
          style={{
            height: 220,
            background: '#e8d8a8',
            borderRadius: 8,
            marginBottom: 16,
          }}
        />

        {/* Level buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          {['Learn', 'Type', 'Locked'].map((label, i) => (
            <button
              key={label}
              disabled={i === 2}
              onClick={() => {
                /* onSelectLevel(i + 1) */
              }}
              style={{
                background: i === 2 ? '#c8a96e' : '#7a5a2a',
                color: '#f5e9c8',
                border: 'none',
                borderRadius: 20,
                padding: '6px 20px',
                fontSize: 13,
                fontWeight: 600,
                cursor: i === 2 ? 'default' : 'pointer',
                opacity: i === 2 ? 0.6 : 1,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LayerSelect;
