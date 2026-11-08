/**
 * 分享封装。分享不提供任何奖励，避免诱导分享。
 */
export function shareScore(score, extra = {}) {
  const title = `我在梗世界拿了 ${score} 分，你能活到第几题？`;
  try {
    if (wx.shareAppMessage) {
      wx.shareAppMessage({
        title,
        query: `from=result&score=${encodeURIComponent(String(score))}`,
        ...extra,
      });
      return true;
    }
  } catch (error) {
    // 分享失败不阻塞游戏
  }
  return false;
}

export function shareHome() {
  const title = '梗世界：接不住梗，就出局！';
  try {
    if (wx.shareAppMessage) {
      wx.shareAppMessage({ title, query: 'from=home' });
      return true;
    }
  } catch (error) {
    // ignore
  }
  return false;
}

export function showShareMenu() {
  try {
    if (wx.showShareMenu) {
      wx.showShareMenu({ withShareTicket: false, menus: ['shareAppMessage'] });
    }
    if (wx.onShareAppMessage) {
      wx.onShareAppMessage(() => ({
        title: '梗世界：接不住梗，就出局！',
        query: 'from=menu',
      }));
    }
  } catch (error) {
    // ignore
  }
}
