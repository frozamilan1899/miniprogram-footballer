// mine.js
Page({

  data: {

  },

  onLoad: function (options) {

  },

  onUnload: function () {

  },

  openSettingPage: function() {
    wx.openSetting({
      success(res) {
        console.log(res.authSetting)
      }
    });
  },
})