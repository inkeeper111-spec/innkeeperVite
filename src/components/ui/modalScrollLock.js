let openModalCount = 0;
let originalStyles;
let lockedScrollY = 0;

export const acquireModalScrollLock = () => {
  if (openModalCount === 0) {
    lockedScrollY = window.scrollY;
    originalStyles = {
      htmlOverflow: document.documentElement.style.overflow,
      htmlOverscrollBehavior: document.documentElement.style.overscrollBehavior,
      bodyOverflow: document.body.style.overflow,
      bodyPosition: document.body.style.position,
      bodyTop: document.body.style.top,
      bodyLeft: document.body.style.left,
      bodyRight: document.body.style.right,
      bodyWidth: document.body.style.width,
      bodyOverscrollBehavior: document.body.style.overscrollBehavior
    };

    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }
  openModalCount += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    openModalCount = Math.max(0, openModalCount - 1);
    if (openModalCount !== 0 || !originalStyles) return;

    document.documentElement.style.overflow = originalStyles.htmlOverflow;
    document.documentElement.style.overscrollBehavior = originalStyles.htmlOverscrollBehavior;
    document.body.style.overflow = originalStyles.bodyOverflow;
    document.body.style.position = originalStyles.bodyPosition;
    document.body.style.top = originalStyles.bodyTop;
    document.body.style.left = originalStyles.bodyLeft;
    document.body.style.right = originalStyles.bodyRight;
    document.body.style.width = originalStyles.bodyWidth;
    document.body.style.overscrollBehavior = originalStyles.bodyOverscrollBehavior;
    if (lockedScrollY !== 0) window.scrollTo(0, lockedScrollY);
    originalStyles = undefined;
  };
};
