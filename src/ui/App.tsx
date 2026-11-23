import React, { useEffect, useState } from 'react';
import type { AppStatus, Snapshot } from '../preload/ipc.js';
import { MapCanvas } from './MapCanvas.js';
import { Controls } from './Controls.js';

const PAGE: React.CSSProperties = {
  fontFamily: 'system-ui, sans-serif',
  color: '#e6e6e6',
  background: '#151515',
  minHeight: '100vh',
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

export function App(): React.JSX.Element {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<AppStatus | null>(null);
  const bridgeAvailable = window.genesis !== undefined;

  useEffect(() => {
    if (!window.genesis) return;
    return window.genesis.onSnapshot(setSnap);
  }, []);

  useEffect(() => {
    if (!window.genesis) return;
    return window.genesis.onStatus(setStatus);
  }, []);

  return (
    <div style={PAGE}>
      <h1 style={{ margin: 0, fontSize: 20 }}>GENESIS</h1>
      <div style={{ display: 'flex', gap: 24, fontVariantNumeric: 'tabular-nums' }}>
        <span>
          tick <strong>{snap?.tick ?? 0}</strong>
        </span>
        <span>alive {snap?.alive ?? 0}</span>
        <span>dead {snap?.dead ?? 0}</span>
      </div>
      {!bridgeAvailable && (
        <div role="status" style={{ padding: 10, border: '1px solid #8a6d2f', background: '#332a16', color: '#f4cf73' }}>
          Browser preview mode: the Electron simulation bridge is unavailable, so controls are disabled.
        </div>
      )}
      <Controls tick={snap?.tick ?? 0} enabled={bridgeAvailable} />
      {status && (
        <section style={{ padding: 12, border: '1px solid #333', background: '#1d1d1d', maxWidth: 700 }}>
          <div style={{ color: '#8bd3ff' }}>
            AI mode · {status.model} · {status.agentCount} agents · {status.busy ? 'thinking…' : 'ready'}
          </div>
          <div style={{ color: '#aaa', fontSize: 12, marginTop: 4 }}>
            Every living agent calls the model every tick; no heuristic fallback.
          </div>
          {status.lastDecision && (
            <div style={{ marginTop: 10 }}>
              <strong>{status.lastDecision.agentId}</strong> · tick {status.lastDecision.tick} ·{' '}
              {(status.lastDecision.latencyMs / 1000).toFixed(1)}s ·{' '}
              {status.lastDecision.parseOk ? 'valid action' : 'rejected/invalid'}
              <pre style={{ whiteSpace: 'pre-wrap', color: '#cfcfcf', marginBottom: 0 }}>{status.lastDecision.response}</pre>
            </div>
          )}
        </section>
      )}
      <MapCanvas snapshot={snap} />
      <p style={{ color: '#777', fontSize: 12, margin: 0 }}>
        Ollama LLM agents. Ore (gold, north) is useless by design; grain (yellow, east) is food,
        water (blue, south) is drink. Red agents are starving.
      </p>
    </div>
  );
}
