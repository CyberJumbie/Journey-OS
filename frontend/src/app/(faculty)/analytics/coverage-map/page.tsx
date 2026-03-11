'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Crosshair, ZoomIn, ZoomOut } from 'lucide-react';
import { C, sans, serif } from '@/lib/design-tokens';

interface MapNode {
  id: string;
  name: string;
  system: string;
  coverage: 'strong' | 'partial' | 'gap' | 'unverified';
  itemCount: number;
  target: number;
  weight: number;
  x: number;
  y: number;
}

interface MapEdge {
  source: string;
  target: string;
}

const MOCK_NODES: MapNode[] = [
  { id: 'n1', name: 'Beta-Blocker Mechanism', system: 'Cardiovascular', coverage: 'strong', itemCount: 14, target: 10, weight: 0.8, x: 300, y: 200 },
  { id: 'n2', name: 'ACE Inhibitor Pharmacology', system: 'Cardiovascular', coverage: 'strong', itemCount: 11, target: 10, weight: 0.9, x: 450, y: 180 },
  { id: 'n3', name: 'Cardiac Ion Channels', system: 'Cardiovascular', coverage: 'partial', itemCount: 4, target: 10, weight: 0.7, x: 380, y: 320 },
  { id: 'n4', name: 'Warfarin Metabolism', system: 'Hematology', coverage: 'partial', itemCount: 6, target: 10, weight: 0.6, x: 550, y: 280 },
  { id: 'n5', name: 'GFR Regulation', system: 'Renal', coverage: 'gap', itemCount: 0, target: 8, weight: 0.85, x: 200, y: 350 },
  { id: 'n6', name: 'Tubular Reabsorption', system: 'Renal', coverage: 'gap', itemCount: 0, target: 8, weight: 0.75, x: 150, y: 250 },
  { id: 'n7', name: 'NMJ Physiology', system: 'Nervous System', coverage: 'strong', itemCount: 12, target: 8, weight: 0.65, x: 600, y: 150 },
  { id: 'n8', name: 'Myasthenia Gravis', system: 'Nervous System', coverage: 'partial', itemCount: 5, target: 8, weight: 0.7, x: 650, y: 250 },
  { id: 'n9', name: 'Baroreceptor Reflex', system: 'Cardiovascular', coverage: 'unverified', itemCount: 0, target: 6, weight: 0.5, x: 350, y: 100 },
  { id: 'n10', name: 'RAAS Feedback', system: 'Cardiovascular', coverage: 'partial', itemCount: 3, target: 8, weight: 0.8, x: 500, y: 100 },
  { id: 'n11', name: 'Diabetic Nephropathy', system: 'Renal', coverage: 'gap', itemCount: 0, target: 10, weight: 0.9, x: 120, y: 400 },
  { id: 'n12', name: 'Loop Diuretics', system: 'Renal', coverage: 'partial', itemCount: 2, target: 6, weight: 0.55, x: 250, y: 450 },
];

const MOCK_EDGES: MapEdge[] = [
  { source: 'n1', target: 'n3' }, { source: 'n2', target: 'n10' },
  { source: 'n3', target: 'n9' }, { source: 'n5', target: 'n6' },
  { source: 'n5', target: 'n11' }, { source: 'n6', target: 'n12' },
  { source: 'n7', target: 'n8' }, { source: 'n2', target: 'n4' },
  { source: 'n1', target: 'n9' }, { source: 'n10', target: 'n2' },
  { source: 'n11', target: 'n12' },
];

const COVERAGE_COLORS: Record<MapNode['coverage'], string> = {
  strong: C.green,
  partial: C.warning,
  gap: C.error,
  unverified: C.warmGray,
};

