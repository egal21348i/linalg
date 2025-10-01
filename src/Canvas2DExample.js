import React from "react";

// --- Koordinatentransformation ---
function make2DTransform(width, height, world) {
  const { xmin, xmax, ymin, ymax } = world;
  const sx = width / (xmax - xmin);
  const sy = height / (ymax - ymin);
  const toPx = ([x, y]) => [(x - xmin) * sx, height - (y - ymin) * sy];
  const toWorld = ([px, py]) => [px / sx + xmin, (height - py) / sy + ymin];
  return { toPx, toWorld };
}

// --- Raster ---
function Grid2DTransformed({ toPx, world, A, colorVert = "#bfdbfe", colorHoriz = "#fecaca" }) {
  const lines = [];
  const rangeX = [Math.ceil(world.xmin), Math.floor(world.xmax)];
  const rangeY = [Math.ceil(world.ymin), Math.floor(world.ymax)];

  const applyA = ([x, y]) => [
    A[0][0] * x + A[0][1] * y,
    A[1][0] * x + A[1][1] * y,
  ];

  for (let x = rangeX[0]; x <= rangeX[1]; x++) {
    const p1 = applyA([x, world.ymin]);
    const p2 = applyA([x, world.ymax]);
    const [px1, py1] = toPx(p1);
    const [px2, py2] = toPx(p2);
    lines.push(
      <line key={"v" + x} x1={px1} y1={py1} x2={px2} y2={py2} stroke={colorVert} strokeWidth={1} />
    );
  }

  for (let y = rangeY[0]; y <= rangeY[1]; y++) {
    const p1 = applyA([world.xmin, y]);
    const p2 = applyA([world.xmax, y]);
    const [px1, py1] = toPx(p1);
    const [px2, py2] = toPx(p2);
    lines.push(
      <line key={"h" + y} x1={px1} y1={py1} x2={px2} y2={py2} stroke={colorHoriz} strokeWidth={1} />
    );
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

export default function Canvas2DMatrixAnimated() {
  const W = 720, H = 460;
  const worldInit = { xmin: -10, xmax: 10, ymin: -7, ymax: 7 };
  const [view, setView] = React.useState(worldInit);
  const { toPx, toWorld } = React.useMemo(
    () => make2DTransform(W, H, view),
    [view]
  );

  // Zielbasis (ziehbar)
  const [e1Target, setE1Target] = React.useState([1, 0]);
  const [e2Target, setE2Target] = React.useState([0, 1]);

  // Animationsfortschritt [0,1]
  const [t, setT] = React.useState(0);
  const animRef = React.useRef(null);

  const svgRef = React.useRef(null);
  const dragRef = React.useRef({ target: null });

  const onWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 1 / 1.1;
    const cx = (view.xmin + view.xmax) / 2;
    const cy = (view.ymin + view.ymax) / 2;
    const spanX = (view.xmax - view.xmin) * factor;
    const spanY = (view.ymax - view.ymin) * factor;
    setView({
      xmin: cx - spanX / 2,
      xmax: cx + spanX / 2,
      ymin: cy - spanY / 2,
      ymax: cy + spanY / 2,
    });
  };

  const startDrag = (target) => (e) => {
    dragRef.current.target = target;
    // Falls man während oder nach Animation zieht → sofort reset auf t=0
    setT(0);
    cancelAnimationFrame(animRef.current);
  };

  const onPointerMove = (e) => {
    if (!dragRef.current.target) return;
    const rect = svgRef.current.getBoundingClientRect();
    const [x, y] = toWorld([e.clientX - rect.left, e.clientY - rect.top]);
    if (dragRef.current.target === "e1") setE1Target([Math.round(x), Math.round(y)]);
    if (dragRef.current.target === "e2") setE2Target([Math.round(x), Math.round(y)]);
  };

  const onPointerUp = () => (dragRef.current.target = null);

  // Interpolation zwischen Identität und Zielmatrix
  const A = [
    [
      (1 - t) * 1 + t * e1Target[0],
      (1 - t) * 0 + t * e2Target[0],
    ],
    [
      (1 - t) * 0 + t * e1Target[1],
      (1 - t) * 1 + t * e2Target[1],
    ],
  ];

  // Interpolierte Basisvektoren für Darstellung (mit Animation)
  const e1Interp = [
    (1 - t) * 1 + t * e1Target[0],
    (1 - t) * 0 + t * e1Target[1],
  ];
  const e2Interp = [
    (1 - t) * 0 + t * e2Target[0],
    (1 - t) * 1 + t * e2Target[1],
  ];

  // Achsen
  const [x1, y1] = toPx([view.xmin, 0]);
  const [x2, y2] = toPx([view.xmax, 0]);
  const [yA1, yA2] = [toPx([0, view.ymin]), toPx([0, view.ymax])];

  const drawVector = (vec, color, label) => {
    const [px, py] = toPx(vec);
    const [ox, oy] = toPx([0, 0]);
    return (
      <g>
        <line x1={ox} y1={oy} x2={px} y2={py} stroke={color} strokeWidth={3} />
        <ArrowHead x={px} y={py} color={color} />
        <circle cx={px} cy={py} r={6} fill="white" stroke={color} strokeWidth={2} />
        <text x={px + 8} y={py - 8} className="font-mono text-xs" fill={color}>
          {label}
        </text>
      </g>
    );
  };

  const drawDragHandle = (vec, color, label, onPointerDown) => {
    const [px, py] = toPx(vec);
    const [ox, oy] = toPx([0, 0]);
    return (
      <g onPointerDown={onPointerDown} style={{ cursor: "pointer" }}>
        <line x1={ox} y1={oy} x2={px} y2={py} stroke={color} strokeWidth={3} />
        <ArrowHead x={px} y={py} color={color} />
        <circle cx={px} cy={py} r={6} fill="white" stroke={color} strokeWidth={2} />
        <text x={px + 8} y={py - 8} className="font-mono text-xs" fill={color}>
          {label}
        </text>
      </g>
    );
  };

  const animate = () => {
    const start = performance.now();
    const duration = 1000; // länger: 3s
    const step = (now) => {
      const tt = Math.min((now - start) / duration, 1);
      setT(tt);
      if (tt < 1) animRef.current = requestAnimationFrame(step);
    };
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(step);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
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
        {/* Originalgitter */}
        <Grid2DTransformed
          toPx={toPx}
          world={view}
          A={[[1,0],[0,1]]}
          colorVert="#e5e7eb"
          colorHoriz="#e5e7eb"
        />

        {/* Transformiertes Gitter (animiert) */}
        <Grid2DTransformed toPx={toPx} world={view} A={A} />

        {/* Achsen */}
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="black" />
        <line x1={yA1[0]} y1={yA1[1]} x2={yA2[0]} y2={yA2[1]} stroke="black" />
        <circle cx={toPx([0, 0])[0]} cy={toPx([0, 0])[1]} r="3" fill="black" />

        {/* Interpolierte Basisvektoren (mit Animation) */}
        {drawVector(e1Interp, "#dc2626", "e₁")}
        {drawVector(e2Interp, "#2563eb", "e₂")}

        {/* Dragbare Handles an Zielpositionen */}
        {drawDragHandle(e1Target, "#dc2626", "e₁*", startDrag("e1"))}
        {drawDragHandle(e2Target, "#2563eb", "e₂*", startDrag("e2"))}
      </svg>

      <button
        onClick={animate}
        className="px-4 py-2 border border-black rounded hover:bg-red-50"
      >
        Animate
      </button>

      {/* Matrixanzeige */}
      <div className="font-mono text-lg text-center">
        <div>[ {A[0][0].toFixed(2)} &nbsp; {A[0][1].toFixed(2)} ]</div>
        <div>[ {A[1][0].toFixed(2)} &nbsp; {A[1][1].toFixed(2)} ]</div>
      </div>
    </div>
  );
}
