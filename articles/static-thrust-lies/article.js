// Thrust available vs airspeed: T = min(T0, 550 * eta * P / V), US customary units.
const $ = (id) => document.getElementById(id);
const svg = $("lapse-plot");
const W = 640, H = 340, L = 56, R = 20, TOP = 16, B = 44;
const VMAX = 150; // ft/s

function render() {
  const P = +$("p").value, eta = +$("eta").value, T0 = +$("t0").value;
  $("o-p").textContent = `${P.toFixed(2)} hp`;
  $("o-eta").textContent = eta.toFixed(2);
  $("o-t0").textContent = `${T0.toFixed(1)} lbf`;
  const TMAX = Math.ceil((T0 * 1.25) / 2) * 2;
  const x = (v) => L + (v / VMAX) * (W - L - R);
  const y = (t) => TOP + (1 - t / TMAX) * (H - TOP - B);
  const Vk = (550 * eta * P) / T0; // where the power curve meets the static cap
  const pts = [];
  for (let v = 0; v <= VMAX; v += 1) pts.push(`${x(v).toFixed(1)},${y(Math.min(T0, (550 * eta * P) / Math.max(v, 1e-6))).toFixed(1)}`);
  let g = "";
  for (let v = 0; v <= VMAX; v += 25) g += `<line class="grid" x1="${x(v)}" x2="${x(v)}" y1="${TOP}" y2="${H - B}"/><text class="axis" x="${x(v)}" y="${H - B + 18}" text-anchor="middle">${v}</text>`;
  for (let t = 0; t <= TMAX; t += TMAX / 4) g += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}"/><text class="axis" x="${L - 8}" y="${y(t) + 4}" text-anchor="end">${+t.toFixed(1)}</text>`;
  g += `<text class="axis" x="${(L + W - R) / 2}" y="${H - 6}" text-anchor="middle">Airspeed V (ft/s)</text>`;
  g += `<text class="axis" transform="translate(14 ${(TOP + H - B) / 2}) rotate(-90)" text-anchor="middle">Thrust (lbf)</text>`;
  g += `<line class="static" x1="${L}" x2="${W - R}" y1="${y(T0)}" y2="${y(T0)}"/>`;
  g += `<polyline class="avail" points="${pts.join(" ")}"/>`;
  if (Vk < VMAX) {
    const Tc = (550 * eta * P) / VMAX;
    g += `<circle class="knee" cx="${x(Vk)}" cy="${y(T0)}" r="4"/><text class="note" x="${x(Vk) + 8}" y="${y(T0) - 8}">power-limited above ${Vk.toFixed(0)} ft/s</text>`;
    g += `<text class="note" x="${W - R - 4}" y="${y(Tc) + 20}" text-anchor="end">${Tc.toFixed(2)} lbf at ${VMAX} ft/s (${((Tc / T0) * 100).toFixed(0)}% of static)</text>`;
  }
  svg.innerHTML = g;
}
for (const id of ["p", "eta", "t0"]) $(id).addEventListener("input", render);
render();
