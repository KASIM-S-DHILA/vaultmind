import React from 'react';

interface CollapseButtonProps {
  collapsed: boolean;
  onToggle: () => void;
  side: 'left' | 'right';
  offset: string;
}

/**
 * Small toggle button that appears on the edge of a collapsible panel.
 * Pointing inwards when the panel is open and outwards when closed.
 */
export default function CollapseButton({ collapsed, onToggle, side, offset }: CollapseButtonProps) {
  const isLeft = side === 'left';
  return (
    <button
      onClick={onToggle}
      style={{
        position: 'absolute',
        [side]: collapsed ? 0 : offset,
        top: '50%', transform: 'translateY(-50%)',
        width: 18, height: 48, zIndex: 10,
        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        borderRadius: isLeft ? '0 var(--radius-sm) var(--radius-sm) 0' : 'var(--radius-sm) 0 0 var(--radius-sm)',
        cursor: 'pointer', color: 'var(--text-tertiary)',
        fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: `${side} 0.25s ease`,
      }}
    >
      {collapsed ? (isLeft ? '›' : '‹') : (isLeft ? '‹' : '›')}
    </button>
  );
}