export default function CoverageMap() {
  const router = useRouter();
  const [nodes, setNodes] = useState<MapNode[]>([]);
  const [edges, setEdges] = useState<MapEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
  const [systemFilter, setSystemFilter] = useState('all');
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await new Promise(r => setTimeout(r, 800));
      setNodes(MOCK_NODES);
      setEdges(MOCK_EDGES);
      setLoading(false);
    })();
  }, []);

  const systems = [...new Set(MOCK_NODES.map(n => n.system))];
  const visibleNodes = systemFilter === 'all' ? nodes : nodes.filter(n => n.system === systemFilter);
  const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
  const visibleEdges = edges.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));

  return (
    <>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={systemFilter} onChange={e => setSystemFilter(e.target.value)} style={{ padding: '8px 28px 8px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: sans, fontSize: 13, background: C.white }}>
          <option value="all">All Systems</option>
          {systems.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setZoom(z => Math.min(z + 0.2, 2))} style={{ padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 6, background: C.white, cursor: 'pointer' }}>
            <ZoomIn size={16} style={{ color: C.textSecondary }} />
          </button>
          <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.4))} style={{ padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 6, background: C.white, cursor: 'pointer' }}>
            <ZoomOut size={16} style={{ color: C.textSecondary }} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 12, marginLeft: 'auto' }}>
          {(['strong', 'partial', 'gap', 'unverified'] as const).map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: COVERAGE_COLORS[s] }} />
              <span style={{ fontFamily: sans, fontSize: 12, color: C.textMuted, textTransform: 'capitalize' }}>{s === 'strong' ? '\u2265 target' : s}</span>
            </div>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 64 }}>
          <RefreshCw size={32} style={{ color: C.blue, animation: 'spin 1s linear infinite' }} />
          <p style={{ fontFamily: sans, color: C.textMuted, marginTop: 16 }}>Rendering force-directed graph...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {!loading && (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0, background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', position: 'relative', height: 520 }}>
            <svg width="100%" height="100%" viewBox={`0 0 ${800 / zoom} ${520 / zoom}`} style={{ display: 'block' }}>
              {visibleEdges.map((e, i) => {
                const src = visibleNodes.find(n => n.id === e.source);
                const tgt = visibleNodes.find(n => n.id === e.target);
                if (!src || !tgt) return null;
                return <line key={i} x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y} stroke={C.borderLight} strokeWidth={1.5} />;
              })}
              {visibleNodes.map(node => {
                const r = 10 + node.weight * 16;
                const isSelected = selectedNode?.id === node.id;
                const dimmed = systemFilter !== 'all' && node.system !== systemFilter;
                return (
                  <g key={node.id} style={{ cursor: 'pointer', opacity: dimmed ? 0.3 : 1 }} onClick={() => setSelectedNode(node)}>
                    <circle cx={node.x} cy={node.y} r={r} fill={COVERAGE_COLORS[node.coverage]} stroke={isSelected ? C.blue : C.white} strokeWidth={isSelected ? 3 : 2} />
                    <text x={node.x} y={node.y + r + 14} textAnchor="middle" fontSize={10} fontFamily={sans} fill={C.textSecondary}>
                      {node.name.length > 18 ? node.name.slice(0, 16) + '\u2026' : node.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {selectedNode && (
            <div style={{ width: 280, flexShrink: 0, background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, alignSelf: 'flex-start' }}>
              <div style={{ fontFamily: serif, fontSize: 16, color: C.textPrimary, marginBottom: 4 }}>{selectedNode.name}</div>
              <div style={{ fontFamily: sans, fontSize: 13, color: C.textMuted, marginBottom: 16 }}>{selectedNode.system}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div style={{ padding: 10, background: C.cream, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontFamily: sans, fontSize: 20, color: COVERAGE_COLORS[selectedNode.coverage] }}>{selectedNode.itemCount}</div>
                  <div style={{ fontFamily: sans, fontSize: 11, color: C.textMuted }}>Items</div>
                </div>
                <div style={{ padding: 10, background: C.cream, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontFamily: sans, fontSize: 20, color: C.textPrimary }}>{selectedNode.target}</div>
                  <div style={{ fontFamily: sans, fontSize: 11, color: C.textMuted }}>Target</div>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 10, fontSize: 12, fontFamily: sans, textTransform: 'capitalize', background: `${COVERAGE_COLORS[selectedNode.coverage]}18`, color: COVERAGE_COLORS[selectedNode.coverage] }}>
                  {selectedNode.coverage === 'strong' ? '\u2265 Target' : selectedNode.coverage}
                </span>
              </div>
              {(selectedNode.coverage === 'gap' || selectedNode.coverage === 'partial') && (
                <button onClick={() => router.push('/generation')} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px', background: C.blue, color: C.white, border: 'none', borderRadius: 8, fontFamily: sans, fontSize: 13, cursor: 'pointer' }}>
                  <Crosshair size={14} /> Generate Questions
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
