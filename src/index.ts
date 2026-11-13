import * as xb from 'xrblocks';
import {ChatOverlay} from './ui/ChatOverlay.ts';
import {CafeCounterScene} from './xr/CafeCounterScene.ts';

let chatOverlay: ChatOverlay | undefined;

document.addEventListener('DOMContentLoaded', async () => {
  const options = new xb.Options();
  options.setAppTitle('CafeBot — Roast & Ember');
  options.setAppDescription(
    'Interactive 3D cafe counter and CafeBot ordering assistant.'
  );

  const cafeScene = new CafeCounterScene();
  xb.add(cafeScene);

  const rootEl = document.getElementById('root');
  if (rootEl) {
    chatOverlay = new ChatOverlay(rootEl);
  }

  await xb.init(options);

  window.addEventListener('beforeunload', () => {
    chatOverlay?.dispose();
  });
});
