import React, { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

// ---------- helpers ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const uid = () => Math.random().toString(36).slice(2, 9);

// 2D <-> screen
function make2DTransform(width, height, world) {
  const { xmin, xmax, ymin, ymax } = world;
  const sx = width / (xmax - xmin);
  const sy = height / (ymax - ymin);
  const toPx = ([x, y]) => [(x - xmin) * sx, height - (y - ymin) * sy];
  const toWorld = ([px, py]) => [px / sx + xmin, (height - py) / sy + ymin];
  return { toPx, toWorld };
}

// simple 3D iso projection (fixed)
// Rotation + orthografische Projektion
// Orthografische Projektion mit Orbit

function Canvas3D({ vectors, selected, setSelected, updateVector, combo }) {
  const W = 720, H = 460, s = 24;
  const [yaw, setYaw] = React.useState(Math.PI / 4);
  const [pitch, setPitch] = React.useState(Math.PI / 6); // clamp in (-π/2, π/2)
  const center = [W / 2, H / 2];

  const svgRef = React.useRef(null);
  const drag = React.useRef({ mode: null, id: null, x: 0, y: 0 });
  const floatPos = React.useRef(new Map()); // id -> [x,y,z] (float während Drag)

  // Projektion (orthografisch) mit Orbit
  const toPx = React.useCallback(
    ([x, y, z]) => {
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      const cx = Math.cos(pitch), sx = Math.sin(pitch);
      // Rz(yaw) -> Rx(pitch)
      const xr =  cy * x - sy * y;
      const yr =  sy * x + cy * y;
      const zr =  z;
      const X = xr;
      const Y = cx * yr - sx * zr;
      return [center[0] + X * s, center[1] + Y * s];
    },
    [yaw, pitch]
  );

  // ---------- Drag-Steuerung ----------
  const startOrbit = (e) => {
    drag.current = { mode: "orbit", id: null, x: e.clientX, y: e.clientY };
    svgRef.current.setPointerCapture?.(e.pointerId);
  };

  const startDragVec = (id) => (e) => {
    e.stopPropagation();
    drag.current = { mode: "vec", id, x: e.clientX, y: e.clientY };
    setSelected(id);
    const v = vectors.find(v => v.id === id);
    if (v) floatPos.current.set(id, [...v.val]);
    svgRef.current.setPointerCapture?.(e.pointerId);
  };

  const onMove = (e) => {
    if (!drag.current.mode) return;

    if (drag.current.mode === "orbit") {
      const dx = e.clientX - drag.current.x;
      const dy = e.clientY - drag.current.y;
      setYaw((y) => y - dx * 0.01); // rechts = nach rechts
      setPitch((p) => {
        const next = p - dy * 0.01; // hoch = nach vorn kippen
        const lim = Math.PI / 2 - 0.12;
        return Math.max(-lim, Math.min(lim, next));
      });
      drag.current.x = e.clientX; drag.current.y = e.clientY;
      return;
    }

    if (drag.current.mode === "vec" && drag.current.id) {
      // Bildschirm-Deltas (stabil, ohne movementX/Y)
      const dXs = e.clientX - drag.current.x;
      const dYs = e.clientY - drag.current.y;
      drag.current.x = e.clientX; drag.current.y = e.clientY;

      // Bildschirmachsen -> Weltachsen (Inverse von Rx(pitch)*Rz(yaw))
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      const cp = Math.cos(pitch), sp = Math.sin(pitch);
      // e_x^world und e_y^world (Spalten von R^{-1})
      const ex_world = [  cy,    -sy,   0   ];
      const ey_world = [  sy*cp,  cy*cp, -sp ];

      // Schritt in Welt (Skalierung s)
      const stepX = dXs / s, stepY = dYs / s;
      const step = [
        stepX * ex_world[0] + stepY * ey_world[0],
        stepX * ex_world[1] + stepY * ey_world[1],
        stepX * ex_world[2] + stepY * ey_world[2],
      ];

      const id = drag.current.id;
      const cur = floatPos.current.get(id) ?? vectors.find(v => v.id === id)?.val ?? [0,0,0];
      const next = [cur[0] + step[0], cur[1] + step[1], cur[2] + step[2]];
      floatPos.current.set(id, next);

      // während des Drags weich (ohne Runden)
      updateVector(id, next);
    }
  };

  const endAll = (e) => {
    if (drag.current.mode === "vec" && drag.current.id) {
      const id = drag.current.id;
      const cur = floatPos.current.get(id);
      if (cur) {
        updateVector(id, [Math.round(cur[0]), Math.round(cur[1]), Math.round(cur[2] ?? 0)]);
        floatPos.current.delete(id);
      }
    }
    drag.current = { mode: null, id: null, x: 0, y: 0 };
    svgRef.current.releasePointerCapture?.(e.pointerId);
  };

  return (
    <svg
      ref={svgRef}
      width={W}
      height={H}
      className="bg-white rounded-lg select-none"
      onPointerDown={(e) => { if (e.target === svgRef.current) startOrbit(e); }}
      onPointerMove={onMove}
      onPointerUp={endAll}
      onPointerLeave={endAll}
    >
      {/* Bodenraster */}

      <g opacity={0.6}>
        {[...Array(11)].map((_, i) => {
          const t = i - 5;
          const a1 = toPx([t, -5, 0]), a2 = toPx([t, 5, 0]);
          const b1 = toPx([-5, t, 0]), b2 = toPx([5, t, 0]);
          return (
            <g key={i}>
              <line x1={a1[0]} y1={a1[1]} x2={a2[0]} y2={a2[1]} stroke="#e5e7eb" />
              <line x1={b1[0]} y1={b1[1]} x2={b2[0]} y2={b2[1]} stroke="#e5e7eb" />
            </g>
          );
        })}
      </g>
<g pointerEvents="none">
  <Region3D vectors={vectors} combo={combo} toPx={toPx} W={W} H={H} />
</g>
      {/* Achsen */}

      <Axis3D toPx={toPx} />

      {/* Vektoren */}
      {vectors.map((v, i) => {
        const [ox, oy] = toPx([0, 0, 0]);
        const [px, py] = toPx(v.val);
        const sel = selected === v.id;
        return (
          <g key={v.id} style={{ cursor: "pointer" }}>
            {/* unsichtbare breite Linie als Hit-Area */}
            <line
              x1={ox} y1={oy} x2={px} y2={py}
              stroke="black" strokeOpacity="0" strokeWidth="16"
              style={{ pointerEvents: "stroke" }}
              onPointerDown={startDragVec(v.id)}
            />
            {/* sichtbarer Vektor */}
            <line x1={ox} y1={oy} x2={px} y2={py}
                  stroke={sel ? "#dc2626" : "black"} strokeWidth={sel ? 3 : 2} />
            <polygon
              points={`${px},${py} ${px-8},${py-4} ${px-8},${py+4}`}
              fill={sel ? "#dc2626" : "black"}
            />
            <circle
              cx={px} cy={py} r={6}
              fill={sel ? "#fecaca" : "white"} stroke={sel ? "#dc2626" : "black"}
              onPointerDown={startDragVec(v.id)}
            />
            <text x={px + 8} y={py - 8} className="font-mono text-xs">v{i + 1}</text>
          </g>
        );
      })}
    </svg>
  );
}

// einfache isometrische Achsen (x,y,z)
function Axis3D({ toPx }) {
  const axes = [
    { from: [0, 0, 0], to: [5, 0, 0], label: "x" },
    { from: [0, 0, 0], to: [0, 5, 0], label: "y" },
    { from: [0, 0, 0], to: [0, 0, 5], label: "z" },
  ];
  return (
    <g>
      {axes.map((a) => {
        const [x1, y1] = toPx(a.from);
        const [x2, y2] = toPx(a.to);
        return (
          <g key={a.label}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="black" />
            <text x={x2 + 6} y={y2 - 6} className="font-mono text-xs">{a.label}</text>
          </g>
        );
      })}
    </g>
  );
}

// ---------- main page ----------
export default function Linearkombinationen() {
  const [mode, setMode] = useState("2d"); // "2d" | "3d"
  const [combo, setCombo] = useState("linear"); // linear | affine | convex | cone
  const [vectors, setVectors] = useState([]); // {id, val:[x,y] | [x,y,z]}
  const [selected, setSelected] = useState(null);

  const world2D = { xmin: -10, xmax: 10, ymin: -7, ymax: 7 };

  const addVector = () => {
    setVectors(v => [...v, { id: uid(), val: mode === "2d" ? [0, 0] : [0, 0, 0] }]);
  };

  const updateVector = (id, next) => {
    setVectors(v => v.map(it => (it.id === id ? { ...it, val: next } : it)));
  };

  const removeVector = (id) => {
    setVectors(v => v.filter(it => it.id !== id));
    if (selected === id) setSelected(null);
  };

// --- Änderungen in ComboBadge ---
const ComboBadge = () => (
  <div className="flex gap-2 items-center text-sm">
    <span className="font-mono">Typ:</span>
    {["linear", "affine", "convex", "cone", "hyperplane"].map(t => (
      <button
        key={t}
        onClick={() => setCombo(t)}
        className={`px-2 py-1 border rounded ${
          combo === t
            ? "border-black bg-black text-white"
            : "border-black bg-white text-black hover:text-red-600 hover:border-red-600"
        }`}
      >
        {t}
      </button>
    ))}
  </div>
);


  const ModeBadge = () => (
    <div className="flex gap-2 items-center text-sm">
      <span className="font-mono">Ansicht:</span>
      {["2d", "3d"].map(t => (
        <button
          key={t}
          onClick={() => {
            setMode(t);
            // konvertiere existierende Vektoren zwischen 2D/3D ohne Werteverlust
            setVectors(v =>
              v.map(it => ({
                ...it,
                val:
                  t === "2d"
                    ? [it.val[0] ?? 0, it.val[1] ?? 0]
                    : [it.val[0] ?? 0, it.val[1] ?? 0, it.val[2] ?? 0],
              }))
            );
          }}
          className={`px-2 py-1 border rounded ${
            mode === t
              ? "border-black bg-black text-white"
              : "border-black bg-white text-black hover:text-red-600 hover:border-red-600"
          }`}
        >
          {t.toUpperCase()}
        </button>
      ))}
    </div>
  );

  const RuleHint = () => {
    const rules = {
      linear: "x = Σ αᵢ vᵢ,   αᵢ ∈ ℝ",
      affine: "x = Σ αᵢ vᵢ,   Σ αᵢ = 1",
      convex: "x = Σ αᵢ vᵢ,   αᵢ ≥ 0,  Σ αᵢ = 1",
      cone:   "x = Σ αᵢ vᵢ,   αᵢ ≥ 0",
    };
    return (
      <div className="font-mono text-sm">
        {rules[combo]}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      {/* Header */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-black">
        <div className="flex items-center gap-4">
          <Link to="/" className="hover:text-red-600">← Zurück</Link>
          <h1 className="text-2xl font-bold">Linearkombinationen</h1>
        </div>
        <div className="flex gap-6">
          <ModeBadge />
          <ComboBadge />
        </div>
      </nav>

      {/* Body */}
      <div className="max-w-6xl mx-auto p-4 grid grid-cols-12 gap-4" style={{ height: "calc(100vh - 76px)" }}>
        {/* Sidebar: Vektorliste */}
        <aside className="col-span-4 border border-black rounded-lg p-3 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">Vektoren</div>
            <button
              onClick={addVector}
              className="px-2 py-1 border border-black rounded hover:text-red-600 hover:border-red-600"
              title="Vektor hinzufügen"
            >
              + Neu
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            {vectors.length === 0 && (
              <div className="text-sm text-black/60">Keine Vektoren. Mit „+ Neu“ starten (setzt {mode === "2d" ? "[0,0]" : "[0,0,0]"}).</div>
            )}

            <ul className="space-y-2">
              {vectors.map((v, idx) => (
                <li
                  key={v.id}
                  className={`border rounded p-2 ${selected === v.id ? "border-red-600" : "border-black"}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-mono text-sm">v{idx + 1}</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelected(v.id)}
                        className="px-2 py-0.5 border border-black rounded text-sm hover:text-red-600 hover:border-red-600"
                      >
                        Auswählen
                      </button>
                      <button
                        onClick={() => removeVector(v.id)}
                        className="px-2 py-0.5 border border-black rounded text-sm hover:text-red-600 hover:border-red-600"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>

                  {/* Inputs */}
                  <div className="grid grid-cols-3 gap-2">
                    <NumberCell
                      label="x"
                      value={v.val[0]}
                      onChange={(n) => {
                        const next = [...v.val];
                        next[0] = n;
                        updateVector(v.id, next);
                      }}
                    />
                    <NumberCell
                      label="y"
                      value={v.val[1]}
                      onChange={(n) => {
                        const next = [...v.val];
                        next[1] = n;
                        updateVector(v.id, next);
                      }}
                    />
                    {mode === "3d" && (
                      <NumberCell
                        label="z"
                        value={v.val[2]}
                        onChange={(n) => {
                          const next = [...v.val];
                          next[2] = n;
                          updateVector(v.id, next);
                        }}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Regeln */}
          <div className="mt-3 border-t border-black pt-2">
            <RuleHint />
          </div>
        </aside>

        {/* Canvas */}
        <section className="col-span-8 border border-black rounded-lg p-2">
          {mode === "2d" ? (
        <Canvas2D
        vectors={vectors}
        selected={selected}
        setSelected={setSelected}
        updateVector={updateVector}
        world={world2D}
        combo={combo}
        />
          ) : (
            <Canvas3D
              vectors={vectors}
              selected={selected}
              setSelected={setSelected}
              updateVector={updateVector}
              combo = {combo}  
            />
          )}
        </section>
      </div>
    </div>
  );
}

// ---------- inputs ----------
function NumberCell({ label, value, onChange }) {
  return (
    <label className="flex items-center gap-1">
      <span className="text-xs">{label}</span>
      <input
        type="number"
        step="1"
        className="w-20 px-2 py-1 border border-black rounded font-mono"
        value={value ?? 0}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

// ---------- 2D canvas ----------
function Canvas2D({ vectors, selected, setSelected, updateVector, world, combo = "linear" }) {
  const W = 720, H = 460;

  // eigener View (für Zoom); beim Prop-Wechsel syncen
  const [view, setView] = React.useState(world);
  React.useEffect(() => {
    setView(world);
  }, [world.xmin, world.xmax, world.ymin, world.ymax]);

  const { toPx, toWorld } = React.useMemo(
    () => make2DTransform(W, H, view),
    [W, H, view]
  );

  const svgRef = React.useRef(null);
  const dragRef = React.useRef({ id: null });

  // Zoom um Mausposition
const onWheel = (e) => {
  e.preventDefault();

  const factor = e.deltaY > 0 ? 1.1 : 1 / 1.1;   // out / in
  const cx = (view.xmin + view.xmax) / 2;
  const cy = (view.ymin + view.ymax) / 2;

  const minSpan = 2, maxSpan = 80;
  const spanX = Math.min(Math.max((view.xmax - view.xmin) * factor, minSpan), maxSpan);
  const spanY = Math.min(Math.max((view.ymax - view.ymin) * factor, minSpan), maxSpan);

  setView({
    xmin: cx - spanX / 2,
    xmax: cx + spanX / 2,
    ymin: cy - spanY / 2,
    ymax: cy + spanY / 2,
  });
};

  const onPointerDown = (id) => () => {
    dragRef.current.id = id;
    setSelected(id);
  };
  const onPointerMove = (e) => {
    if (!dragRef.current.id) return;
    const rect = svgRef.current.getBoundingClientRect();
    const [x, y] = toWorld([e.clientX - rect.left, e.clientY - rect.top]);
    const v = vectors.find(v => v.id === dragRef.current.id);
    if (v) updateVector(v.id, [Math.round(x), Math.round(y)]);
  };
  const onPointerUp = () => (dragRef.current.id = null);

  // Achsen aus aktuellem View berechnen
  const [x1, y1] = toPx([view.xmin, 0]);
  const [x2, y2] = toPx([view.xmax, 0]);
  const [yA1, yA2] = [toPx([0, view.ymin]), toPx([0, view.ymax])];

  return (
    <svg
      ref={svgRef}
      width={W}
      height={H}
      className="bg-white rounded-lg select-none touch-none"
      onWheel={onWheel}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {/* Raster + Region im aktuellen View */}
      <Grid2D toPx={toPx} world={view} />
      <Region2D vectors={vectors} combo={combo} toPx={toPx} world={view} W={W} H={H} />

      {/* Achsen + Ursprung */}
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="black" strokeWidth="1" />
      <line x1={yA1[0]} y1={yA1[1]} x2={yA2[0]} y2={yA2[1]} stroke="black" strokeWidth="1" />
      <circle cx={toPx([0, 0])[0]} cy={toPx([0, 0])[1]} r="3" fill="black" />

      {/* Vektoren */}
      {vectors.map((v, i) => {
        const [px, py] = toPx(v.val);
        const [ox, oy] = toPx([0, 0]);
        const sel = selected === v.id;
        return (
          <g key={v.id} onPointerDown={onPointerDown(v.id)} style={{ cursor: "pointer" }}>
            <line x1={ox} y1={oy} x2={px} y2={py} stroke={sel ? "#dc2626" : "black"} strokeWidth={sel ? 3 : 2} />
            <ArrowHead x={px} y={py} color={sel ? "#dc2626" : "black"} />
            <circle cx={px} cy={py} r={6} fill={sel ? "#fecaca" : "white"} stroke={sel ? "#dc2626" : "black"} />
            <text x={px + 8} y={py - 8} className="font-mono text-xs">v{i + 1}</text>
          </g>
        );
      })}
    </svg>
  );
}
function Region3D({ vectors, combo = "linear", toPx, W, H }) {
  const mode = String(combo || "linear").toLowerCase();

  // ---- Daten/Utils ----
  const P3 = (vectors ?? []).map(v => ({ x:+(v.val?.[0]||0), y:+(v.val?.[1]||0), z:+(v.val?.[2]||0) }));
  const NZ = P3.filter(p => p.x||p.y||p.z);
  const proj2 = p => { const [x,y] = toPx([p.x,p.y,p.z]); return {x,y}; };

  const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
  const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
  const mul=(a,s)=>({x:a.x*s,y:a.y*s,z:a.z*s});
  const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
  const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
  const norm=v=>Math.hypot(v.x,v.y,v.z);
  const eps=1e-9;

  const hull2 = (pts) => {
    if (pts.length < 3) return pts.slice();
    const s=[...pts].sort((a,b)=> a.x===b.x ? a.y-b.y : a.x-b.x);
    const cr=(o,a,b)=>(a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x);
    const lo=[]; for(const p of s){ while(lo.length>=2&&cr(lo.at(-2),lo.at(-1),p)<=0) lo.pop(); lo.push(p); }
    const up=[]; for(const p of s.slice().reverse()){ while(up.length>=2&&cr(up.at(-2),up.at(-1),p)<=0) up.pop(); up.push(p); }
    up.pop(); lo.pop(); return lo.concat(up);
  };

  // ---- Würfel ----
  const C=6;
  const V=[ // 8 Ecken
    {x:-C,y:-C,z:-C},{x:C,y:-C,z:-C},{x:C,y:C,z:-C},{x:-C,y:C,z:-C},
    {x:-C,y:-C,z:C},{x:C,y:-C,z:C},{x:C,y:C,z:C},{x:-C,y:C,z:C}
  ];
  const E=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  const drawCubeWire = () => (
    <g stroke="#9ca3af" strokeWidth="1" fill="none">
      {E.map(([i,j],k)=>{const a=proj2(V[i]),b=proj2(V[j]); return <line key={k} x1={a.x} y1={a.y} x2={b.x} y2={b.y}/>;})}
    </g>
  );

  // ---- Linien/Ray/Plane ∩ Würfel ----
  // Slab-Clipping: t-Intervall schneiden
  const clipWithSlabs = (p0, d, t0, t1) => {
    let tmin=t0, tmax=t1;
    const upd=(p,dp,minv,maxv)=>{
      if (Math.abs(dp)<eps) { if (p<minv-eps || p>maxv+eps) { tmin=1; tmax=0; } }
      else {
        const tA=(minv-p)/dp, tB=(maxv-p)/dp;
        const lo=Math.min(tA,tB), hi=Math.max(tA,tB);
        tmin=Math.max(tmin, lo); tmax=Math.min(tmax, hi);
      }
    };
    upd(p0.x,d.x,-C,C); upd(p0.y,d.y,-C,C); upd(p0.z,d.z,-C,C);
    return tmin<=tmax ? [tmin,tmax] : null;
  };

  // unendliche Linie p0 + t d → Segment im Würfel
  const lineCubeSegment = (p0,d) => {
    const r=clipWithSlabs(p0,d,-1e9,1e9); if(!r) return null;
    return [ add(p0, mul(d, r[0])), add(p0, mul(d, r[1])) ];
  };
  // Ray p0 + t d, t>=0 → erstes Stück im Würfel
  const rayCubeSegment = (p0,d) => {
    const r=clipWithSlabs(p0,d,0,1e9); if(!r) return null;
    return [ add(p0, mul(d, r[0])), add(p0, mul(d, r[1])) ];
  };
  // Ebene p0, Normal n → Polygon (Schnitt mit Kanten)
  const planeCubePolygon = (p0,n) => {
    let pts=[];
    for (const [i,j] of E){
      const A=V[i], B=V[j], AB=sub(B,A);
      const denom=dot(n,AB), num=dot(n, sub(p0,A));
      if (Math.abs(denom)<eps){
        if (Math.abs(dot(n, sub(A,p0)))<eps && Math.abs(dot(n, sub(B,p0)))<eps){ pts.push(A,B); }
      } else {
        const t=num/denom; if (t>-eps && t<1+eps) pts.push(add(A, mul(AB,t)));
      }
    }
    // unique & sort by angle in 2D
    const seen=new Set(); const uniq=[];
    for (const p of pts){ const k=`${p.x.toFixed(3)}|${p.y.toFixed(3)}|${p.z.toFixed(3)}`; if(!seen.has(k)){seen.add(k); uniq.push(p);} }
    if (uniq.length<3) return null;
    const P2=uniq.map(p=>({p,...proj2(p)}));
    const cx=P2.reduce((s,q)=>s+q.x,0)/P2.length, cy=P2.reduce((s,q)=>s+q.y,0)/P2.length;
    P2.sort((a,b)=>Math.atan2(a.y-cy,a.x-cx)-Math.atan2(b.y-cy,b.x-cx));
    return P2.map(q=>({x:q.x,y:q.y}));
  };

  // ---- Rang / Affine-Dim ----
  const rankLinear = (V) => {
    if (V.length===0) return 0;
    const u=V.find(w=>norm(w)>eps); if(!u) return 0;
    if (V.every(w=>norm(cross(u,w))<eps)) return 1;
    for (let i=0;i<V.length;i++) for (let j=i+1;j<V.length;j++) for (let k=j+1;k<V.length;k++)
      if (Math.abs(dot(V[i], cross(V[j], V[k])))>eps) return 3;
    return 2;
  };
  const dimAffine = (Pts) => {
    const U=[...Pts];
    if (U.length<=1) return 0;
    const a=U[0], b=U[1], dir=sub(b,a);
    if (U.every(p=>norm(cross(sub(p,a),dir))<eps)) return 1;
    const n=cross(dir, sub(U[2]??b,a));
    return U.every(p=>Math.abs(dot(sub(p,a),n))<eps) ? 2 : 3;
  };

  // ---- Styles ----
  const EDGE="#0f172a", FILL="#22c55e33", thin=1.2;

  let content=null;
// ===== HYPERPLANE =====
if (mode === "hyperplane") {
  if (NZ.length > 0) {
    const n = NZ[0]; // erster Vektor als Normalenvektor
    const poly = planeCubePolygon({ x: 0, y: 0, z: 0 }, n);
    if (poly) {
      content = (
        <polygon
          points={poly.map(p => `${p.x},${p.y}`).join(" ")}
          fill="#0ea5e933"
          stroke="#0ea5e9"
          strokeWidth="1"
        />
      );
    }
  }
}

  // ===== LINEAR =====
  if (mode==="linear") {
    const r = rankLinear(NZ);
    if (r===1) {
      const dir = NZ.find(v=>norm(v)>eps) ?? {x:1,y:0,z:0};
      const seg = lineCubeSegment({x:0,y:0,z:0}, dir);
      if (seg){
        const a=proj2(seg[0]), b=proj2(seg[1]);
        content = <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={EDGE} strokeWidth={thin} />;
      }
    } else if (r===2) {
      // Ebene durch 0: zwei unabhängige Vektoren → Normal
      let u=null,v=null;
      for (const w of NZ){ if (!u && norm(w)>eps){u=w; continue;} if (u && norm(cross(u,w))>eps){v=w; break;} }
      if (u && v){
        const poly = planeCubePolygon({x:0,y:0,z:0}, cross(u,v));
        if (poly) content = <polygon points={poly.map(p=>`${p.x},${p.y}`).join(" ")} fill={FILL} stroke={EDGE} strokeWidth="1" />;
      }
    } else if (r===3) {
      // voller Würfel
      const face=(idx)=>[...idx].map(i=>proj2(V[i])).map(p=>`${p.x},${p.y}`).join(" ");
      content = (
        <g fill="#22c55e18" stroke={EDGE} strokeWidth="1">
          <polygon points={face([0,1,2,3])}/><polygon points={face([4,5,6,7])}/>
          <polygon points={face([0,1,5,4])}/><polygon points={face([1,2,6,5])}/>
          <polygon points={face([2,3,7,6])}/><polygon points={face([3,0,4,7])}/>
        </g>
      );
    }
  }

  // ===== AFFINE =====
  if (mode==="affine") {
    const d = dimAffine(P3);
    if (d===1) {
      const a=P3[0], b=P3.find(p=>p!==a) ?? a;
      const dir=sub(b,a);
      const seg=lineCubeSegment(a, dir);
      if (seg){
        const p=proj2(seg[0]), q=proj2(seg[1]);
        content = <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={EDGE} strokeWidth={thin} />;
      }
    } else if (d===2) {
      const a=P3[0], b=P3[1];
      const c=P3.find(p=>norm(cross(sub(p,a), sub(b,a)))>eps);
      if (c){
        const poly = planeCubePolygon(a, cross(sub(b,a), sub(c,a)));
        if (poly) content = <polygon points={poly.map(p=>`${p.x},${p.y}`).join(" ")} fill={FILL} stroke={EDGE} strokeWidth="1" />;
      }
    } else if (d===3) {
      const face=(idx)=>[...idx].map(i=>proj2(V[i])).map(p=>`${p.x},${p.y}`).join(" ");
      content = (
        <g fill="#22c55e18" stroke={EDGE} strokeWidth="1">
          <polygon points={face([0,1,2,3])}/><polygon points={face([4,5,6,7])}/>
          <polygon points={face([0,1,5,4])}/><polygon points={face([1,2,6,5])}/>
          <polygon points={face([2,3,7,6])}/><polygon points={face([3,0,4,7])}/>
        </g>
      );
    }
  }

  // ===== CONVEX =====
  if (mode==="convex") {
    if (P3.length===1){ const a=proj2(P3[0]); content=<circle cx={a.x} cy={a.y} r="3" fill={EDGE}/>; }
    else if (P3.length===2){ const a=proj2(P3[0]), b=proj2(P3[1]); content=<line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={EDGE} strokeWidth={thin}/>; }
    else if (P3.length>=3){
      const H=hull2(P3.map(proj2));
      content=<polygon points={H.map(p=>`${p.x},${p.y}`).join(" ")} fill={FILL} stroke={EDGE} strokeWidth="1"/>;
    }
  }

  // ===== CONE =====
// ===== CONE =====
// ===== CONE =====
if (mode === "cone") {
  const O = { x: 0, y: 0, z: 0 };
  const gens = NZ.filter(v => norm(v) > eps);

  // volumige Darstellung
  const CONE_FILL = "#ef444466";   // halbtransparent
  const CONE_EDGE = "#7f1d1d";

  // kleine 2D-Hülle (falls du hull2 schon global hast, kannst du diesen Inline-Helper weglassen)
  const hull2 = (pts) => {
    if (pts.length < 3) return pts.slice();
    const s=[...pts].sort((a,b)=> a.x===b.x ? a.y-b.y : a.x-b.x);
    const cross=(o,a,b)=>(a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x);
    const lo=[]; for(const p of s){ while(lo.length>=2 && cross(lo.at(-2), lo.at(-1), p) <= 0) lo.pop(); lo.push(p); }
    const up=[]; for(const p of s.slice().reverse()){ while(up.length>=2 && cross(up.at(-2), up.at(-1), p) <= 0) up.pop(); up.push(p); }
    up.pop(); lo.pop(); return lo.concat(up);
  };

  if (gens.length === 0) {
    // nichts
  } else if (gens.length === 1) {
    const seg = rayCubeSegment(O, gens[0]);
    if (seg) {
      const a = proj2(seg[0]), b = proj2(seg[1]);
      content = <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={EDGE} strokeWidth={thin} />;
    }
  } else {
    const r = rankLinear(gens);

    // ---- Rang 2: ein Sektor (O + {a r1 + b r2 | a,b >= 0})
    if (r === 2) {
      // Basis & Randstrahlen via größte Winkel-Lücke
      let u=null,v=null;
      for (const w of gens){ if (!u){u=w; continue;} if (norm(cross(u,w))>eps){ v=w; break; } }
      const { e1, e2 } = planeBasis(u, v);
      const angs = gens.map(g => Math.atan2(dot(g,e2), dot(g,e1))).sort((a,b)=>a-b);

      let maxGap=-1, idx=0;
      for (let i=0;i<angs.length;i++){
        const a=angs[i], b=(i+1<angs.length? angs[i+1] : angs[0]+2*Math.PI);
        const gap=b-a; if (gap>maxGap){ maxGap=gap; idx=i; }
      }
      const a1 = angs[(idx+1)%angs.length], a2 = angs[idx];
      const r1 = { x: Math.cos(a1)*e1.x + Math.sin(a1)*e2.x,
                   y: Math.cos(a1)*e1.y + Math.sin(a1)*e2.y,
                   z: Math.cos(a1)*e1.z + Math.sin(a1)*e2.z };
      const r2 = { x: Math.cos(a2)*e1.x + Math.sin(a2)*e2.x,
                   y: Math.cos(a2)*e1.y + Math.sin(a2)*e2.y,
                   z: Math.cos(a2)*e1.z + Math.sin(a2)*e2.z };

      const poly3 = planeCubePoly3D(O, cross(r1, r2), proj2, V, E);
      if (poly3) {
        let P = clipByHalfspaceAB(poly3, r1, r2, "a");
        if (P.length>=3) P = clipByHalfspaceAB(P, r1, r2, "b");
        if (P.length>=3){
          const P2 = P.map(proj2);
          content = (
            <polygon
              points={P2.map(p=>`${p.x},${p.y}`).join(" ")}
              fill={CONE_FILL}
              stroke={CONE_EDGE}
              strokeWidth="1"
              style={{ mixBlendMode: "multiply" }}
            />
          );
        }
      }
    }

    // ---- Rang 3: polyhedraler Kegel → Facetten vereinigen (2D-Hülle)
    if (r === 3) {
      // Ordnungsbasis nur zum Sortieren
      let u=null,v=null;
      for (const w of gens){ if (!u){u=w; continue;} if (norm(cross(u,w))>eps){ v=w; break; } }
      const { e1, e2 } = planeBasis(u, v);

      const dirs = gens
        .map(g => ({ g, ang: Math.atan2(dot(g,e2), dot(g,e1)) }))
        .sort((A,B) => A.ang - B.ang);

      // sammle alle Facetten-Punkte (projiziert) und vereinige über konvexe Hülle
      const pts2 = [];
      for (let i=0;i<dirs.length;i++){
        const r1 = dirs[i].g, r2 = dirs[(i+1)%dirs.length].g;
        const n  = cross(r1, r2); if (norm(n) < eps) continue;

        const poly3 = planeCubePoly3D(O, n, proj2, V, E); if (!poly3) continue;

        let P = clipByHalfspaceAB(poly3, r1, r2, "a");
        if (P.length>=3) P = clipByHalfspaceAB(P, r1, r2, "b");
        if (P.length>=3) pts2.push(...P.map(proj2));
      }

      if (pts2.length >= 3) {
        const U = hull2(pts2); // zusammenhängende Außenkontur
        content = (
          <polygon
            points={U.map(p=>`${p.x},${p.y}`).join(" ")}
            fill={CONE_FILL}
            stroke={CONE_EDGE}
            strokeWidth="1"
            style={{ mixBlendMode: "multiply" }}
          />
        );
      }
    }
  }
}




  return (
    <g pointerEvents="none">
      {drawCubeWire()}
      {content}
    </g>
  );
}
// Koeffizienten a,b so dass P ≈ a*r1 + b*r2  (Gram-Inversion, robust)
function coeffInBasis(r1, r2, P) {
  const dot = (a,b)=>a.x*b.x + a.y*b.y + a.z*b.z;
  const g11 = dot(r1,r1), g12 = dot(r1,r2), g22 = dot(r2,r2);
  const d1  = dot(r1,P),  d2  = dot(r2,P);
  const det = g11*g22 - g12*g12 || 1e-12;
  const a = ( g22*d1 - g12*d2 ) / det;
  const b = ( -g12*d1 + g11*d2 ) / det;
  return { a, b };
}

// Ebene∩Würfel -> 3D-Ecken (sortiert in 2D zur stabilen Reihenfolge)
function planeCubePoly3D(p0, n, proj2, V, E) {
  const eps = 1e-9;
  const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
  const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
  const mul=(a,s)=>({x:a.x*s,y:a.y*s,z:a.z*s});
  const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;

  let pts = [];
  for (const [i,j] of E){
    const A=V[i], B=V[j], AB=sub(B,A);
    const denom = dot(n, AB), num = dot(n, sub(p0, A));
    if (Math.abs(denom) < eps) {
      if (Math.abs(dot(n, sub(A,p0)))<eps && Math.abs(dot(n, sub(B,p0)))<eps) { pts.push(A,B); }
    } else {
      const t = num/denom;
      if (t>-eps && t<1+eps) pts.push(add(A, mul(AB,t)));
    }
  }
  // unique
  const seen=new Set(), uniq=[];
  for (const p of pts){ const k=`${p.x.toFixed(3)}|${p.y.toFixed(3)}|${p.z.toFixed(3)}`; if(!seen.has(k)){ seen.add(k); uniq.push(p); } }
  if (uniq.length<3) return null;

  // 2D-sort (Bildcoords)
  const P2 = uniq.map(p=>({p, ...proj2(p)}));
  const cx = P2.reduce((s,q)=>s+q.x,0)/P2.length, cy = P2.reduce((s,q)=>s+q.y,0)/P2.length;
  P2.sort((a,b)=>Math.atan2(a.y-cy,a.x-cx)-Math.atan2(b.y-cy,b.x-cx));
  return P2.map(q=>q.p); // 3D-Punkte in polygonaler Reihenfolge
}

// Orthonormale Basis der Ebene durch u,v
function planeBasis(u, v) {
  const norm = a => Math.hypot(a.x,a.y,a.z);
  const dot = (a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
  const sub = (a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
  const mul = (a,s)=>({x:a.x*s,y:a.y*s,z:a.z*s});

  const e1n = norm(u) || 1e-9;
  const e1 = { x:u.x/e1n, y:u.y/e1n, z:u.z/e1n };
  const vpar = dot(v,e1);
  const w = sub(v, mul(e1, vpar));
  const e2n = norm(w) || 1e-9;
  const e2 = { x:w.x/e2n, y:w.y/e2n, z:w.z/e2n };
  return { e1, e2 };
}

// Sutherland–Hodgman Clipping in a,b-Koordinaten (a>=0 bzw. b>=0)
// Clipping eines 3D-Polygons in der Ebene span(r1,r2) nach a>=0 bzw. b>=0
function clipByHalfspaceAB(poly3, r1, r2, which /*"a"|"b"*/) {
  const eps = 1e-9;
  if (!poly3 || poly3.length < 3) return [];
  const val = (P) => {
    const {a,b} = coeffInBasis(r1, r2, P);
    return (which === "a") ? a : b;
  };
  const lerp = (A,B,t)=>({x:A.x+(B.x-A.x)*t, y:A.y+(B.y-A.y)*t, z:A.z+(B.z-A.z)*t});
  const out = [];
  for (let i=0;i<poly3.length;i++){
    const P = poly3[i], Q = poly3[(i+1)%poly3.length];
    const vP = val(P),   vQ = val(Q);
    const inP = vP >= -eps, inQ = vQ >= -eps;
    if (inP && inQ) {
      out.push(Q);
    } else if (inP && !inQ) {
      const t = vP / (vP - vQ + 1e-12);
      out.push(lerp(P,Q,t));
    } else if (!inP && inQ) {
      const t = vP / (vP - vQ + 1e-12);
      out.push(lerp(P,Q,t), Q);
    }
  }
  return out;
}


function Region2D({ vectors, combo, toPx, world, W, H }) {
  // Punkte = Vektorspitzen
  const P = vectors.map(v => ({ x: v.val[0], y: v.val[1] }));
  const nz = P.filter(p => !(p.x === 0 && p.y === 0));
  const equal = (a,b)=>a.x===b.x && a.y===b.y;
  const anyEqualPair = () => {
    for (let i=0;i<P.length;i++) for (let j=i+1;j<P.length;j++) if (equal(P[i],P[j])) return true;
    return false;
  };
  const hull2D = (pts)=>{ // monotone chain
    if (pts.length<3) return pts;
    const s=[...pts].sort((a,b)=>a.x===b.x?a.y-b.y:a.x-b.x);
    const cr=(o,a,b)=>(a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x);
    const lo=[]; for(const p of s){ while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0) lo.pop(); lo.push(p);}
    const up=[]; for(const p of s.slice().reverse()){ while(up.length>=2&&cr(up[up.length-2],up[up.length-1],p)<=0) up.pop(); up.push(p);}
    up.pop(); lo.pop(); return lo.concat(up);
  };
const seg = (a,b,{stroke="#dc2626", sw=1.2}={})=>{
  const A = toPx([a.x,a.y]), B = toPx([b.x,b.y]);
  return <line x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} stroke={stroke} strokeWidth={sw} />;
};  
  const poly = (pts, {fill="#fee2e2", stroke="#dc2626", op=0.6, sw=1}={})=>{
    if (pts.length<3) return null;
    const q = pts.map(p=>toPx([p.x,p.y])).map(([x,y])=>`${x},${y}`).join(" ");
    return <polygon points={q} fill={fill} opacity={op} stroke={stroke} strokeWidth={sw} />;
  };
  const infLine = (through, dir, {stroke="#dc2626", sw=2}={})=>{
    const n = Math.hypot(dir.x,dir.y)||1; const ux = dir.x/n, uy=dir.y/n, M=1e4;
    const A = toPx([through.x-ux*M, through.y-uy*M]);
    const B = toPx([through.x+ux*M, through.y+uy*M]);
    return <line x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} stroke={stroke} strokeWidth={sw} />;
  };
  const whole = ()=> <rect x="0" y="0" width={W} height={H} fill="#f59e0b33" />; // dezent, nicht „dick“

if (combo === "linear") {
  const nz = P.filter(p => !(p.x === 0 && p.y === 0));
  if (nz.length === 0) return null;
  if (nz.length === 1) return infLine({ x: 0, y: 0 }, nz[0], { sw: 1.2 });

  // Prüfe, ob es zwei nicht-kollineare Nicht-Null-Vektoren gibt
  let full = false;
  for (let i = 0; i < nz.length && !full; i++) {
    for (let j = i + 1; j < nz.length; j++) {
      const d = nz[i].x * nz[j].y - nz[i].y * nz[j].x;
      if (Math.abs(d) > 1e-9) { full = true; break; }
    }
  }
  if (full) return whole();
  return infLine({ x: 0, y: 0 }, nz[0], { sw: 1.2 });
}

if (combo === "hyperplane") {
  if (nz.length === 0) return null;
  const v = nz[0];
  // Orthogonaler Richtungsvektor
  const ortho = { x: -v.y, y: v.x };
  return infLine({ x: 0, y: 0 }, ortho, { stroke: "#0ea5e9", sw: 1.5 });
}

if (combo === "affine") {
  // Ursprung NICHT für die "Punkte"-Affinhülle verwenden
  const pts = P.filter(p => !(p.x === 0 && p.y === 0));
  const uniq = pts.filter((p,i)=>pts.findIndex(q=>q.x===p.x&&q.y===p.y)===i);

  // ≥3 nicht-kollinear → (in R^2) ganze Ebene, sonst Linie
  if (uniq.length >= 3) {
    // Check auf Nicht-Kollinearität aller Punkte
    let nonCol = false;
    for (let i=0;i<uniq.length && !nonCol;i++){
      for (let j=i+1;j<uniq.length && !nonCol;j++){
        for (let k=j+1;k<uniq.length;k++){
          const a=uniq[i], b=uniq[j], c=uniq[k];
          const area = Math.abs((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x));
          if (area > 1e-9) { nonCol = true; break; }
        }
      }
    }
    if (nonCol) return whole(); // wirklich Fläche NUR wenn 3 nicht-kollineare Nicht-Null-Punkte
  }

  // sonst: Linie durch zwei verschiedene Punkte (falls vorhanden)
  if (uniq.length >= 2) {
    const a = uniq[0], b = uniq[1];
    const dir = {x:b.x-a.x, y:b.y-a.y};
    return infLine(a, dir, { sw: 1.2 });
  }

  // Fallback: falls nur ein Nicht-Null-Punkt existiert, Linie durch ihn & Ursprung
  if (uniq.length === 1) {
    return infLine({x:0,y:0}, uniq[0], { sw: 1.2 });
  }
  return null;
}


    if (combo === "convex") {
    const uniq = P.filter((p,i)=>P.findIndex(q=>q.x===p.x&&q.y===p.y)===i);
    if (uniq.length >= 3) return poly(hull2D(uniq), {sw:1});
    if (uniq.length === 2) return seg(uniq[0], uniq[1], {sw:1.2}); // Segment statt leer
    return null; // 0/1 Punkt → nichts schattieren
    }

if (combo === "cone") {
  const rays = nz; // Nicht-Null-Vektoren ab Ursprung
  if (rays.length === 0) return null;

  const rect = { xmin: world.xmin, xmax: world.xmax, ymin: world.ymin, ymax: world.ymax };
  const cross = (a,b)=>a.x*b.y - a.y*b.x;
  const norm  = (v)=>Math.hypot(v.x,v.y)||1;

  // Linie durch Rechteck (beidseitig, durch Ursprung, Richtung v)
  const lineThroughRect = (v) => {
    const dir = { x: v.x/norm(v), y: v.y/norm(v) };
    const edges = [
      [{x:rect.xmin,y:rect.ymin},{x:rect.xmax,y:rect.ymin}],
      [{x:rect.xmax,y:rect.ymin},{x:rect.xmax,y:rect.ymax}],
      [{x:rect.xmax,y:rect.ymax},{x:rect.xmin,y:rect.ymax}],
      [{x:rect.xmin,y:rect.ymax},{x:rect.xmin,y:rect.ymin}],
    ];
    const O={x:0,y:0}, hits=[];
    for (const [A,B] of edges){
      const d={x:B.x-A.x,y:B.y-A.y};
      const den = cross(dir,d); if (Math.abs(den)<1e-12) continue;
      const AO={x:A.x-O.x,y:A.y-O.y};
      const t = (AO.x*d.y - AO.y*d.x)/den; // O+t*dir
      const u = (AO.x*dir.y - AO.y*dir.x)/den; // A+u*d
      if (u>=-1e-12 && u<=1+1e-12) hits.push({x:O.x+t*dir.x,y:O.y+t*dir.y});
    }
    if (hits.length<2) return null;
    hits.sort((p,q)=>(p.x*p.x+p.y*p.y)-(q.x*q.x+q.y*q.y));
    const P = toPx([hits[0].x, hits[0].y]), Q = toPx([hits.at(-1).x, hits.at(-1).y]);
    return <line x1={P[0]} y1={P[1]} x2={Q[0]} y2={Q[1]} stroke="#dc2626" strokeWidth={1.2} />;
  };

  // Strahl (t>=0) bis Rechteck
  const rayToRect = (v) => {
    const d={x:v.x/norm(v),y:v.y/norm(v)}, O={x:0,y:0}, cand=[];
    const push=(p)=>{ if(p.x>=rect.xmin-1e-9&&p.x<=rect.xmax+1e-9&&p.y>=rect.ymin-1e-9&&p.y<=rect.ymax+1e-9)cand.push(p); };
    if (Math.abs(d.x)>1e-12){ const t1=rect.xmin/d.x; if(t1>=0)push({x:rect.xmin,y:t1*d.y}); const t2=rect.xmax/d.x; if(t2>=0)push({x:rect.xmax,y:t2*d.y}); }
    if (Math.abs(d.y)>1e-12){ const t3=rect.ymin/d.y; if(t3>=0)push({x:t3*d.x,y:rect.ymin}); const t4=rect.ymax/d.y; if(t4>=0)push({x:t4*d.x,y:rect.ymax}); }
    if (!cand.length) return null;
    cand.sort((p,q)=>(p.x*p.x+p.y*p.y)-(q.x*q.x+q.y*q.y));
    const A = toPx([O.x,O.y]), B = toPx([cand[0].x, cand[0].y]);
    return <line x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} stroke="#dc2626" strokeWidth={1.2} />;
  };

  // Clip Rechteck mit Halbebene cross(d, p) >= 0 (keepLeft=true) oder <= 0
  const clipHalf = (poly, d, keepLeft=true) => {
    if (!poly.length) return [];
    const inside = (p)=> keepLeft ? (cross(d,p)>=-1e-12) : (cross(d,p)<=1e-12);
    const inter = (A,B)=>{
      const s={x:B.x-A.x,y:B.y-A.y}, den=cross(d,s);
      if (Math.abs(den)<1e-12) return B;
      const t = -cross(d,A)/den;
      return {x:A.x+t*s.x,y:A.y+t*s.y};
    };
    const out=[];
    for(let i=0;i<poly.length;i++){
      const P=poly[i], Q=poly[(i+1)%poly.length], inP=inside(P), inQ=inside(Q);
      if(inP&&inQ) out.push(Q);
      else if(inP&&!inQ) out.push(inter(P,Q));
      else if(!inP&&inQ) { out.push(inter(P,Q)); out.push(Q); }
    }
    return out;
  };

  // 1) Ein Vektor → ganze Linie
  if (rays.length === 1) return lineThroughRect(rays[0]);

  // 2) Alle kolinear?
  const base = rays[0];
  const allCol = rays.every(p => Math.abs(cross(base,p)) < 1e-9);
  if (allCol) {
    // gleiche Richtung ⇒ Strahl, sonst Gegenrichtung dabei ⇒ Linie
    const sameDir = rays.every(p => base.x*p.x + base.y*p.y >= -1e-9);
    return sameDir ? rayToRect(base) : lineThroughRect(base);
  }

  // 3) Allgemeiner Keil: kleinster Spannbogen (≤ π). >π ⇒ ganze Fläche
  const ang = (p)=>Math.atan2(p.y,p.x);
  let A = [...new Set(rays.map(ang).map(x=>+x.toFixed(12)))].sort((a,b)=>a-b);
  let maxGap=-1, idx=0;
  for(let i=0;i<A.length;i++){
    const a=A[i], b=(i+1<A.length?A[i+1]:A[0]+2*Math.PI), g=b-a;
    if (g>maxGap){maxGap=g; idx=i;}
  }
  const start = A[(idx+1)%A.length];
  const span  = 2*Math.PI - maxGap;
  if (span > Math.PI + 1e-9) return whole(); // ganze Ebene in R^2

  // Rechteck (CCW)
  let polyR = [
    {x:rect.xmin,y:rect.ymin},
    {x:rect.xmax,y:rect.ymin},
    {x:rect.xmax,y:rect.ymax},
    {x:rect.xmin,y:rect.ymax},
  ];
  // Halbebenen des Keils: d1 = Rand links, d2 = Rand rechts (CCW von start zu start+span)
  const d1 = { x: Math.cos(start),      y: Math.sin(start) };
  const d2 = { x: Math.cos(start+span), y: Math.sin(start+span) };

  polyR = clipHalf(polyR, d1, true);   // cross(d1, p) >= 0
  polyR = clipHalf(polyR, d2, false);  // cross(d2, p) <= 0

  if (polyR.length < 3) {
    // degeneriert ⇒ Linie in Keilmitte
    const mid = { x: Math.cos(start+span/2), y: Math.sin(start+span/2) };
    return lineThroughRect(mid);
  }

  const pts = polyR.map(p=>toPx([p.x,p.y])).map(([x,y])=>`${x},${y}`).join(" ");
  return <polygon points={pts} fill="#fee2e2" opacity={0.6} stroke="#dc2626" strokeWidth={1} />;
}



  return null;
}<></>


function Grid2D({ toPx, world }) {
  const lines = [];
  for (let x = Math.ceil(world.xmin); x <= Math.floor(world.xmax); x++) {
    const [px1, py1] = toPx([x, world.ymin]);
    const [px2, py2] = toPx([x, world.ymax]);
    lines.push(<line key={"v"+x} x1={px1} y1={py1} x2={px2} y2={py2} stroke="#e5e7eb" strokeWidth="1" />);
  }
  for (let y = Math.ceil(world.ymin); y <= Math.floor(world.ymax); y++) {
    const [px1, py1] = toPx([world.xmin, y]);
    const [px2, py2] = toPx([world.xmax, y]);
    lines.push(<line key={"h"+y} x1={px1} y1={py1} x2={px2} y2={py2} stroke="#e5e7eb" strokeWidth="1" />);
  }
  return <g>{lines}</g>;
}

function ArrowHead({ x, y, color }) {
  const size = 8;
  return (
    <polygon
      points={`${x},${y} ${x - size},${y - size / 2} ${x - size},${y + size / 2}`}
      fill={color}
    />
  );
}


