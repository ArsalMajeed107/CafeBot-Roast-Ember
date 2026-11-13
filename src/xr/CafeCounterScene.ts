import * as THREE from 'three';
import * as xb from 'xrblocks';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {cafeBotService} from '../services/mockCafeBot.ts';
import type {OrderState} from '../types.ts';
import {buildCafeCounterModels, type CafeSceneAssets} from './CafeModels.ts';

// Pre-allocated scratch vectors for zero-GC animation updates
const _targetScale = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class CafeCounterScene extends xb.Script {
  private assets?: CafeSceneAssets;
  private envRenderTarget?: THREE.WebGLRenderTarget;
  private unsubscribeOrder?: () => void;

  // Spatial UI Kiosk elements (XR Blocks built-in UI)
  private kioskCard?: xb.UICard;
  private orderStatusText?: xb.UIText;
  private orderDetailText?: xb.UIText;
  private confirmSpatialBtn?: xb.UIButton;
  private clearSpatialBtn?: xb.UIButton;

  private cupPulse = 0;
  private elapsed = 0;

  init() {
    const isSoftwareGl = detectSoftwareWebGL();
    const renderer = xb.core.renderer;

    let maxAnisotropy = 4;
    if (renderer instanceof THREE.WebGLRenderer) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      renderer.setPixelRatio(
        isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
      );
      renderer.shadowMap.enabled = !isSoftwareGl;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

      // Studio PBR reflections via RoomEnvironment
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      this.envRenderTarget = pmremGenerator.fromScene(roomEnv, 0.04);
      xb.core.scene.environment = this.envRenderTarget.texture;
      roomEnv.dispose();
      pmremGenerator.dispose();
    }

    // Horizon-matched atmospheric backdrop
    const bgHex = 0x16110d;
    xb.core.scene.background = new THREE.Color(bgHex);
    xb.core.scene.fog = new THREE.FogExp2(bgHex, 0.07);

    this.setupLighting(isSoftwareGl);

    // Build composite 3D cafe counter station positioned slightly right on desktop
    this.assets = buildCafeCounterModels(isSoftwareGl, maxAnisotropy);
    this.assets.root.position.set(0.18, 0, -1.48);
    this.add(this.assets.root);

    // Add world-space Spatial UI Kiosk card next to the counter
    this.buildSpatialOrderCard();

    // Sync spatial UI + subtle cup reaction with MockCafeBotService
    this.unsubscribeOrder = cafeBotService.subscribe((state) => {
      this.syncWithOrderState(state);
    });
  }

  private setupLighting(isSoftwareGl: boolean) {
    // Cool sky / warm espresso ground fill
    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x2b1d14, 1.35);
    this.add(hemi);

    // Warm directional key light with tight shadow frustum
    const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.4);
    keyLight.position.set(1.8, 3.2, 1.6);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 8;
    keyLight.shadow.camera.left = -1.8;
    keyLight.shadow.camera.right = 1.8;
    keyLight.shadow.camera.top = 1.8;
    keyLight.shadow.camera.bottom = -1.8;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.add(keyLight);

    // Warm pendant rim accent over the espresso bar
    const pendantLight = new THREE.PointLight(0xffb86c, 1.8, 4.5, 2);
    pendantLight.position.set(0.2, 2.05, -1.35);
    this.add(pendantLight);
  }

  private buildSpatialOrderCard() {
    this.orderStatusText = new xb.UIText({
      text: 'Order: 0 items · $0.00',
      style: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fef3c7',
      },
    });

    this.orderDetailText = new xb.UIText({
      text: 'Use the chat panel or tap a quick drink below to preview an order.',
      style: {
        fontSize: 15,
        lineHeight: 1.35,
        opacity: 0.85,
        whiteSpace: 'pre-line',
      },
    });

    const menuItems = cafeBotService.getMenuData().items;
    const flatWhite = menuItems.find((m) => m.id === 'cof-01')!;
    const cheesecake = menuItems.find((m) => m.id === 'des-01')!;

    this.confirmSpatialBtn = new xb.UIButton({
      label: 'Confirm',
      icon: 'check',
      disabled: true,
      style: {flexGrow: 1},
      onClick: () => {
        const res = cafeBotService.confirmOrder();
        if (res.confirmed && this.orderDetailText) {
          this.orderDetailText.text = `Confirmed ${res.orderId} ($${res.total.toFixed(2)})`;
        }
      },
    });

    this.clearSpatialBtn = new xb.UIButton({
      label: 'Clear',
      icon: 'restart_alt',
      disabled: true,
      style: {flexGrow: 1},
      onClick: () => cafeBotService.clearOrder(),
    });

    this.kioskCard = new xb.UICard({
      size: {width: 0.48, height: 'auto'},
      manipulation: true,
      edge: true,
      style: {
        flexDirection: 'column',
        gap: 12,
        padding: 18,
        backgroundColor: 'rgba(28, 21, 16, 0.9)',
        borderRadius: 20,
      },
      children: [
        new xb.UIPanel({
          style: {
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          },
          children: [
            new xb.UIIcon({
              icon: 'local_cafe',
              style: {width: 28, height: 28, color: '#f59e0b'},
            }),
            new xb.UIText({
              text: 'Roast & Ember · Kiosk',
              style: {fontSize: 22, fontWeight: 'bold'},
            }),
          ],
        }),
        this.orderStatusText,
        this.orderDetailText,
        new xb.UIPanel({
          style: {width: '100%', flexDirection: 'row', gap: 10},
          children: [
            new xb.UIButton({
              label: '+ Flat White',
              style: {flexGrow: 1},
              onClick: () => cafeBotService.addItem(flatWhite, 1),
            }),
            new xb.UIButton({
              label: '+ Cheesecake',
              style: {flexGrow: 1},
              onClick: () => cafeBotService.addItem(cheesecake, 1),
            }),
          ],
        }),
        new xb.UIPanel({
          style: {width: '100%', flexDirection: 'row', gap: 10},
          children: [this.confirmSpatialBtn, this.clearSpatialBtn],
        }),
      ],
    });

    this.kioskCard.name = 'CafeBot Spatial Order Kiosk';
    this.kioskCard.position.set(0.88, 1.38, -1.25);
    this.kioskCard.rotation.y = -0.32;
    this.add(this.kioskCard);
  }

  private syncWithOrderState(state: OrderState) {
    if (this.orderStatusText) {
      this.orderStatusText.text = `Order: ${state.totalCount} item${state.totalCount === 1 ? '' : 's'} · $${state.subtotal.toFixed(2)}`;
    }
    if (this.orderDetailText) {
      if (state.items.length > 0) {
        this.orderDetailText.text = state.items
          .map(
            (line) =>
              `• ${line.qty}x ${line.item.name} ($${(line.item.price * line.qty).toFixed(2)})`
          )
          .join('\n');
      } else if (state.lastConfirmedOrderId) {
        this.orderDetailText.text = `Last confirmed: ${state.lastConfirmedOrderId}. Ready for your next order.`;
      } else {
        this.orderDetailText.text =
          'Use the chat panel or tap a quick drink below to preview an order.';
      }
    }

    const hasItems = state.items.length > 0;
    if (this.confirmSpatialBtn) this.confirmSpatialBtn.disabled = !hasItems;
    if (this.clearSpatialBtn) this.clearSpatialBtn.disabled = !hasItems;

    if (hasItems) {
      this.cupPulse = 1;
    }
  }

  update() {
    const dt = Math.min(xb.getDeltaTime() || 0.016, 0.05);
    this.elapsed += dt;

    if (!this.assets) return;

    // Animate rising espresso steam wisps
    for (const particle of this.assets.steamParticles) {
      const cycle = ((this.elapsed * particle.speed + particle.phase) % 1 + 1) % 1;
      const y = 0.078 + cycle * 0.16;
      const swayX = Math.sin(this.elapsed * 1.8 + particle.phase) * particle.radius;
      const swayZ = Math.cos(this.elapsed * 1.4 + particle.phase) * particle.radius;
      particle.mesh.position.set(swayX, y, swayZ);
      const scale = 0.65 + cycle * 1.25;
      particle.mesh.scale.setScalar(scale);
      const mat = particle.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.sin(cycle * Math.PI) * 0.18;
    }

    // Smooth damped cup highlight pulse when items are added
    this.cupPulse = THREE.MathUtils.damp(this.cupPulse, 0, 4.5, dt);
    const scaleFactor = 1 + this.cupPulse * 0.08;
    _targetScale.setScalar(scaleFactor);
    this.assets.cupGroup.scale.lerp(_targetScale, 1 - Math.exp(-10 * dt));

    // Gentle espresso brew indicator glow
    this.assets.brewIndicatorMat.emissiveIntensity =
      1.25 + Math.sin(this.elapsed * 2.2) * 0.25;
  }

  dispose() {
    this.unsubscribeOrder?.();
    this.assets?.dispose();
    this.envRenderTarget?.dispose();
  }
}
