import * as THREE from 'three';
import { UNSEEN_SIDE_PASSAGE_Z, UNSEEN_METERS, UNSEEN_START_Z } from './unseen-story.js';
import {
  createCigarettePack, disposeCigaretteProp, cigaretteInteractable,
} from '../composure.js';

/**
 * Behind. / Level 06 — The Unseen
 * Visual reset after Level 05: an almost ordinary, narrow service corridor.
 * What approaches remains unseen: only a huge, diffuse occlusion builds out
 * of the corridor's darkness after the roar. There is no identifiable body,
 * face, collision actor, or monster model. The void clears at the silence beat.
 * Procedural geometry and shader, shared box instances, no external assets.
 */
export function createUnseen(scene) {
  const world = new THREE.Group();
  world.name = 'Level 06 / The Unseen';
  scene.add(world);
  const fogColor = new THREE.Color(0x111b1e);
  scene.background = fogColor.clone();
  scene.fog = new THREE.FogExp2(fogColor.clone(), 0.028);

  const ownedGeometry = [];
  const ownedMaterials = [];
  const batching = new Map();
  const dummy = new THREE.Object3D();
  const cube = new THREE.BoxGeometry(1, 1, 1);
  ownedGeometry.push(cube);
  const mat = (properties) => {
    const material = new THREE.MeshStandardMaterial(properties);
    ownedMaterials.push(material);
    return material;
  };
  const m = {
    wall: mat({ color: 0x667573, roughness: 0.96 }),
    recess: mat({ color: 0x34413f, roughness: 0.91 }),
    floor: mat({ color: 0x465250, roughness: 0.92 }),
    ceiling: mat({ color: 0x3a4647, roughness: 0.98 }),
    trim: mat({ color: 0x253333, roughness: 0.84 }),
    pipe: mat({ color: 0x8a9892, metalness: 0.28, roughness: 0.65 }),
    rust: mat({ color: 0x665447, roughness: 0.97 }),
    cardboard: mat({ color: 0x746149, roughness: 1.0, side: THREE.DoubleSide }),
    cardboardInside: mat({ color: 0x493b2c, roughness: 1.0 }),
    cardboardCrease: mat({ color: 0x30291f, roughness: 1.0 }),
    door: mat({ color: 0x525f5d, metalness: 0.1, roughness: 0.84 }),
    insert: mat({ color: 0x2b3637, roughness: 0.86 }),
    lamp: mat({ color: 0xd2e4d9, emissive: 0xa7c7b6, emissiveIntensity: 0.30 }),
    dimLamp: mat({ color: 0xc3d7ce, emissive: 0x93b4ab, emissiveIntensity: 0.29 }),
    cabinetInside: mat({ color: 0x101719, roughness: 1.0 }),
    cabinetFrame: mat({ color: 0x58615f, metalness: 0.25, roughness: 0.77 }),
    cabinetDoor: mat({ color: 0x77827c, metalness: 0.25, roughness: 0.79 }),
    plastic: mat({ color: 0xb3c5bd, transparent: true, opacity: 0.28,
      roughness: 0.44, metalness: 0.03, side: THREE.DoubleSide, depthWrite: false }),
  };

  function box(w,h,d,x,y,z,material,parent=world) {
    if (parent !== world) {
      const mesh = new THREE.Mesh(cube,material);
      mesh.scale.set(w,h,d); mesh.position.set(x,y,z); parent.add(mesh);
      return mesh;
    }
    dummy.position.set(x,y,z);
    dummy.rotation.set(0,0,0);
    dummy.scale.set(w,h,d);
    dummy.updateMatrix();
    if (!batching.has(material)) batching.set(material,[]);
    batching.get(material).push(dummy.matrix.clone());
  }
  function object(geometry,material,parent=world) {
    ownedGeometry.push(geometry);
    const mesh = new THREE.Mesh(geometry,material);
    parent.add(mesh);
    return mesh;
  }

  // Main hallway spans z +8 to -74. The corridor now visibly continues
  // into darkness at the far end, but the actual passage is blocked by junk.
  // A real opening on the LEFT wall at z=-5.24 connects to the later exit.
  const exitZ = UNSEEN_SIDE_PASSAGE_Z;
  box(6.6,0.18,82,0,-0.09,-33,m.floor);
  box(6.6,0.16,82,0,3.35,-33,m.ceiling);
  box(0.18,3.52,82,3.30,1.71,-33,m.wall);
  // Do not cover the exit with static wall geometry.
  box(0.18,3.52,11.8,-3.30,1.71,2.10,m.wall); // +8 to -3.8
  box(0.18,3.52,67.2,-3.30,1.71,-40.4,m.wall); // -6.8 to -74
  // Darker continuation shell beyond the barrier so it reads as more corridor.
  box(6.2,0.02,10.0,0,0.01,-69.0,m.recess);
  box(6.2,0.02,10.0,0,3.27,-69.0,m.recess);
  box(0.12,3.12,10.0,-3.12,1.62,-69.0,m.recess);
  box(0.12,3.12,10.0, 3.12,1.62,-69.0,m.recess);
  box(6.2,3.18,0.12,0,1.60,-73.96,m.recess);
  for (const x of [-3.14, 3.14]) box(0.07,0.17,81,x,0.10,-33,m.trim);
  // Floor's uneven tile joins, side-wall access ports, surface plumbing.
  for (let i=0; i<23; i++) {
    const z = 4 - i*2.90;
    box(6.35,0.008,0.019,0,0.013,z,m.trim);
  }
  for (let i=0; i<12; i++) {
    const z = -4.8-i*4.7;
    // Position 11 is a proper animated electrical panel (below), not a
    // second cabinet stuck over a static panel. All other units stay intact.
    if (i===11) continue;
    box(0.065,1.21,1.18,3.17,1.62,z,m.recess);
    box(0.082,0.039,1.07,3.116,2.19,z,m.trim);
    box(0.08,0.08,0.08,3.096,1.49,z+0.33,m.pipe);
  }
  for(const side of [-1,1]) {
    const x = side*2.96;
    box(0.085,0.085,62.0,x,2.75,-30.0,m.pipe);
    box(0.06,0.06,62.0,x,2.57,-30.0,m.rust);
    for (let i=0; i<17; i++) {
      const z=-1-i*3.52;
      box(0.19,0.12,0.075,x,2.70,z,m.trim);
    }
  }

  // The far passage now looks genuinely obstructed rather than sealed off by
  // a flat wall. The corridor continues into shadow, but debris makes it
  // impassable just before the deepest darkness.
  const barrier = new THREE.Group();
  barrier.name = 'Threshold / blocked passage debris';
  world.add(barrier);
  // Low base pile spanning most of the width.
  box(4.95,0.34,1.28,0,0.09,-66.1,m.rust,barrier);
  box(5.32,0.18,1.72,0,0.03,-66.55,m.trim,barrier);
  // Large stacked cartons.
  box(1.30,0.88,1.04,-1.75,0.43,-66.2,m.cardboardInside,barrier);
  box(1.36,0.06,1.10,-1.75,0.88,-66.2,m.cardboard,barrier);
  box(1.36,0.88,0.06,-1.75,0.43,-66.72,m.cardboard,barrier);
  box(1.36,0.88,0.06,-1.75,0.43,-65.68,m.cardboard,barrier);
  box(0.06,0.88,0.98,-2.40,0.43,-66.2,m.cardboard,barrier);
  box(0.06,0.88,0.98,-1.10,0.43,-66.2,m.cardboard,barrier);
  box(1.00,0.72,0.88,-0.52,0.35,-66.52,m.cardboardInside,barrier);
  box(1.04,0.06,0.92,-0.52,0.72,-66.52,m.cardboard,barrier);
  box(1.04,0.72,0.05,-0.52,0.35,-66.96,m.cardboard,barrier);
  box(1.04,0.72,0.05,-0.52,0.35,-66.08,m.cardboard,barrier);
  box(0.05,0.72,0.82,-1.02,0.35,-66.52,m.cardboard,barrier);
  box(0.05,0.72,0.82,-0.02,0.35,-66.52,m.cardboard,barrier);
  box(0.86,0.60,0.72,1.12,0.29,-66.1,m.cardboardInside,barrier);
  box(0.90,0.05,0.76,1.12,0.60,-66.1,m.cardboard,barrier);
  box(0.90,0.60,0.05,1.12,0.29,-66.46,m.cardboard,barrier);
  box(0.90,0.60,0.05,1.12,0.29,-65.74,m.cardboard,barrier);
  box(0.05,0.60,0.66,0.70,0.29,-66.1,m.cardboard,barrier);
  box(0.05,0.60,0.66,1.54,0.29,-66.1,m.cardboard,barrier);
  // Smaller loose cartons and debris near the floor.
  box(0.68,0.42,0.56,2.06,0.20,-66.64,m.cardboardInside,barrier);
  box(0.72,0.05,0.60,2.06,0.42,-66.64,m.cardboard,barrier);
  box(0.72,0.42,0.05,2.06,0.20,-66.92,m.cardboard,barrier);
  box(0.72,0.42,0.05,2.06,0.20,-66.36,m.cardboard,barrier);
  box(0.05,0.42,0.50,1.72,0.20,-66.64,m.cardboard,barrier);
  box(0.05,0.42,0.50,2.40,0.20,-66.64,m.cardboard,barrier);
  box(0.74,0.16,1.46,2.32,0.73,-66.26,m.rust,barrier);
  box(0.14,1.02,0.12,2.54,0.49,-66.78,m.pipe,barrier);
  box(0.10,0.74,0.10,-2.64,0.36,-66.48,m.pipe,barrier);
  box(1.06,0.12,0.10,-2.06,0.95,-66.48,m.trim,barrier);
  // A couple of open flaps make it read as ordinary maintenance junk.
  box(0.56,0.02,0.34,1.18,0.64,-65.76,m.cardboard,barrier);
  box(0.42,0.02,0.28,0.84,0.63,-66.42,m.cardboard,barrier);
  box(0.50,0.02,0.30,-1.84,0.93,-65.74,m.cardboard,barrier);

  // 006.13 — More convincing stacks. These cartons sit ON the original
  // lower boxes and climb in irregular tiers to around 2.4 m, leaving a
  // clear gap below the 3.35 m ceiling. No new gameplay or scare triggers.
  // Add these static pieces to the existing material batches instead of
  // dozens of separate draw calls in the barrier group.
  function stackedCarton(x,bottom,z,w,h,d) {
    const wall=0.036;
    const y=bottom+h*0.5;
    box(w-2*wall,h-2*wall,d-2*wall,x,y,z,m.cardboardInside);
    box(w,wall,d,x,bottom+h-wall*.5,z,m.cardboard);
    box(w,wall,d,x,bottom+wall*.5,z,m.cardboard);
    for(const side of [-1,1]) {
      box(wall,h-wall*2,d-wall*2,x+side*(w-wall)*.5,y,z,m.cardboard);
      box(w-wall*2,h-wall*2,wall,x,y,z+side*(d-wall)*.5,m.cardboard);
    }
    // Small packing-tape strip, low contrast so boxes feel used, not marked.
    box(.055,.006,d*.78,x,bottom+h+.005,z,m.cardboardCrease);
  }
  // First tier is supported by the varied-height cartons below.
  stackedCarton(-1.72,.91,-66.23,1.13,.78,.97);
  stackedCarton(-.51,.75,-66.53,.91,.92,.81);
  stackedCarton(1.12,.62,-66.13,.84,.96,.70);
  stackedCarton(2.05,.42,-66.64,.67,.85,.54);
  // Second tier breaks up the silhouette instead of making a straight wall.
  stackedCarton(-1.70,1.69,-66.25,.90,.64,.78);
  stackedCarton(-.49,1.67,-66.53,.77,.57,.68);
  stackedCarton(1.12,1.58,-66.15,.74,.49,.63);

  // A covered service junction. At first it reads as one more bolted panel.
  box(0.26,3.12,0.15,-3.22,1.56,exitZ-1.47,m.trim);
  box(0.26,3.12,0.15,-3.22,1.56,exitZ+1.47,m.trim);
  box(0.26,0.2,3.13,-3.22,3.04,exitZ,m.trim);
  const sideDoor = new THREE.Group();
  sideDoor.position.set(-3.28,0,exitZ);
  world.add(sideDoor);
  box(0.135,2.85,2.68,0,1.45,0,m.door,sideDoor);
  box(0.024,0.45,0.065,0.087,1.18,0.74,m.pipe,sideDoor);
  for(const z of [-0.92,-0.46,0,0.46,0.92]) {
    box(0.02,0.015,0.18,0.082,2.56,z,m.insert,sideDoor);
  }
  // The exit runs toward -X, at a right angle to the original passage.
  box(7.55,0.18,3.0,-6.94,-0.09,exitZ,m.floor);
  box(7.55,0.16,3.0,-6.94,3.35,exitZ,m.ceiling);
  box(7.55,3.48,0.14,-6.94,1.69,exitZ-1.51,m.recess);
  box(7.55,3.48,0.14,-6.94,1.69,exitZ+1.51,m.recess);
  box(0.14,3.45,3.0,-10.65,1.69,exitZ,m.door);
  for(const z of [exitZ-1.36, exitZ+1.36]) {
    box(7.1,0.11,0.08,-6.93,0.16,z,m.trim);
  }
  // One of the EXISTING right-hand wall panel slots is now functional.
  // Match the original run exactly: height 1.62, centre z=-56.5,
  // 1.18m z-width, horizontal top trim and latch at local z=+0.33.
  // The old offset cabinet had been visibly superimposed over that panel.
  const cabinetZ = -4.8 - 11*4.7; // -56.5; same grid as the static units
  const cabinetBody = new THREE.Group();
  cabinetBody.position.set(0,1.62,cabinetZ);
  world.add(cabinetBody);
  box(0.065,1.21,1.18,3.17,0,0,m.recess,cabinetBody);
  box(0.082,0.039,1.07,3.116,0.57,0,m.trim,cabinetBody);
  // Fine perimeter border gives the door depth without the giant protruding
  // rectangular enclosure from 006.1.
  box(0.026,1.15,0.022,3.096,0,-0.56,m.cabinetFrame,cabinetBody);
  box(0.026,1.15,0.022,3.096,0,0.56,m.cabinetFrame,cabinetBody);
  box(0.026,0.025,1.13,3.096,-0.56,0,m.cabinetFrame,cabinetBody);
  const cabinetDoor = new THREE.Group();
  cabinetDoor.position.set(3.12,0,-0.545); // hinge on -Z edge
  cabinetBody.add(cabinetDoor);
  box(0.048,1.115,1.09,0,0,0.545,m.cabinetDoor,cabinetDoor);
  // Handle follows the original row's handle position, +0.33 from centre.
  box(0.07,0.18,0.09,-0.055,-0.13,0.88,m.trim,cabinetDoor);
  box(0.044,0.025,0.19,-0.10,-0.135,0.88,m.pipe,cabinetDoor);
  // Scratches that seem to travel INSIDE the fabric of the building.
  // Motion is tiny, tied to intermittent audio bursts, never a jump scare.
  const wallStrip = new THREE.Group();
  wallStrip.position.set(3.06,1.85,-34.5);
  world.add(wallStrip);
  box(0.06,0.72,1.45,0,0,0,m.recess,wallStrip);
  for(let i=-3;i<=3;i++) box(0.07,0.018,1.28,0,i*0.085,0,m.trim,wallStrip);

  // A plain trolley carrying a closed CARDBOARD carton, not an extra
  // horror prop. During the return, four real cardboard flaps flip outward;
  // the carton stays open after triggering, including during backtracking.
  box(0.84,0.035,1.14,2.48,0.81,-30.4,m.pipe);
  for(const z of [-30.8,-29.99]) for(const x of [2.14,2.82]) {
    box(0.055,0.74,0.055,x,0.42,z,m.trim);
  }
  // Pack on the maintenance trolley — look right at the carton.
  const cigarette = createCigarettePack(THREE, { name: 'Unseen cigarette pack' });
  cigarette.position.set(2.15, 0.86, -30.15);
  cigarette.rotation.set(0.05, -0.4, 0.12);
  world.add(cigarette);

  const carton = new THREE.Group();
  carton.position.set(2.48,0.845,-30.42);
  world.add(carton);
  const boxW=.68, boxD=.78, boxH=.50, wall=.033;
  box(boxW,wall,boxD,0,wall*.5,0,m.cardboardInside,carton);
  box(wall,boxH,boxD,-boxW*.5,boxH*.5,0,m.cardboard,carton);
  box(wall,boxH,boxD,boxW*.5,boxH*.5,0,m.cardboard,carton);
  box(boxW-wall*2,boxH,wall,0,boxH*.5,-boxD*.5,m.cardboard,carton);
  box(boxW-wall*2,boxH,wall,0,boxH*.5,boxD*.5,m.cardboard,carton);
  // Double-sided, light-weight lid faces. The near/far short flaps rest
  // beneath the two long flaps so the box initially reads as CLOSED.
  const cartonFlaps=[];
  for(const side of [-1,1]) {
    const flap = new THREE.Group();
    flap.position.set(side*boxW*.5,boxH,0);
    carton.add(flap);
    box(boxW*.5,.024,boxD-.055,-side*boxW*.25,0,0,m.cardboard,flap);
    box(.010,.014,boxD-.06,-side*.025,.015,0,m.cardboardCrease,flap);
    cartonFlaps.push({mesh:flap,axis:'z',sign:-side,delay:0});
  }
  for(const side of [-1,1]) {
    const flap = new THREE.Group();
    flap.position.set(0,boxH-.029,side*boxD*.5);
    carton.add(flap);
    box(boxW-.07,.02,boxD*.5,0,0,-side*boxD*.25,m.cardboard,flap);
    cartonFlaps.push({mesh:flap,axis:'x',sign:side,delay:.13});
  }
  // Bare cable and metal grille: almost invisible movement only after contact.
  const cable = new THREE.Group();
  cable.position.set(2.47,3.23,-29.9);
  world.add(cable);
  box(0.028,0.68,0.029,0,-0.32,0,m.pipe,cable);
  box(0.025,0.10,0.08,0,-0.68,0,m.trim,cable);
  const grille = new THREE.Group();
  grille.position.set(0,3.24,-25.5);
  world.add(grille);
  box(1.25,0.075,0.86,0,0,0,m.recess,grille);
  for(let i=-3;i<=3;i++) box(0.035,0.023,0.79,i*0.16,-0.06,0,m.pipe,grille);

  // Hanging translucent plastic at the entry: a final remnant of Level 05's
  // atmosphere, but nothing organic persists beyond it.
  const strips=[];
  for(let i=0;i<11;i++) {
    const mesh=object(new THREE.PlaneGeometry(0.37,2.44),m.plastic);
    mesh.position.set(-1.86+i*0.37,2.16,0.95 + Math.sin(i*1.7)*0.06);
    mesh.rotation.y=Math.sin(i*1.29)*0.05;
    strips.push({mesh,index:i});
  }
  box(4.24,0.08,0.09,0,3.25,0.95,m.pipe);

  const lamps=[];
  for(let i=0;i<9;i++) {
    const z=2.8-i*7.8;
    // Individual diffuser materials let the bulbs go dark along with their
    // PointLights. Instancing a shared emissive material would glow forever.
    const diffuser=mat({color: 0xd1e2d8, emissive: 0xa3c3b6,
      emissiveIntensity: .36, roughness: .78 });
    const fixture=new THREE.Mesh(cube,diffuser);
    fixture.scale.set(1.54,0.06,0.53);
    fixture.position.set(0,3.245,z);
    world.add(fixture);
    const light=new THREE.PointLight(i%3===0?0xb6d1c7:0xd8e8de,1.53,12,2);
    light.position.set(0,3.0,z);
    world.add(light);
    lamps.push({light,z,diffuser,index:i,flicker:0});
  }
  // Exit lights switch on only after the secret panel retracts.
  const exitLight=new THREE.PointLight(0xb9d0c8,0,8,2);
  exitLight.position.set(-5.6,2.96,exitZ);
  world.add(exitLight);
  const ambient=new THREE.HemisphereLight(0xc5d8ce,0x151d1d,0.73);
  world.add(ambient);

  for(const [material,matrices] of batching) {
    const inst=new THREE.InstancedMesh(cube,material,matrices.length);
    matrices.forEach((matrix,i)=>inst.setMatrixAt(i,matrix));
    inst.instanceMatrix.needsUpdate=true;
    inst.computeBoundingSphere();
    world.add(inst);
  }

  // 006.14 / THE APPROACHING ABSENCE — EXPERIMENTAL
  // The presence is still NOT a creature mesh. Two shader planes suggest
  // something that cannot fit into the hall. Darkened strips against the real
  // wall surfaces make nearby space appear to lose light before it arrives.
  // All shaders/materials are created once, not during the frame loop.
  const shadowGeometry = new THREE.PlaneGeometry(1,1);
  ownedGeometry.push(shadowGeometry);
  const shadowVertex = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  const shadowFragment = `
    varying vec2 vUv;
    uniform float uTime;
    uniform float uOpacity;
    uniform float uMotion;
    uniform float uLayer;
    uniform float uCloseness;
    void main() {
      vec2 q = vUv - vec2(0.5);
      float y = vUv.y;
      // A slow, asymmetric breathing of the perimeter; there is no face,
      // head, limb, or central humanoid skeleton inside the silhouette.
      float tide = uMotion * sin(uTime * .79 + y * 5.3 + uLayer * 2.1);
      float drift = uMotion * (sin(y * 8.3 + uTime * .33 + uLayer) * .020
                 + sin(y * 19.8 - uTime * .21 + uLayer * 2.7) * .010);
      float bulgeLeft = sin(y * 8.4 + uTime * .44 + uLayer) * .045
                      + sin(y * 17.9 + uTime * .17) * .022;
      float bulgeRight = sin(y * 11.8 - uTime * .26 + uLayer * 1.9) * .042
                       - sin(y * 21.7 + uTime * .12) * .014;
      // It appears wider than the walls should permit, particularly near the
      // top. High-edge growth is a soft mass rather than a recognizable limb.
      float roof = smoothstep(.57, .93, y) * uCloseness;
      float leftWidth  = .215 + .090*sin(3.14159*y) + bulgeLeft
                       + roof*(.105 + .040*tide);
      float rightWidth = .225 + .080*sin(3.14159*y) + bulgeRight
                       + roof*(.095 - .030*tide);
      float center = drift + .015*tide;
      float left  = 1.0 - smoothstep(leftWidth-.105, leftWidth+.030, -q.x+center);
      float right = 1.0 - smoothstep(rightWidth-.105, rightWidth+.030, q.x-center);
      float body = min(left,right);
      // Core stays in place while the outer skin expands and contracts.
      float core = 1.0 - smoothstep(.13,.42,length(vec2(q.x*.93,q.y*.7)));
      float contour = max(body,core*.88);
      float top = 1.0 - smoothstep(.94,.998,y);
      float bottom = smoothstep(.018,.16,y);
      float grain = .88 + .065*sin(y*37.0+uLayer*4.0)
                         * sin(q.x*26.0-y*11.0+uMotion*uTime*.19);
      float alpha = clamp(contour*top*bottom*grain*uOpacity,0.0,.96);
      if(alpha < .009) discard;
      gl_FragColor = vec4(vec3(.003,.007,.009),alpha);
    }
  `;
  const shadows=[];
  for(let i=0;i<2;i++) {
    const material = new THREE.ShaderMaterial({
      vertexShader: shadowVertex,
      fragmentShader: shadowFragment,
      uniforms: {
        uTime:{value:0}, uOpacity:{value:0}, uMotion:{value:1},
        uLayer:{value:i*.87},uCloseness:{value:0},
      },
      transparent:true,depthWrite:false,side:THREE.DoubleSide,
    });
    ownedMaterials.push(material);
    const sh=new THREE.Mesh(shadowGeometry,material);
    sh.name='Unseen / boundaryless approaching shape '+i;
    sh.position.y=1.71;
    sh.renderOrder=9+i;
    sh.visible=false;
    world.add(sh);
    shadows.push(sh);
  }

  // Two translucent washes sit just IN FRONT of the existing wall faces.
  // They create localized light absorption, rather than turning off the whole
  // hallway or adding a flashing full-screen overlay.
  const absorptionFragment = `
    varying vec2 vUv;
    uniform float uTime;
    uniform float uStrength;
    uniform float uMotion;
    uniform float uSide;
    void main() {
      float along = vUv.x;
      float vertical = vUv.y;
      float ends = smoothstep(.015,.24,along)
                 * (1.0-smoothstep(.75,.995,along));
      float cap = smoothstep(.01,.16,vertical)
                * (1.0-smoothstep(.87,.995,vertical));
      float breathe = .85 + .15*sin(vertical*7.7 + along*9.1
                              + uSide*1.4 + uMotion*uTime*.29);
      float alpha = clamp(uStrength*ends*cap*breathe,0.0,.58);
      if(alpha<.006) discard;
      gl_FragColor=vec4(vec3(.006,.010,.012),alpha);
    }
  `;
  const wallAbsorption=[];
  for(const side of [-1,1]) {
    const material=new THREE.ShaderMaterial({
      vertexShader:shadowVertex,fragmentShader:absorptionFragment,
      uniforms:{uTime:{value:0},uStrength:{value:0},
        uMotion:{value:1},uSide:{value:side}},
      transparent:true,depthWrite:false,side:THREE.DoubleSide,
    });
    ownedMaterials.push(material);
    const plane=new THREE.Mesh(shadowGeometry,material);
    plane.name=side<0?'Unseen / left-wall light absorption':'Unseen / right-wall light absorption';
    plane.position.set(side*3.02,1.68,-62);
    plane.rotation.y=Math.PI/2;
    plane.scale.set(14.5,3.12,1);
    plane.renderOrder=7;
    plane.visible=false;
    world.add(plane);
    wallAbsorption.push(plane);
  }

  let shadowAlpha=0;
  let shadowFarthestZ=-62.0;
  let blackoutAmount=0;
  // The shadow has several modest, one-way spatial gains. They occur only
  // once each even when the player pauses or re-scrolls; there is no shake,
  // speed change, or extra sound, and it never crosses the camera.
  let advanceStage=0;
  let advanceOffset=0;
  const advanceThresholds=[.29,.54,.76];
  const advanceSteps=[.42,.69,.88];

  let elapsed = 0;
  let panelHeight = 0;
  let cabinetAngle = 0;
  let cartonOpenTime = 0;
  const interactables = [
    cigaretteInteractable('cigarette-unseen', cigarette),
  ];

  return {
    interactables,
    update(progress,state,dt,reduced) {
      elapsed += dt;
      const follow = (from,to,k) => reduced ? to :
        from + (to-from)*(1-Math.exp(-dt*k));
      // The existing exit remains functional. The cabinet is a different
      // object, and does not serve as a collectible or artificial puzzle.
      const shouldOpen = state.sideDoorOpen ? 3.12 : 0;
      panelHeight = follow(panelHeight, shouldOpen, 2.6);
      sideDoor.position.y = panelHeight;
      exitLight.intensity = state.sideDoorOpen ? 0.62 : 0;

      // Short sharp latch; the door then settles at 42 degrees. Long after
      // the player thinks it stopped, it inches open a little farther.
      const cabinetTarget = state.cabinetOpen
        ? (state.scratching ? 0.97 : 0.74) : 0;
      cabinetAngle = follow(cabinetAngle,cabinetTarget,state.scratching?0.32:3.8);
      cabinetDoor.rotation.y = -cabinetAngle;
      // A fast but non-strobing paper-flap release, staggered in two pairs.
      // Important: both triggers and these animations remain one-way.
      if(state.cartonOpen) cartonOpenTime = Math.min(3,cartonOpenTime+dt);
      const ease = t => 1 - Math.pow(1-Math.max(0,Math.min(1,t)),3);
      cartonFlaps.forEach(({mesh,axis,sign,delay}) => {
        const amount = state.cartonOpen
          ? (reduced ? 1 : ease((cartonOpenTime-delay)/.36)) : 0;
        mesh.rotation[axis] = sign * amount * (axis==='z' ? 1.94 : 1.68);
      });
      // Sub-pixel reactions must never introduce a strobe or camera shake.
      const activity = state.silence ? 0 : state.scratchPulse;
      wallStrip.position.x = 3.06 - (reduced ? 0 : 0.013 * activity);
      wallStrip.rotation.x = reduced ? 0 : 0.016 * activity;
      const ceiling = state.silence ? 0 : state.ceilingPulse;
      cable.rotation.z = reduced ? 0 : 0.027 * ceiling * Math.sin(elapsed * 13);
      grille.rotation.z = reduced ? 0 : 0.019 * ceiling * Math.sin(elapsed * 16);

      // Three restrained, one-way advances break up the smooth approach.
      // Distance is still capped ahead of the player; no chase mechanics move.
      const cameraZ = UNSEEN_START_Z - progress * UNSEEN_METERS;
      const closeness = Math.max(0, Math.min(1,
        (16 - state.presenceDistance) / 14.2));
      if(state.shadowAppeared && !state.silence) {
        while(advanceStage < advanceThresholds.length &&
              closeness >= advanceThresholds[advanceStage]) {
          advanceOffset += advanceSteps[advanceStage];
          advanceStage++;
        }
        const distance=Math.max(3.35,state.presenceDistance*1.23);
        const actualOffset=reduced?0:advanceOffset;
        const targetZ=Math.min(cameraZ-2.8,cameraZ-distance+actualOffset);
        shadowFarthestZ=Math.max(shadowFarthestZ,targetZ);
      }
      const shadowTarget=state.shadowAppeared && !state.silence ?
        Math.min(.89,.35+closeness*.53) : 0;
      shadowAlpha=follow(shadowAlpha,shadowTarget,
        state.silence?24:(reduced?8:3.5));
      shadows.forEach((sh,i)=>{
        sh.visible=shadowAlpha>.008 && !state.silence;
        sh.position.z=shadowFarthestZ-i*.32;
        const size=.79+closeness*.27;
        sh.scale.x=(i?5.35:5.9)*size;
        sh.scale.y=(i?3.72:3.95)*size;
        sh.material.uniforms.uTime.value=elapsed;
        sh.material.uniforms.uMotion.value=reduced?0:1;
        sh.material.uniforms.uCloseness.value=closeness;
        sh.material.uniforms.uOpacity.value=shadowAlpha*(i?.53:.80);
      });
      // Wall shadow reaches around the shape and ahead of its visible edge.
      // Hidden on the exact silence event, independent of the blackout fade.
      const absorptionStrength=state.shadowAppeared && !state.silence
        ? shadowAlpha*(.12+.47*closeness) : 0;
      wallAbsorption.forEach(plane=>{
        plane.visible=absorptionStrength>.008;
        plane.position.z=shadowFarthestZ+2.6;
        plane.material.uniforms.uTime.value=elapsed;
        plane.material.uniforms.uMotion.value=reduced?0:1;
        plane.material.uniforms.uStrength.value=absorptionStrength;
      });

      // The darkness moves from the blocked end toward the player. The two
      // near-exit fixtures remain navigable. At the EXACT silence event all
      // extinguished fixtures return over ~0.3 seconds (no flash or strobe),
      // while the approaching void rapidly disappears.
      const advanceTarget = state.darkness && !state.silence
        ? Math.max(0,Math.min(1,(0.43 - progress)/0.21)) : 0;
      blackoutAmount = follow(blackoutAmount, advanceTarget,
        state.silence ? 10 : 7);
      const advance = blackoutAmount;
      lamps.forEach(lamp => {
        const {light,diffuser,index} = lamp;
        // Only two real fixtures flutter, and only as the retreat builds.
        // Uneven short dips rather than constant flicker or a global strobe.
        // These fixtures are spaced apart AHEAD of the retreating camera (8 then 6).
        const windowOpen = state.retreatStarted && !state.silence &&
          !reduced && !state.darkness &&
          (index === 8 ? progress <= .745 && progress > .575 :
            index === 6 ? progress <= .555 && progress > .432 : false);
        const period = index === 8 ? 3.17 : 3.71;
        const phase = (elapsed + (index === 8 ? .48 : 1.13)) % period;
        // 2–3 uneven, low-frequency dips per cycle, smoothed at their edges.
        const target = windowOpen && (
          (phase > .22 && phase < .38) ||
          (phase > .61 && phase < .72) ||
          (phase > 1.47 && phase < 1.66)) ? .73 : 0;
        lamp.flicker = follow(lamp.flicker, target, 22);
        // Fixtures are sorted near->far: 8 goes dark first, then 7, ... 2.
        const position = (8 - index) / 7;
        const dim = index < 2 ? 0 : Math.max(0, Math.min(1, (advance - position*.80) * 6));
        const base = state.reachedBarrier ? .94 : 1;
        const flutter = 1 - lamp.flicker * .82;
        // Lights physically near the presence appear to lose output before
        // the established progressive blackout arrives. No new flicker.
        const proximity=Math.max(0,1-Math.abs(lamp.z-shadowFarthestZ)/13);
        const swallow=state.shadowAppeared && !state.silence
          ? shadowAlpha*closeness*proximity : 0;
        light.intensity = 1.53 * base * (1 - dim * .975) * flutter * (1-.33*swallow);
        diffuser.emissiveIntensity = .36 * (1 - dim * .98) * flutter * (1-.21*swallow);
      });
      ambient.intensity = .73 - advance * .24;
      // Modest door/fog contrast preserved, especially with reduced motion.
      strips.forEach(({mesh,index}) => {
        mesh.rotation.y = reduced ? 0 : .04*Math.sin(elapsed*.6+index*.7);
      });
    },
    reset() {
      elapsed=0; panelHeight=0; sideDoor.position.y=0;
      shadowAlpha=0; shadowFarthestZ=-62.0; blackoutAmount=0;
      advanceStage=0; advanceOffset=0;
      shadows.forEach(sh=>{
        sh.visible=false;
        sh.material.uniforms.uOpacity.value=0;
        sh.material.uniforms.uCloseness.value=0;
      });
      wallAbsorption.forEach(plane=>{
        plane.visible=false;
        plane.position.z=-62;
        plane.material.uniforms.uStrength.value=0;
      });
      cabinetAngle=0; cabinetDoor.rotation.y=0;
      cartonOpenTime=0;
      cartonFlaps.forEach(({mesh}) => { mesh.rotation.x=0; mesh.rotation.z=0; });
      wallStrip.position.x=3.06; wallStrip.rotation.x=0;
      cable.rotation.z=0; grille.rotation.z=0;
      exitLight.intensity=0; ambient.intensity=.73;
      lamps.forEach(({light,diffuser},index)=>{
        lamps[index].flicker=0;
        light.intensity=1.53; diffuser.emissiveIntensity=.36;
      });
      cigarette.visible=true;
      cigarette.userData.taken=false;
    },
    dispose() {
      scene.remove(world);
      disposeCigaretteProp(cigarette);
      for(const geo of ownedGeometry) geo.dispose();
      for(const material of ownedMaterials) material.dispose();
    },
  };
}
