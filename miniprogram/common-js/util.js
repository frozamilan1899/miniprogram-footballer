// util.js

function showToast(content) {
  wx.showToast({
    icon: 'none',
    title: content,
  });
}


module.exports = {
  showToast: showToast
}