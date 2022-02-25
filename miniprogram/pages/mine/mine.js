const app = getApp();
const db = app.globalData.db;

Page({

  data: {
    avatarUrl: '',
    nameNote: ''
  },

  onLoad: function (options) {
    this.queryNoteRecord(this);
  },

  onShow: function () {
    this.setData({
      nameNote: this.data.nameNote
    });
  },

  onPullDownRefresh: function() {
    this.queryNoteRecord(this);
  },

  queryNoteRecord: function (_this) {
    _this.data.avatarUrl = app.globalData.avatarUrl;
    _this.setData({
      avatarUrl: _this.data.avatarUrl
    });
    db.collection("notes").where({
      _openid: app.globalData.openid
    }).get({
      success: function (res) {
        console.log(res);
        if (res.data.length > 0) {
          _this.data.nameNote = res.data[0].nameNote;
        } else {
          _this.data.nameNote = '我的备注';
        }
        _this.setData({
          nameNote: _this.data.nameNote
        });
      },
      complete: res => {
        wx.stopPullDownRefresh();
      }
    });

    // 10秒钟后没有数据返回，关闭loading
    setTimeout(function () {
      wx.stopPullDownRefresh();
    }, 10000);
  },

  openSettingPage: function() {
    wx.openSetting({
      success(res) {
        console.log(res.authSetting)
      }
    });
  },
})