'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
  BaseEdge,
  getBezierPath,
  EdgeProps
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// --- CUSTOM NODES ---

const renderHandles = () => (
  <>
    <Handle type="source" position={Position.Top} id="top" style={{ background: '#555' }} />
    <Handle type="source" position={Position.Right} id="right" style={{ background: '#555' }} />
    <Handle type="source" position={Position.Bottom} id="bottom" style={{ background: '#555' }} />
    <Handle type="source" position={Position.Left} id="left" style={{ background: '#555' }} />
  </>
);

const MaleNode = ({ data, selected }: any) => {
  return (
    <div style={{ position: 'relative', width: 60, height: 60, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{
        width: 40, height: 40, border: data.isMain ? '4px double #333' : '2px solid #333', background: selected ? '#e0f7fa' : '#fff', position: 'relative'
      }}>
        {data.deceased && (
          <svg style={{ position: 'absolute', top: -2, left: -2, width: 40, height: 40 }} viewBox="0 0 100 100">
            <line x1="0" y1="0" x2="100" y2="100" stroke="black" strokeWidth="4" />
            <line x1="100" y1="0" x2="0" y2="100" stroke="black" strokeWidth="4" />
          </svg>
        )}
      </div>
      {renderHandles()}
      <div style={{ position: 'absolute', top: 62, fontSize: '10px', textAlign: 'center', width: 120, left: -30 }}>
        <strong>{data.label}</strong>
        {data.age && <div>{data.age} años</div>}
        {data.health && <div style={{ color: 'red' }}>{data.health}</div>}
        {data.education && <div style={{ color: '#555' }}>{data.education}</div>}
      </div>
    </div>
  );
};

const FemaleNode = ({ data, selected }: any) => {
  return (
    <div style={{ position: 'relative', width: 60, height: 60, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%', border: data.isMain ? '4px double #333' : '2px solid #333', background: selected ? '#fce4ec' : '#fff', position: 'relative'
      }}>
        {data.deceased && (
          <svg style={{ position: 'absolute', top: -2, left: -2, width: 40, height: 40 }} viewBox="0 0 100 100">
            <line x1="0" y1="0" x2="100" y2="100" stroke="black" strokeWidth="4" />
            <line x1="100" y1="0" x2="0" y2="100" stroke="black" strokeWidth="4" />
          </svg>
        )}
      </div>
      {renderHandles()}
      <div style={{ position: 'absolute', top: 62, fontSize: '10px', textAlign: 'center', width: 120, left: -30 }}>
        <strong>{data.label}</strong>
        {data.age && <div>{data.age} años</div>}
        {data.health && <div style={{ color: 'red' }}>{data.health}</div>}
        {data.education && <div style={{ color: '#555' }}>{data.education}</div>}
      </div>
    </div>
  );
};

// --- CUSTOM EDGES ---

const GenogramEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, selected, data }: EdgeProps) => {
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  
  const relType = data?.relType || 'normal';

  if (relType === 'fusionada') {
    return (
      <g>
        <path d={edgePath} fill="none" stroke="#222" strokeWidth={5} />
        <path d={edgePath} fill="none" stroke="#fff" strokeWidth={2} />
      </g>
    );
  }
  if (relType === 'distante') {
    return <path d={edgePath} fill="none" stroke="#666" strokeWidth={2} strokeDasharray="5 5" />;
  }
  if (relType === 'conflictiva') {
    return <path d={edgePath} fill="none" stroke="red" strokeWidth={2} strokeDasharray="5 5" />;
  }
  if (relType === 'ruptura') {
    return (
      <g>
        <path d={edgePath} fill="none" stroke="#222" strokeWidth={2} />
        <line x1={labelX - 10} y1={labelY - 10} x2={labelX + 10} y2={labelY + 10} stroke="#222" strokeWidth={3} />
        <line x1={labelX - 10} y1={labelY + 10} x2={labelX + 10} y2={labelY - 10} stroke="#222" strokeWidth={3} />
      </g>
    );
  }
  if (relType === 'fusionada_conflictiva') {
    return (
      <g>
        <path d={edgePath} fill="none" stroke="#222" strokeWidth={5} />
        <path d={edgePath} fill="none" stroke="#fff" strokeWidth={2} />
        <path d={edgePath} fill="none" stroke="red" strokeWidth={1} strokeDasharray="3 3" />
      </g>
    );
  }

  return <BaseEdge path={edgePath} style={{ strokeWidth: 2, stroke: '#333', ...style }} />;
};

