/**
 * Canvas 初始化与逻辑坐标系统。
 * 所有页面都使用逻辑像素绘制；物理像素通过 DPR 缩放，避免高分屏文字模糊。
 */
export const canvas = wx.createCanvas();
GameGlobal.canvas = canvas;

const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();

export const SCREEN_WIDTH = info.screenWidth || info.windowWidth || 375;
export const SCREEN_HEIGHT = info.screenHeight || info.windowHeight || 667;
export const DPR = Math.min(info.pixelRatio || 1, 2);

canvas.width = Math.floor(SCREEN_WIDTH * DPR);
canvas.height = Math.floor(SCREEN_HEIGHT * DPR);

export const SAFE_AREA = info.safeArea || {
  top: 0,
  bottom: SCREEN_HEIGHT,
  left: 0,
  right: SCREEN_WIDTH,
};
export const SAFE_TOP = Math.max(0, SAFE_AREA.top || 0);
const safeAreaBottom =
  typeof SAFE_AREA.bottom === 'number' ? SAFE_AREA.bottom : SCREEN_HEIGHT;
export const SAFE_BOTTOM = Math.max(0, SCREEN_HEIGHT - safeAreaBottom);

/** 内容区最大宽度，避免平板横向拉伸过度 */
export const CONTENT_WIDTH = Math.min(SCREEN_WIDTH, 480);
export const CONTENT_X = (SCREEN_WIDTH - CONTENT_WIDTH) / 2;
export const U = CONTENT_WIDTH / 375;

/**
 * 小游戏右上角微信菜单胶囊位置。
 * 顶部右侧的梗币、倒计时环等 UI 放在胶囊左侧，避免被菜单遮挡。
 */
let menuButton = null;
try {
  if (wx.getMenuButtonBoundingClientRect) {
    menuButton = wx.getMenuButtonBoundingClientRect();
  }
} catch (error) {
  menuButton = null;
}
const validMenuButton =
  menuButton &&
  typeof menuButton.left === 'number' &&
  menuButton.left > 0 &&
  menuButton.left < SCREEN_WIDTH;
export const MENU_BUTTON = validMenuButton ? menuButton : null;
export const RIGHT_SAFE_X = validMenuButton
  ? Math.min(menuButton.left - 10, CONTENT_X + CONTENT_WIDTH - 10)
  : CONTENT_X + CONTENT_WIDTH - 10;

export const ctx = canvas.getContext('2d');
ctx.scale(DPR, DPR);

/** 快捷缩放：基于 375 设计稿 */
export function sz(value) {
  return Math.round(value * U);
}

/** 内容区内的 x 坐标 */
export function cx(value) {
  return CONTENT_X + value * U;
}
