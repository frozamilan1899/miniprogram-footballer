//list.js
var app = getApp()

Page({

  data: {
    avatarUrl: '../../images/user-unlogin.png',
    userInfo: {},
    openid: '',
    matches: []
  },

  onLoad: function (options) {

    if (app.globalData.openid && app.globalData.openid != '') {
      this.setData({
        openid: app.globalData.openid
      })
    } else {
      var that = this;
      app.CallbackFn = data => {
        console.log('CallbackFn data:' + data)
        if (data != '') {
          that.data.openid = data;
        }
      }
    }
  },

  onShow: function() {
    this.onQuery();
  },

  onPullDownRefresh: function () {
    this.onQuery();
  },

  onQuery: function() {
    var that = this;
    const db = wx.cloud.database();
    db.collection(app.globalData.dbName).where({
      _openid: that.data.openid
    }).get({
      success: res => {
        console.log('[数据库] [查询记录] 成功: ', res.data)
        that.data.matches = res.data.reverse();
        that.setData({
          matches: that.data.matches
        })
      },
      fail: err => {
        wx.showToast({
          icon: 'none',
          title: '查询记录失败'
        })
        console.error('[数据库] [查询记录] 失败：', err)
      }
    })
  },

  toEditPage: function(e) {

    var page_url = '';
    console.log(e);
    if ('index' in e.currentTarget.dataset) {
      console.log("test index");
      var index = parseInt(e.currentTarget.dataset.index);
      console.log(index);
      var _id = this.data.matches[index]._id;
      console.log(_id);
      page_url = '/pages/edit/edit?id=' + _id;
    } else {
      page_url = '/pages/edit/edit';
    }
    wx.navigateTo({
      url: page_url,
    })
  },
})