const UnionNode = ({ selected }: any) => {
  return (
    <div style={{ position: 'relative', width: 20, height: 20, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{
        width: 10, height: 10, borderRadius: '50%', background: selected ? '#ff4081' : '#333'
      }} />
      <Handle type="source" position={Position.Top} id="top" style={{ background: '#555', top: -5 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ background: '#555', right: -5 }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ background: '#555', bottom: -5 }} />
      <Handle type="source" position={Position.Left} id="left" style={{ background: '#555', left: -5 }} />
    </div>
  );
};

const nodeTypes = {
  male: MaleNode,
  female: FemaleNode,
  union: UnionNode
};

const edgeTypes = {
  genogram: GenogramEdge
};

export default function GenogramaEditor({ initialNodes = [], initialEdges = [], onChange, readOnly = false }: { initialNodes?: Node[], initialEdges?: Edge[], onChange?: (n: Node[], e: Edge[], b64?: string) => void, readOnly?: boolean }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const onConnect = useCallback((params: Connection) => {
    const newEdge = { ...params, type: 'genogram', data: { relType: 'normal' } };
    setEdges((eds) => addEdge(newEdge, eds));
    setTimeout(() => save(), 100);
  }, [setEdges]);

  const save = (overrideBase64?: string) => {
    if (onChange) onChange(nodes, edges, overrideBase64);
  };

  const captureForPDF = async () => {
    try {
      const { toPng } = await import('html-to-image');
      const element = document.querySelector('.react-flow') as HTMLElement;
      if (element) {
        element.classList.add('hide-handles');
        
        await new Promise(r => setTimeout(r, 100)); // allow css to apply
        
        const dataUrl = await toPng(element, { backgroundColor: '#ffffff', pixelRatio: 2 });
        
        element.classList.remove('hide-handles');
        save(dataUrl);
        alert('Imagen capturada con éxito. Ahora se verá en el PDF.');
      }
    } catch (err) {
      console.error('Error capturing image:', err);
      alert('Error al capturar la imagen. Inténtelo de nuevo.');
    }
  };

  const addNode = (gender: 'male' | 'female' | 'union') => {
    const newNode: Node = {
      id: `node_${Date.now()}`,
      type: gender,
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      data: gender === 'union' ? { label: '' } : {
        label: `Persona ${nodes.length + 1}`,
        age: '', health: '', education: '', isMain: false, deceased: false
      }
    };
    setNodes((ns) => [...ns, newNode]);
    setTimeout(() => save(), 100);
  };

  const updateSelectedNode = (key: string, value: any) => {
    if (!selectedNodeId) return;
    setNodes((ns) => ns.map(n => {
      if (n.id === selectedNodeId) {
        return { ...n, data: { ...n.data, [key]: value } };
      }
      return n;
    }));
    setTimeout(() => save(), 100);
  };

  const updateSelectedEdge = (relType: string) => {
    if (!selectedEdgeId) return;
    setEdges((es) => es.map(e => {
      if (e.id === selectedEdgeId) {
        return { ...e, data: { ...e.data, relType } };
      }
      return e;
    }));
    setTimeout(() => save(), 100);
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedEdge = edges.find(e => e.id === selectedEdgeId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '600px', border: 'none', overflow: 'hidden' }}>
      <style dangerouslySetInnerHTML={{__html: `
        .hide-handles .react-flow__handle { display: none !important; }
        .hide-handles .react-flow__background { opacity: 0 !important; }
        ${readOnly ? `
          .react-flow__handle { display: none !important; }
          .react-flow__background { opacity: 0 !important; }
        ` : ''}
      `}} />
      {/* TOOLBAR */}
      {!readOnly && (
        <div style={{ padding: '10px', background: '#f5f5f5', borderBottom: '1px solid #ccc', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="btn btn-secondary" onClick={() => addNode('male')}>+ Hombre (■)</button>
          <button type="button" className="btn btn-secondary" onClick={() => addNode('female')}>+ Mujer (●)</button>
          <button type="button" className="btn btn-secondary" onClick={() => addNode('union')} style={{ borderStyle: 'dashed' }}>+ Unión (Punto)</button>
          <button type="button" className="btn btn-tertiary" onClick={() => {
             if (selectedNodeId) {
               setNodes(ns => ns.filter(n => n.id !== selectedNodeId));
               setSelectedNodeId(null);
               setTimeout(() => save(), 100);
             }
             if (selectedEdgeId) {
               setEdges(es => es.filter(e => e.id !== selectedEdgeId));
               setSelectedEdgeId(null);
               setTimeout(() => save(), 100);
             }
          }}>Eliminar Seleccionado</button>
          <div style={{ flex: 1 }} />
          <button type="button" className="btn btn-primary" onClick={captureForPDF} style={{ background: '#005f73' }}>
            📸 Capturar para PDF
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* CANVAS */}
        <div style={{ flex: 1, position: 'relative' }} onMouseUp={() => setTimeout(save, 100)}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onSelectionChange={(params) => {
              setSelectedNodeId(params.nodes[0]?.id || null);
              setSelectedEdgeId(params.edges[0]?.id || null);
            }}
            connectionMode={'loose' as any}
            fitView
          >
            <Controls />
            <Background color="#ccc" gap={16} />
          </ReactFlow>
        </div>

        {/* PROPERTIES PANEL */}
        {!readOnly && (
          <div style={{ width: '250px', background: '#fafafa', borderLeft: '1px solid #ccc', padding: '15px', overflowY: 'auto' }}>
            <h4>Propiedades</h4>
            
            {selectedNode && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                <div><label>Nombre/Rol</label><input className="input-field" value={selectedNode.data.label as string || ''} onChange={e => updateSelectedNode('label', e.target.value)} /></div>
                <div><label>Edad</label><input type="number" className="input-field" value={selectedNode.data.age as string || ''} onChange={e => updateSelectedNode('age', e.target.value)} /></div>
                <div><label>Enfermedades/Salud</label><input className="input-field" placeholder="Ej: DB, ALC..." value={selectedNode.data.health as string || ''} onChange={e => updateSelectedNode('health', e.target.value)} /></div>
                <div><label>Educación/Extra</label><input className="input-field" value={selectedNode.data.education as string || ''} onChange={e => updateSelectedNode('education', e.target.value)} /></div>
                <div>
                  <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: 10}}>
                    <input type="checkbox" checked={selectedNode.data.isMain as boolean || false} onChange={e => updateSelectedNode('isMain', e.target.checked)} />
                    Consultante Principal
                  </label>
                </div>
                <div>
                  <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                    <input type="checkbox" checked={selectedNode.data.deceased as boolean || false} onChange={e => updateSelectedNode('deceased', e.target.checked)} />
                    Fallecido (X)
                  </label>
                </div>
              </div>
            )}

            {selectedEdge && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                <label>Tipo de Relación</label>
                <select className="input-field" value={selectedEdge.data?.relType as string || 'normal'} onChange={e => updateSelectedEdge(e.target.value)}>
                  <option value="normal">Normal / Consanguinidad</option>
                  <option value="fusionada">Fusionada (===)</option>
                  <option value="conflictiva">Conflictiva (/\/\/\)</option>
                  <option value="distante">Distante (- - -)</option>
                  <option value="ruptura">Ruptura (—X—)</option>
                  <option value="fusionada_conflictiva">Fusionada y Conflictiva</option>
                </select>
                <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '1rem' }}>
                  Conecta los puntos (arriba y abajo) de los miembros para crear uniones biológicas o matrimoniales. Selecciona la línea para cambiar su estilo.
                </p>
              </div>
            )}

            {!selectedNode && !selectedEdge && (
              <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '10px' }}>Selecciona un miembro o una línea para editar sus detalles aquí.</p>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
