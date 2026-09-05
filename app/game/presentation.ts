/** Called inside the launch click: pointer lock must precede fullscreen, which
 * consumes transient user activation. Raw-input failure gets a regular retry. */
export function enterCombatView(
  canvas: HTMLElement,
  root: HTMLElement,
  onPointerError: (message: string) => void,
) {
  let request: Promise<void> | void;
  const fail = () => onPointerError('未能锁定鼠标，请再次点击继续战斗。');
  try {
    request = canvas.requestPointerLock({ unadjustedMovement: true });
  } catch {
    try {
      request = canvas.requestPointerLock();
    } catch {
      fail();
      return;
    }
  }
  if (request)
    void request.catch((error: Error) => {
      if (error.name === 'NotSupportedError') {
        try {
          return Promise.resolve(canvas.requestPointerLock()).catch(fail);
        } catch {
          fail();
        }
      } else fail();
    });
  if (!document.fullscreenElement && document.fullscreenEnabled) {
    try {
      void root.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    } catch {
      /* The viewport-sized layout remains available. */
    }
  }
}
