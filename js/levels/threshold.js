import * as THREE from 'three';
import {
  smoothstep, corruptionAt, THRESHOLD_START_Z, THRESHOLD_METERS,
  THRESHOLD_DOOR_START, THRESHOLD_DOOR_OPEN,
} from './threshold-story.js';
import {
  createCigarettePack, disposeCigaretteProp, cigaretteInteractable,
} from '../composure.js';
import { createTheBent } from '../combat/enemies/the-bent.js';
import {
  BENT_WORLD_Z, BENT_NOTICE_PROGRESS, BENT_TRIGGER_PROGRESS,
} from '../combat/encounters/the-bent.js';

/**
 * Level 05 / The Threshold.
 * Procedural, spatial escalation in ONE disposable scene. No textures, bones,
 * shadow maps, extra renderers, or per-frame geometry allocations.
 * The door is a freestanding object, with daylight-sized gaps to either wall.
 * Past it a familiar hallway gradually becomes organically distorted.
 */
export function createThreshold(scene) {
  const world = new THREE.Group();
  world.name = 'Level 05 / The Threshold';
  scene.add(world);
  // All hallucinated geometry lives under one container. The institutional
  // corridor stays intact beneath it, ready to be revealed in a single frame.
  const nightmare = new THREE.Group();
  nightmare.name = 'Threshold / hallucinated wall growth';
  world.add(nightmare);
  scene.background = new THREE.Color(0x101413);
  scene.fog = new THREE.FogExp2(0x101413, 0.032);
  const coolFog = new THREE.Color(0x101413);
  const hotFog = new THREE.Color(0x290808);
  const ownedGeometry = [];
  const ownedMaterials = [];
  const lights = [];
  const fixtureMaterials = [];
  const meshes = [];
  const seamActors = [];

  function material(props) {
    const m = new THREE.MeshStandardMaterial(props);
    ownedMaterials.push(m);
    return m;
  }
  const mat = {
    wall: material({ color: 0x646b65, roughness: 0.93 }),
    floor: material({ color: 0x424845, roughness: 0.91 }),
    ceiling: material({ color: 0x3e4643, roughness: 0.93 }),
    trim: material({ color: 0x292f2e, roughness: 0.82 }),
    door: material({ color: 0x565f58, roughness: 0.78 }),
    handle: material({ color: 0xb4b0a4, roughness: 0.49, metalness: 0.36 }),
    crack: material({ color: 0x282923, roughness: 0.98, side: THREE.DoubleSide }),
    infected: material({ color: 0x6c3734, roughness: 0.68, side: THREE.DoubleSide, vertexColors: true }),
    deeper: material({ color: 0x47171b, roughness: 0.69, metalness: 0.07, side: THREE.DoubleSide }),
    // Non-emissive, skin-like folds rather than bright floating red rods.
    vein: material({ color: 0x653033, roughness: 0.88, metalness: 0, side: THREE.DoubleSide }),
    tendon: material({ color: 0x79433c, roughness: 0.82, metalness: 0, side: THREE.DoubleSide }),
    key: material({ color: 0xb9a17b, roughness: 0.41, metalness: 0.38 }),
    tag: material({ color: 0x8b7a64, roughness: 0.92 }),
    liftFrame: material({ color: 0x192123, roughness: 0.60, metalness: 0.35 }),
    liftDoor: material({ color: 0x52615e, roughness: 0.57, metalness: 0.53 }),
    liftTrim: material({ color: 0x87918a, roughness: 0.57, metalness: 0.29 }),
    liftRecess: material({ color: 0x070b0d, roughness: 1.0 }),
    liftSignal: material({ color: 0xd3a16b, emissive: 0x7b4020,
      emissiveIntensity: 0.66, roughness: 0.73 }),
  };
  const cube = new THREE.BoxGeometry(1, 1, 1);
  ownedGeometry.push(cube);
  const batches = new Map();
  const dummy = new THREE.Object3D();
  function box(w,h,d,x,y,z,m,parent=world) {
    if (parent !== world) {
      const obj = new THREE.Mesh(cube,m);
      obj.position.set(x,y,z);
      obj.scale.set(w,h,d);
      parent.add(obj);
      return obj;
    }
    dummy.position.set(x,y,z); dummy.rotation.set(0,0,0);
    dummy.scale.set(w,h,d); dummy.updateMatrix();
    if(!batches.has(m)) batches.set(m,[]);
    batches.get(m).push(dummy.matrix.clone());
    return null;
  }
  function mesh(geo,m,parent=world) {
    ownedGeometry.push(geo);
    const object=new THREE.Mesh(geo,m);
    parent.add(object);
    meshes.push(object);
    return object;
  }

  // Base institutional architecture: continuous geometry avoids gaps at phases.
  // x=0 remains unobstructed; camera travels from z=+4.6 to z=-81.2.
  box(7.4,0.18,96,0,-0.10,-41.0,mat.floor);
  box(7.4,0.16,96,0,3.5,-41.0,mat.ceiling);
  box(0.18,3.6,96,-3.7,1.73,-41.0,mat.wall);
  box(0.18,3.6,96, 3.7,1.73,-41.0,mat.wall);
  box(7.4,3.6,0.16,0,1.73,-89,mat.wall);
  for(const x of [-3.58,3.58]) box(0.10,0.24,95,x,0.13,-41,mat.trim);

  // The ordinary elevator is NOT visible while the organic corridor remains.
  // It appears only on the very same frame as the hallucination clears. All
  // faces are set slightly in FRONT of the existing z=-89 end wall; nothing
  // coplanar is drawn over it and the original level exit stays untouched.
  const elevator = new THREE.Group();
  elevator.name = 'Threshold / elevator revealed after hallucination';
  elevator.visible = false;
  world.add(elevator);
  const liftZ = -88.60;
  // Recess conceals the original solid wall behind the steel doors.
  box(2.14, 2.95, 0.08, 0, 1.50, liftZ - 0.25, mat.liftRecess, elevator);
  // Grounded jambs and header around a 2.12 m wide pair of sliding doors.
  for(const x of [-1.13, 1.13])
    box(0.18, 3.12, 0.24, x, 1.54, liftZ, mat.liftFrame, elevator);
  box(2.45, 0.20, 0.24, 0, 3.12, liftZ, mat.liftFrame, elevator);
  box(2.38, 0.055, 0.27, 0, 0.025, liftZ + 0.03, mat.liftFrame, elevator);
  // Modest brushed-metal elevator leaves with a slim central vertical seam.
  for(const side of [-1, 1]) {
    box(1.045, 2.90, 0.085, side * 0.53, 1.51,
      liftZ + 0.09, mat.liftDoor, elevator);
    box(0.016, 2.76, 0.018, side * 0.013, 1.51,
      liftZ + 0.145, mat.liftFrame, elevator);
    box(0.022, 2.63, 0.012, side * 0.96, 1.51,
      liftZ + 0.145, mat.liftTrim, elevator);
  }
  // An unobtrusive indicator and call-button plate make its purpose obvious
  // without adding a caption, new sound cue, or a theatrical glowing portal.
  box(0.43, 0.20, 0.055, 0, 3.35, liftZ + 0.12, mat.liftFrame, elevator);
  box(0.12, 0.058, 0.015, 0, 3.35, liftZ + 0.16, mat.liftSignal, elevator);
  box(0.12, 0.36, 0.045, 1.48, 1.46,
    liftZ + 0.15, mat.liftFrame, elevator);
  box(0.042, 0.042, 0.012, 1.48, 1.49,
    liftZ + 0.183, mat.liftSignal, elevator);

  // Regular framed doors, still institutionally legible even inside the red hall.
  // Only the last grey pair before the deep red stretch (i===8, z≈-48) — left and
  // right — is forced organic so it matches the flesh walls ahead.
  for(let i=0;i<15;i++) {
    const z=-7-i*5.15;
    const organicPair = i === 8;
    for(const side of [-1,1]) {
      const x=side*3.53;
      const leafMat = organicPair ? mat.vein : (i > 8 ? mat.trim : mat.door);
      const frameMat = organicPair ? mat.deeper : mat.trim;
      box(0.085,2.76,1.84,x,1.39,z, leafMat);
      box(0.20,2.85,0.11,x-side*0.04,1.43,z-0.99,frameMat);
      box(0.20,2.85,0.11,x-side*0.04,1.43,z+0.99,frameMat);
      box(0.20,0.11,2.10,x-side*0.04,2.85,z,frameMat);
      if (organicPair) {
        box(0.045,2.62,1.68,x-side*0.06,1.39,z, mat.vein);
      } else {
        box(0.17,0.06,0.15,x-side*0.19,1.17,z+0.48,mat.handle);
      }
    }
  }

  // Freestanding door in the CENTER of the hallway: no adjacent wall.
  const doorZ=-14.4;
  box(0.12,3.04,0.20,-1.00,1.53,doorZ,mat.trim);
  box(0.12,3.04,0.20,1.00,1.53,doorZ,mat.trim);
  box(2.12,0.15,0.22,0,3.10,doorZ,mat.trim);
  const hinge=new THREE.Group();
  hinge.position.set(-0.94,0,doorZ);
  // Pack near the ordinary entrance, left of the freestanding door — look left.
  const cigarette = createCigarettePack(THREE, { name: 'Threshold cigarette pack' });
  cigarette.position.set(-2.15, 0.09, doorZ + 2.4);
  cigarette.rotation.set(0.1, 0.7, 0.15);
  world.add(cigarette);
  world.add(hinge);
  box(1.87,2.90,0.105,0.94,1.48,0,mat.door,hinge);
  box(0.15,0.06,0.18,1.69,1.13,0.11,mat.handle,hinge);
  box(1.64,0.07,0.12,0.94,2.36,0.02,mat.trim,hinge);
  // An ordinary wall panel hangs loose, long before the organic phase.
  for(let i=0;i<8;i++) {
    const z=-27.6-i*5.7;
    const x=i%2===0?-3.55:3.55;
    box(0.04,0.08,0.80,x,1.02+(i%3)*0.52,z,mat.crack);
    box(0.08,0.10,0.24,x-(x>0?0.04:-0.04),1.45,z-0.22,mat.trim);
  }

  // Ragged organic sheets built from vertex grids, which undulate subtly
  // across wall height/length. Three zones increase fold depth and saturation.
  // Geometry stays STATIC, allowing small laptops to render without CPU morph.
  const zoneData = [
    { start:-34,end:-49,depth:0.12,r:0.33,seed:1 },
    { start:-49,end:-67,depth:0.25,r:0.73,seed:2 },
    { start:-67,end:-86,depth:0.39,r:1,seed:3 },
  ];
  // Organic wall coverage should reach almost to the ceiling so no clean strip
  // of institutional paint remains visible above the corrupted doors.
  const organicWallBaseY = 0.18;
  const organicWallHeight = 3.18;
  const wallSurfaces = [];
  function layeredWall(side,zone) {
    const geo=new THREE.BufferGeometry();
    const verts=[],colors=[],idx=[];
    const rows=12, cols=42;
    for(let i=0;i<=cols;i++) {
      const u=i/cols;
      const z=zone.start+(zone.end-zone.start)*u;
      // Irregular edges, as if wall paint is peeling back from a seam.
      const edge=Math.min(1,Math.min(u,1-u)*7);
      for(let j=0;j<=rows;j++) {
        const v=j/rows;
        const height=organicWallBaseY+v*organicWallHeight;
        const fold=Math.sin(z*2.7+v*13+zone.seed)*0.44
          +Math.sin(z*0.91-v*23)*0.24
          +Math.cos(v*37+z*1.2)*0.1;
        const bulge=Math.max(0,fold+0.36)*zone.depth*edge;
        const x=side*(3.60-bulge-0.035);
        const y=height+0.045*Math.sin(z*1.45+v*25)*zone.r;
        verts.push(x,y,z);
        const dark=(Math.sin(z*4.5+v*31)*0.5+0.5);
        colors.push(
          0.55+(1-dark)*0.22*zone.r,
          0.33-dark*0.20*zone.r,
          0.32-dark*0.16*zone.r
        );
        if(i<cols&&j<rows) {
          const a=i*(rows+1)+j,b=(i+1)*(rows+1)+j;
          idx.push(a,b,a+1,b,b+1,a+1);
        }
      }
    }
    geo.setIndex(idx);
    geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
    geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    geo.computeVertexNormals();
    mesh(geo,mat.infected,nightmare);
    // Retain the actual tessellated surface coordinates so later organic folds
    // can lie ON the wall rather than hovering at a fixed x position.
    wallSurfaces.push({ side, zone, verts, rows, cols });
  }
  for(const zone of zoneData) {
    layeredWall(-1,zone); layeredWall(1,zone);
  }

  // The earlier build placed 108 rigid seven-sided cylinders at a fixed wall
  // coordinate. They looked like disconnected, glowing red rectangles in the
  // dark. These shallow ribbons instead follow the ACTUAL irregular wall mesh.
  // Each patch is tapered at both ends, bends slightly, and rises only a few
  // centimeters off the tissue, forming raised seams rather than loose sticks.
  // Ribbons are combined into ONE static mesh per wall zone (6 draw calls).
  const clamp01 = n => Math.max(0, Math.min(1, n));
  function sampleWall(surface,y,z) {
    const {zone,verts,rows,cols}=surface;
    const u=clamp01((z-zone.start)/(zone.end-zone.start))*cols;
    const v=clamp01((y-organicWallBaseY)/organicWallHeight)*rows;
    const i=Math.min(cols-1,Math.floor(u));
    const j=Math.min(rows-1,Math.floor(v));
    const fu=u-i, fv=v-j;
    const index=(col,row)=>(col*(rows+1)+row)*3;
    function mixCoordinate(coord) {
      const a=verts[index(i,j)+coord],b=verts[index(i+1,j)+coord];
      const c=verts[index(i,j+1)+coord],d=verts[index(i+1,j+1)+coord];
      return (a*(1-fu)+b*fu)*(1-fv)+(c*(1-fu)+d*fu)*fv;
    }
    return {x:mixCoordinate(0),y:mixCoordinate(1)};
  }
  function raisedWallSeams(surface) {
    const {side,zone}=surface;
    const vertices=[],indices=[];
    const count=Math.round(8+zone.r*12);
    const steps=10;
    for(let i=0;i<count;i++) {
      const jitter=Math.sin(i*15.31+zone.seed*6.5)*0.16;
      const centerZ=zone.start+(zone.end-zone.start)*(i+0.5+jitter)/count;
      const y0=0.34+((i*0.6180339+zone.seed*0.23)%1)*1.52;
      const length=0.47+zone.r*0.65+0.18*(0.5+0.5*Math.sin(i*3.8));
      const width=(0.022+zone.r*0.039)*(0.75+0.25*Math.sin(i*2.4));
      const startIndex=vertices.length/3;
      for(let k=0;k<=steps;k++) {
        const t=k/steps;
        const y=y0+t*length;
        // No rigid vertical bars: each strand has a gentle S-shaped drift.
        const z=centerZ+0.14*Math.sin(t*Math.PI*1.5+i*1.7)*Math.sin(Math.PI*t)
          +0.08*t*Math.sin(i*2.1);
        const taper=Math.pow(Math.sin(Math.PI*t),0.9);
        for(const rail of [-1,0,1]) {
          const stripeZ=z+rail*width*taper;
          const surfacePoint=sampleWall(surface,y,stripeZ);
          // Edge sits barely above the wall; center forms a soft low ridge.
          const relief=(rail===0?0.019+0.019*zone.r:0.009)*taper+0.004;
          vertices.push(surfacePoint.x-side*relief,surfacePoint.y,stripeZ);
        }
        if(k<steps) {
          const a=startIndex+k*3,b=a+3;
          indices.push(a,b,a+1, b,b+1,a+1);
          indices.push(a+1,b+1,a+2, b+1,b+2,a+2);
        }
      }
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    geometry.computeVertexNormals();
    const surfaceMesh=mesh(geometry,zone.r>0.8?mat.tendon:mat.vein,nightmare);
    surfaceMesh.name='Threshold / tapered organic wall seams';
    seamActors.push({
      mesh: surfaceMesh,
      side,
      zoneStrength: zone.r,
      phase: zone.seed * 1.73,
      baseX: 0,
      baseY: 0,
      baseZ: 0,
      baseScaleX: 1,
      baseScaleY: 1,
      baseScaleZ: 1,
    });
  }
  for(const wall of wallSurfaces) raisedWallSeams(wall);
  // Ragged dark slits over the organic sheeting: geometry, not blood decals.
  for(let i=0;i<23;i++) {
    const z=-51-i*1.47;
    const side=i%2===0?1:-1;
    const opening=mesh(new THREE.PlaneGeometry(0.22+(i%3)*0.13,0.72+(i%4)*0.18),mat.deeper,nightmare);
    opening.position.set(side*3.42,1.30+(i%3)*0.47,z);
    opening.rotation.y=side*Math.PI/2;
    opening.rotation.z=Math.sin(i*3.1)*0.20;
  }

  // Ceiling/floor are scarred only at the very end, keeping a recognizable
  // corridor profile even at peak corruption.
  for(let i=0;i<17;i++) {
    const z=-65-i*1.16;
    const k=i/16;
    box(6.3,0.035,0.10,0,3.32-0.19*k,z, i%2?mat.vein:mat.tendon);
    for(const side of [-1,1]) {
      box(0.14+0.14*k,0.08,1.08,side*(2.6-0.16*k),0.08,z,mat.deeper);
    }
  }

  // The first HOUSE KEY: on an ordinary tiny metal ledge, nearly absorbed by
  // a seam. Not collectible, not a mandatory observation, no explanatory line.
  box(0.45,0.055,0.35,2.75,1.10,-73.8,mat.trim);
  const keyGroup=new THREE.Group();
  keyGroup.name='Worn house key / faded tag';
  keyGroup.position.set(2.73,1.17,-73.77);
  keyGroup.rotation.y=-0.28;
  world.add(keyGroup);
  const keyRing=mesh(new THREE.TorusGeometry(0.058,0.013,5,12),mat.key,keyGroup);
  keyRing.rotation.x=-Math.PI/2;
  keyRing.position.set(-0.07,0.019,0);
  box(0.035,0.028,0.19,0.012,0.023,0,mat.key,keyGroup);
  box(0.065,0.027,0.025,0.024,0.023,0.078,mat.key,keyGroup);
  box(0.058,0.027,0.022,0.020,0.023,0.048,mat.key,keyGroup);
  const tag=mesh(new THREE.PlaneGeometry(0.13,0.20),mat.tag,keyGroup);
  tag.rotation.x=-Math.PI/2; tag.position.set(-0.19,0.043,-0.02);

  // Lights: warm-cool ordinary fixtures before the door, sickly red beyond.
  for(let i=0;i<11;i++) {
    const z=2-i*8.3;
    const fixture=material({ color:0xb6c0b4,emissive:0x8ea69a,emissiveIntensity:0.27 });
    fixtureMaterials.push({material:fixture,z});
    box(1.63,0.06,0.48,0,3.37,z,fixture);
    const normalized=Math.max(0,Math.min(1,(-z-25)/54));
    const light=new THREE.PointLight(0xd2e1cf, z<-60?1.1:2.0, 10.2,2);
    light.position.set(0,3.16,z);
    world.add(light);
    lights.push({light,z,normalized});
  }
  const ambient=new THREE.HemisphereLight(0x9cafa3,0x151616,0.72);
  scene.add(ambient);
  const redAccent=new THREE.PointLight(0xca1b26,0,12,2);
  redAccent.position.set(0,2.9,-74);
  world.add(redAccent);

  for(const [m,matrices] of batches) {
    const inst=new THREE.InstancedMesh(cube,m,matrices.length);
    inst.name='Threshold static batch / '+matrices.length;
    matrices.forEach((matrix,i)=>inst.setMatrixAt(i,matrix));
    inst.instanceMatrix.needsUpdate=true;
    inst.computeBoundingSphere();
    // Ceiling scars and floor growth share these three materials; keep
    // their instanced batches in the same togglable hallucination group.
    const organicBatch=m===mat.deeper || m===mat.vein || m===mat.tendon;
    (organicBatch?nightmare:world).add(inst);
  }

  const interactables = [
    cigaretteInteractable('cigarette-threshold', cigarette),
  ];

  // Debug encounter figure — hidden until bentEnabled; never mandatory.
  const bent = createTheBent({
    homePosition: new THREE.Vector3(0.05, 0, BENT_WORLD_Z),
  });
  bent.root.visible = false;
  bent.setState(bent.BENT_STATES.hidden);
  world.add(bent.root);

  const doorStart=0; let doorAngle=doorStart; let pulseTime=0;
  let ruptureT = -1;
  let ruptureSfxPending = false;
  return {
    interactables,
    bent,
    get doorAngle() { return doorAngle; },
    consumeRuptureStarted() {
      if (!ruptureSfxPending) return false;
      ruptureSfxPending = false;
      return true;
    },
    update(progress,state,dt,reduced) {
      pulseTime += dt;
      // Pre-combat presence for debug Threshold combat experiment.
      if (state?.bentEnabled && !state.bentDefeated && !state.bentSkipped) {
        if (bent.state === bent.BENT_STATES.hidden) {
          bent.reset(new THREE.Vector3(0.05, 0, BENT_WORLD_Z));
          bent.setState(bent.BENT_STATES.idle);
        }
        if (!state.bentCombatStarted) {
          if (progress >= BENT_NOTICE_PROGRESS
              && progress < BENT_TRIGGER_PROGRESS
              && state.direction === 'forward'
              && bent.state === bent.BENT_STATES.idle) {
            bent.setState(bent.BENT_STATES.noticing);
            state.bentNoticed = true;
          }
          if (progress >= BENT_TRIGGER_PROGRESS
              && bent.state !== bent.BENT_STATES.blocking
              && bent.state !== bent.BENT_STATES.noticing) {
            bent.setState(bent.BENT_STATES.blocking);
          }
          bent.update(dt);
        }
        // During active combat the in-world session owns bent.update.
      } else if (state?.bentDefeated || state?.bentSkipped) {
        if (bent.state !== bent.BENT_STATES.defeated
            && bent.state !== bent.BENT_STATES.hidden) {
          bent.setState(bent.BENT_STATES.defeated);
        }
        bent.update(dt);
      } else if (bent.root.visible) {
        bent.setState(bent.BENT_STATES.hidden);
      }
      // A one-way latch. Once opened, it stays open even if player retreats.
      const targetAngle=state.doorOpened
        ? Math.PI*0.53*smoothstep(THRESHOLD_DOOR_START,THRESHOLD_DOOR_OPEN,
          Math.max(progress,THRESHOLD_DOOR_OPEN)) : 0;
      doorAngle=reduced?targetAngle:doorAngle+(targetAngle-doorAngle)*(1-Math.exp(-dt*4.8));
      hinge.rotation.y=doorAngle;
      const cleared=Boolean(state.nightmareCleared);
      nightmare.visible=!cleared;
      elevator.visible=cleared; // Shares the exact one-frame restoration beat.
      const corruption=corruptionAt(progress);
      // No fade or cross-dissolve: the building instantly looks ordinary.
      // Once seen, the restoration is permanent even when scrolling backward.
      const heat=cleared?0:
        corruption.structural*0.20+corruption.organic*0.31+corruption.visceral*0.49;
      scene.fog.color.copy(coolFog).lerp(hotFog,heat);
      scene.background.copy(scene.fog.color);
      scene.fog.density=0.032+heat*0.014;
      ambient.intensity=0.72-heat*0.24;
      ambient.color.setRGB(0.61+heat*0.22,0.68-heat*0.38,0.64-heat*0.38);
      for(const {light,normalized,z} of lights) {
        if(cleared) {
          light.color.set(0xd2e1cf);
          light.intensity=z<-60?1.1:2.0;
        } else {
          const red=Math.max(0,Math.min(1,(heat*1.42+normalized*0.25)-0.22));
          light.color.setRGB(0.82+red*0.18,0.88-red*0.78,0.82-red*0.71);
          light.intensity=2.0-red*0.25;
        }
      }
      for(const {material,z} of fixtureMaterials) {
        if(cleared) {
          material.emissive.set(0x8ea69a);
          material.emissiveIntensity=0.27;
        } else {
          const a=Math.max(0,Math.min(1,(-z-25)/58));
          const x=Math.min(1,heat*0.9+a*0.35);
          material.emissive.setRGB(0.56+x*0.44,0.65-x*0.50,0.60-x*0.48);
          material.emissiveIntensity=0.27+x*0.21;
        }
      }
      redAccent.intensity=heat*3.0;
      // One barely perceptible rhythmic lighting change. Reduced motion = fixed.
      if(!reduced) redAccent.intensity *= 0.94+0.06*Math.sin(progress*42);

      // Final-stretch organic motion: the wall seams start to reach inward and
      // creep toward the player as the visitor nears the exit. Reduced-motion
      // still gets the growth/lunge, but not the extra writhing oscillation.
      const lunge = smoothstep(0.84, 0.975, progress);
      const active = cleared ? 0 : Math.max(corruption.organic, corruption.visceral) * lunge;
      // One-shot rupture contraction at organic recognition — STEADY peaks with it.
      if (state.ruptureArmed && ruptureT < 0 && !cleared) {
        ruptureT = 0;
        ruptureSfxPending = true;
      }
      let rupturePulse = 0;
      if (ruptureT >= 0 && !cleared) {
        ruptureT += Math.max(0, dt);
        const dur = reduced ? 0.2 : 0.62;
        const u = Math.min(1, ruptureT / dur);
        rupturePulse = Math.sin(u * Math.PI);
        if (!state.ruptureSteadyReady && ruptureT >= (reduced ? 0 : 0.12)) {
          state.ruptureSteadyReady = true;
        }
        // Brief light weaken at contraction peak.
        ambient.intensity *= 1 - 0.28 * rupturePulse;
        for (const { light } of lights) {
          light.intensity *= 1 - 0.35 * rupturePulse;
        }
      }
      for (const actor of seamActors) {
        const zoneBias = 0.28 + actor.zoneStrength * 0.72;
        const wiggle = reduced ? 0 : Math.sin(pulseTime * (2.0 + actor.zoneStrength * 1.7) + actor.phase) * 0.5 + 0.5;
        const surge = reduced ? active : active * (0.74 + wiggle * 0.26);
        const breath = rupturePulse * (0.08 + actor.zoneStrength * 0.22);
        actor.mesh.position.x = actor.baseX - actor.side * (surge * (0.03 + actor.zoneStrength * 0.11) + breath);
        actor.mesh.position.y = actor.baseY + surge * 0.01 * zoneBias;
        actor.mesh.position.z = actor.baseZ + surge * (0.07 + actor.zoneStrength * 0.30);
        actor.mesh.scale.y = actor.baseScaleY * (1 + surge * 0.05 * zoneBias + breath * 0.12);
        actor.mesh.scale.z = actor.baseScaleZ * (1 + surge * 0.025 * zoneBias);
      }
    },
    reset() {
      doorAngle=0; hinge.rotation.y=0; pulseTime=0;
      ruptureT = -1; ruptureSfxPending = false;
      nightmare.visible=true; elevator.visible=false;
      scene.fog.color.copy(coolFog);
      scene.fog.density=0.032;
      scene.background.copy(coolFog);
      ambient.intensity=0.72;
      redAccent.intensity=0;
      cigarette.visible=true;
      cigarette.userData.taken=false;
      bent.reset(new THREE.Vector3(0.05, 0, BENT_WORLD_Z));
      bent.setState(bent.BENT_STATES.hidden);
      for (const actor of seamActors) {
        actor.mesh.position.set(actor.baseX, actor.baseY, actor.baseZ);
        actor.mesh.scale.set(actor.baseScaleX, actor.baseScaleY, actor.baseScaleZ);
      }
    },
    dispose() {
      bent.dispose();
      scene.remove(ambient);
      scene.remove(world);
      disposeCigaretteProp(cigarette);
      for(const g of ownedGeometry) g.dispose();
      for(const m of ownedMaterials) m.dispose();
    },
  };
}
