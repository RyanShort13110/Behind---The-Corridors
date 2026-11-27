/**
 * Shared wall / door label meshes for procedural environments.
 * Mount math lives in label-mount.js (Three-free); use that for flush placement.
 */

import * as THREE from 'three';
import {
  resolveLabelStyle,
  wallFacingRotationY,
} from './label-mount.js';

export {
  LABEL_PRESETS,
  resolveLabelStyle,
  corridorFaceX,
  flushWallLabelX,
  wallFacingRotationY,
} from './label-mount.js';

/**
 * @param {THREE.Object3D} parent
 * @param {string} text
 * @param {{
 *   x: number, y: number, z: number,
 *   side?: number,
 *   preset?: import('./label-mount.js').ProcgenLabelPreset,
 *   width?: number, height?: number,
 *   fill?: string, stroke?: string, textColor?: string, font?: string,
 *   name?: string,
 *   disposable?: unknown[],
 * }} opts
 */
export function createProcgenLabel(parent, text, opts = {}) {
  const style = resolveLabelStyle(opts.preset || 'tag', {
    ...(opts.width != null ? { width: opts.width } : null),
    ...(opts.height != null ? { height: opts.height } : null),
    ...(opts.fill != null ? { fill: opts.fill } : null),
    ...(opts.stroke != null ? { stroke: opts.stroke } : null),
    ...(opts.textColor != null ? { text: opts.textColor } : null),
    ...(opts.font != null ? { font: opts.font } : null),
  });
  const side = opts.side == null ? 1 : opts.side;

  const can = document.createElement('canvas');
  can.width = style.canvasWidth;
  can.height = style.canvasHeight;
  const c = can.getContext('2d');
  c.fillStyle = style.fill;
  c.fillRect(0, 0, can.width, can.height);
  c.strokeStyle = style.stroke;
  c.lineWidth = style.lineWidth;
  c.strokeRect(
    style.lineWidth,
    style.lineWidth,
    can.width - style.lineWidth * 2,
    can.height - style.lineWidth * 2,
  );
  c.fillStyle = style.text;
  c.font = style.font;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(String(text), can.width / 2, can.height / 2);

  const tex = new THREE.CanvasTexture(can);
  tex.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.PlaneGeometry(style.width, style.height);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.FrontSide }),
  );
  mesh.position.set(opts.x, opts.y, opts.z);
  mesh.rotation.y = wallFacingRotationY(side);
  mesh.name = opts.name || `label:${text}`;
  parent.add(mesh);

  if (Array.isArray(opts.disposable)) {
    opts.disposable.push(geo, tex, mesh.material);
  }
  return mesh;
}
