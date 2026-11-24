// (5.3.3) The touch buttons' symbols: one set, bold white silhouettes on a 24-unit grid (the way a phone game's
// buttons read at a glance), drawn with even-odd cut-outs. drawGlyph(ctx, name, cx, cy, size, alpha)
const P = (s) => new Path2D(s);
// (5.5.7) the set redrawn for this game (the first set read as stock icons: a lopsided net, a sub like a bath toy, a
// sack like a money bag, a crate for a trap). Each is built from a few shapes on the 24-unit grid; mesh and ribs are
// thin cut lines. S(d, w): a stroked line of width w
const S = (d, w = 1.4) => ({ stroke: P(d), w });
const circle = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;
// chords of a circle at 45 degrees both ways, spaced sp: the mesh inside a hoop

function cog(cx, cy, r0, r1, n, hole) {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a0 = (i / (n * 2)) * Math.PI * 2, a1 = ((i + 1) / (n * 2)) * Math.PI * 2, r = i % 2 ? r0 : r1, pad = i % 2 ? 0 : 0.12;
    const p = (a, rr) => `${(cx + Math.cos(a) * rr).toFixed(2)} ${(cy + Math.sin(a) * rr).toFixed(2)}`;
    d += (i ? 'L' : 'M') + p(a0 + pad, r) + 'L' + p(a1 - pad, r);
  }
  return d + 'z' + circle(cx, cy, hole);
}
// a mesh of crossing lines, cut to a shape (the net's bag)
const meshClip = (shape, sp, w = 0.85) => { let d = ''; for (let c = -24; c < 48; c += sp) d += `M${c} 0L${c + 24} 24M${c + 24} 0L${c} 24`; return { stroke: P(d), w, clip: P(shape) }; };
const NET_BAG = 'M7.2 8.6C7.4 13.4 10 18.2 13.4 19.4c3.6-1.2 6-6 6.2-10.8C17.4 10.2 9.4 10.2 7.2 8.6z';
const G = {
  net: [P('M13.4 4.4c3.9 0 7 1.9 7 4.2s-3.1 4.2-7 4.2-7-1.9-7-4.2 3.1-4.2 7-4.2zM13.4 5.9c-3 0-5.4 1.2-5.4 2.7s2.4 2.7 5.4 2.7 5.4-1.2 5.4-2.7-2.4-2.7-5.4-2.7z'), meshClip(NET_BAG, 2.4), S(NET_BAG, 1.1), S('M19.6 10.2L22.4 21.6', 2.2), S('M21.2 17.6l1.4-.4M21.7 19.4l1.4-.4', 0.9)],
  eye: [P('M12 5C6.5 5 2.6 9.3 1.2 12c1.4 2.7 5.3 7 10.8 7s9.4-4.3 10.8-7C21.4 9.3 17.5 5 12 5zM12 8a4 4 0 1 1 0 8a4 4 0 1 1 0-8zM12 10.2a1.8 1.8 0 1 0 0 3.6a1.8 1.8 0 1 0 0-3.6z')],
  hand: [P('M8 11V4.5a1.5 1.5 0 0 1 3 0V10h.6V3a1.5 1.5 0 0 1 3 0v7h.6V4.2a1.5 1.5 0 0 1 3 0V12h.6V7.5a1.5 1.5 0 0 1 3 0V14c0 4.4-3.3 8-7.5 8h-1c-2.6 0-4.4-1.2-5.8-3.3L2.4 13.4a1.6 1.6 0 0 1 2.5-1.9L8 14.2z')],
  sub: [P('M3 14.5C3 11.8 7 10 12 10s9 1.8 9 4.5S17 19 12 19s-9-1.8-9-4.5zM7.5 13.6a1.1 1.1 0 1 0 0 2.2a1.1 1.1 0 1 0 0-2.2zM11 13.6a1.1 1.1 0 1 0 0 2.2a1.1 1.1 0 1 0 0-2.2zM14.5 13.6a1.1 1.1 0 1 0 0 2.2a1.1 1.1 0 1 0 0-2.2z'),
    P('M9.5 10.4V7.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2.9zM11.4 6.5V4h1.2v2.5z'), P('M20.4 13l2.6-2.5v8L20.4 16z')],
  lamp: [P('M1.5 9.5h8l3-2.5h2v10h-2l-3-2.5h-8z'), P('M15.5 8.2L23 4.5v15l-7.5-3.7z')],
  lure: [P('M4 22c0-9 3-15 10.5-15.8l.2 1.7C8.3 8.6 5.8 14 5.8 22z'), P('M17 2.5a4.5 4.5 0 1 1 0 9a4.5 4.5 0 1 1 0-9z')],
  glow: [P('M9.5 5h5v15.5a2.5 2.5 0 0 1-5 0zM11 8v11h2V8z'), P('M10 1.5h4v2.5h-4z')],
  pet: [P('M2 12c2.5-4 6-6 10-6c3.5 0 6.2 1.6 8 4l3-3v10l-3-3c-1.8 2.4-4.5 4-8 4c-4 0-7.5-2-10-6zM6.8 10.4a1.4 1.4 0 1 0 0 2.8a1.4 1.4 0 1 0 0-2.8z')],
  sprint: [P('M2.5 6l6 6-6 6h3.6l6-6-6-6zM11 6l6 6-6 6h3.6l6-6-6-6z'), { stroke: P('M20.5 8.5v7'), w: 1.6 }], // (5.5.3) two arrows forward and a stop line
  pause: [P('M6 4h4.2v16H6zM13.8 4H18v16h-4.2z')],
  bag: [P('M8 5.6c0-2 1.8-3.4 4-3.4s4 1.4 4 3.4v1h-1.6v-1c0-1-1-1.8-2.4-1.8s-2.4.8-2.4 1.8v1H8z'), P('M7.4 6.6h9.2c2 0 3.4 1.4 3.4 3.4v9.4c0 1.4-1.2 2.6-2.6 2.6H6.6C5.2 22 4 20.8 4 19.4V10c0-2 1.4-3.4 3.4-3.4zM8.4 14.6v5h7.2v-5z'), S('M4.4 11.6h15.2', 1.1), S('M10.2 11.6v2M13.8 11.6v2', 1.4)],
  leave: [P('M12 2l7 7.5h-4.5V16h-5V9.5H5z'), P('M2.5 19h19v3h-19z')],
  // (6.5.6) the anchor, for the wheel's arc: a ring, the stock across, the shank, the curved arms ending in flukes
  anchor: [P('M12 1.6a2.7 2.7 0 1 1 0 5.4a2.7 2.7 0 1 1 0-5.4zM12 3.1a1.2 1.2 0 1 0 0 2.4a1.2 1.2 0 1 0 0-2.4z'), S('M12 7v13.4', 2.2), S('M7.6 9.6h8.8', 2), S('M4.4 14.2c.8 4 4 6.4 7.6 6.4s6.8-2.4 7.6-6.4', 2.1), P('M2.2 15.8l2.4-3.8 2 3.6z'), P('M21.8 15.8l-2.4-3.8-2 3.6z')],
  tank: [P('M2 4h20v16H2zM4 6v8.5c2.3-1.4 4.7-1.4 8 0s5.7 1.4 8 0V6z')],
  auto: [P('M12 4.2a7.8 7.8 0 1 1 0 15.6a7.8 7.8 0 1 1 0-15.6zM12 6.2a5.8 5.8 0 1 0 0 11.6a5.8 5.8 0 1 0 0-11.6zM12 9.4a2.6 2.6 0 1 1 0 5.2a2.6 2.6 0 1 1 0-5.2z'), { stroke: P('M14.60 12.00L22.00 12.00M13.84 13.84L19.07 19.07M12.00 14.60L12.00 22.00M10.16 13.84L4.93 19.07M9.40 12.00L2.00 12.00M10.16 10.16L4.93 4.93M12.00 9.40L12.00 2.00M13.84 10.16L19.07 4.93'), w: 1.6 }, P('M22.60 12.00m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0z'),P('M19.50 19.50m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0z'),P('M12.00 22.60m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0z'),P('M4.50 19.50m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0z'),P('M1.40 12.00m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0z'),P('M4.50 4.50m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0z'),P('M12.00 1.40m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0z'),P('M19.50 4.50m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0z')],
  trawl: [P('M2 4h3v16H2zM6 5l16 5v4L6 19zM8.5 7.4v9.2l1.5-.45V7.85zM13 8.8v6.4l1.5-.45v-5.5zM17.5 10.2v3.6l1.5-.45v-2.7z')],
  air: [P('M8 7.5a4 4 0 0 1 8 0V20a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z'), P('M10.5 2h3v3h-3zM9 3h6v1.5H9z')],
  sell: [P('M12 2a10 10 0 1 1 0 20a10 10 0 1 1 0-20zM11 5.5v1.3c-1.9.3-3.2 1.6-3.2 3.3c0 2 1.6 2.8 3.9 3.3c1.6.4 2.1.8 2.1 1.4c0 .7-.7 1.2-1.8 1.2c-1.3 0-2.1-.6-2.2-1.6H7.6c.1 1.9 1.4 3.1 3.4 3.4v1.3h2v-1.3c2-.3 3.3-1.6 3.3-3.4c0-2-1.6-2.8-3.9-3.3c-1.6-.4-2.1-.8-2.1-1.3c0-.7.7-1.1 1.6-1.1c1.1 0 1.8.5 1.9 1.4h2.2c-.1-1.8-1.3-3-3-3.3V5.5z')],
  cam: [P('M2 7.5A1.5 1.5 0 0 1 3.5 6H7l1.6-2.5h6.8L17 6h3.5A1.5 1.5 0 0 1 22 7.5V19a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 19zM12 8.5a4.6 4.6 0 1 0 0 9.2a4.6 4.6 0 1 0 0-9.2zM12 10.6a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5z')],
  trap: [P('M4.2 10.4h15.6a1.6 1.6 0 0 1 1.6 1.6v7.6a1.6 1.6 0 0 1-1.6 1.6H4.2a1.6 1.6 0 0 1-1.6-1.6V12a1.6 1.6 0 0 1 1.6-1.6zM4.2 11.9v7.8h15.6v-7.8z'), S('M7.8 11.9v7.8M11.4 11.9v7.8M15 11.9v7.8M4.2 15.8h15.6', 0.8), P('M2.6 13.2l3.6 1.4v2.4l-3.6 1.4z'), S('M19.6 10.4c0-2.6 1-4 2-4.6', 1), P('M20.4 2.4c1.2-.4 2.6.4 2.9 1.6s-.4 2.6-1.6 2.9-2.6-.4-2.9-1.6.4-2.6 1.6-2.9z'), S('M19.9 4.9l3.2-1', 0.9)],
  claw: [P('M1.5 10.6h8.5v2.8H1.5z'), P('M9 12C11.5 5.5 17 3.6 22.5 5.4l-.9 2.6c-4.2-1.2-8.2.4-10 4z'), P('M9 12c2.5 6.5 8 8.4 13.5 6.6l-.9-2.6c-4.2 1.2-8.2-.4-10-4z'), P('M8 9.5a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5z')],
};
Object.assign(G, {
  // the journal: a field notebook, open, its pages lined, a ribbon down the middle
  journal: [P('M2.5 5.5c3.2-1 6.4-.7 9.5 1.2v13.4c-3.1-1.9-6.3-2.2-9.5-1.2zM21.5 5.5c-3.2-1-6.4-.7-9.5 1.2v13.4c3.1-1.9 6.3-2.2 9.5-1.2z'), S('M4.6 9.2c1.8-.3 3.6 0 5.2.8M4.6 12.2c1.8-.3 3.6 0 5.2.8M14.2 10c1.6-.8 3.4-1.1 5.2-.8M14.2 13c1.6-.8 3.4-1.1 5.2-.8', 0.75), S('M12 6.7v14', 0.9)],
  // the B-7: a long hull with its rail and conning tower, the diving sphere slung under it, the tail and its screw
  sub: [P('M2 11.6c0-2 2.6-3.4 8.4-3.4h7.2c2.4 0 3.6 1.4 3.6 3.4s-1.2 3.4-3.6 3.4h-7.2C4.6 15 2 13.6 2 11.6z' + circle(6.2, 11.6, 0.8) + circle(9.4, 11.6, 0.8)), P('M9.4 8.2V5.6c0-.6.4-1 1-1h2.8c.6 0 1 .4 1 1v2.6zM11.4 4.6V2.6h.8v2z'), P(circle(11.8, 17.6, 3.2) + circle(11.8, 17.6, 1.3)), P('M21 9.6l2.4-1.6v7.2L21 13.6z'), S('M5 8.4h10', 0.7)],
  // an underwater camera: the housing with its two grips and the big round port of the lens, a strobe on top
  cam: [P('M5.4 7.6h13.2a1.8 1.8 0 0 1 1.8 1.8v8.4a1.8 1.8 0 0 1-1.8 1.8H5.4a1.8 1.8 0 0 1-1.8-1.8V9.4a1.8 1.8 0 0 1 1.8-1.8z' + circle(12, 13.6, 4.4) + circle(12, 13.6, 3.2)), P(circle(12, 13.6, 1.5)), P('M1 10h1.8v7.2H1zM21.2 10H23v7.2h-1.8zM6.4 4.6h3.6l.8 3H5.6z')],
  // the lamp: a dive torch, its ribbed grip, the wide head, and three rays of its beam
  lamp: [P('M2 10.4h9.4v3.2H2zM11.4 8.8l3.8-1.4v9.2l-3.8-1.4z'), S('M4.4 10.4v3.2M6.6 10.4v3.2M8.8 10.4v3.2', 0.8), S('M17.4 9l5-2M17.6 12h5.2M17.4 15l5 2', 1.3)],
  // settings (and the pause): a cog
  gear: [P(cog(12, 12, 7, 9.6, 8, 3))],
  // the swap chip on the big button: two arrows chasing round
  swap: [S('M5.4 9.6A7 7 0 0 1 17.8 7.4M18.6 14.4A7 7 0 0 1 6.2 16.6', 2), P('M18.8 3.6l.6 5.6-5.4-1.4zM5.2 20.4l-.6-5.6 5.4 1.4z')],
});
export function drawGlyph(ctx, name, cx, cy, size, alpha = 1) {
  const paths = G[name]; if (!paths) return;
  const k = size / 24;
  ctx.save(); ctx.translate(cx - size / 2, cy - size / 2); ctx.scale(k, k);
  ctx.globalAlpha *= alpha;
  const paint = (col) => { ctx.fillStyle = ctx.strokeStyle = col; for (const p of paths) { if (p.stroke) { ctx.lineWidth = p.w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; if (p.clip) { ctx.save(); ctx.clip(p.clip); ctx.stroke(p.stroke); ctx.restore(); } else ctx.stroke(p.stroke); } else ctx.fill(p, 'evenodd'); } };
  // (5.5) cut into the enamel: a dark groove below and to the right, the symbol in the deck's cream paint on top
  ctx.save(); ctx.translate(0.45, 1.0); paint('rgba(0,0,0,0.6)'); ctx.restore();
  ctx.save(); ctx.translate(-0.25, -0.35); paint('rgba(220,240,235,0.12)'); ctx.restore();
  paint(drawGlyph.col || '#cdd3c4'); // (5.5.2) pale bone, not warm cream
  ctx.restore();
}
