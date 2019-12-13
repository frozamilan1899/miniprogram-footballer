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
    // 显示胶囊按键里的“转发”按钮
    wx.showShareMenu({
      withShareTicket: true
    });

    if (app.globalData.openid && app.globalData.openid != '') {
      this.setData({
        openid: app.globalData.openid
      })
    } else {
      var that = this;
      app.CallbackFn = data => {
        console.log('CallbackFn data:' + data)
        that.data.openid = data;
      }
    }
  },

  onShow: function() {
    this.onQuery();
  },

  onPullDownRefresh: function() {
    this.onQuery();
  },

  onShareAppMessage: function (option) {
    console.log(option);
    var sharePath;
    if (option.from === 'button') {
      var index = parseInt(option.target.dataset.index);
      var _id = this.data.matches[index]._id;
      sharePath = "/pages/edit/edit?id=" + _id;
    } else {
      sharePath = "/pages/list/list";
    }
    return {
      title: "报名参加比赛啦",
      imageUrl: "../../images/playground.png",
      path: sharePath,
      success: function(res) {
        console.log(res);
      },
      fail: function(res) {
        console.log(res);
      }
    }
  },

  onQuery: function() {
    var that = this;
    const db = wx.cloud.database();
    const _ = db.command
    db.collection(app.globalData.dbName).where(_.or([
      {
        _openid: that.data.openid
      },
      {
        referredOpeneIds: that.data.openid
      }
    ])).get({
      success: res => {
        console.log('[数据库] [查询记录] 成功: ', res.data)
        var matches = res.data;
        that.data.matches = matches.sort(function (a, b) {
          return b.updateTime - a.updateTime;
        });
        if (that.data.matches.length > 0) {
          that.setData({
            matches: that.data.matches
          })
        } else {
          wx.showToast({
            icon: 'none',
            title: '暂时没有历史比赛数据'
          })
        }
      },
      fail: err => {
        wx.showToast({
          icon: 'none',
          title: '获取比赛数据失败'
        })
        console.error('[数据库] [查询记录] 失败：', err)
      }
    })
  },

  toEditPage: function(e) {

    var page_url = '';
    if ('index' in e.currentTarget.dataset) {
      var index = parseInt(e.currentTarget.dataset.index);
      var _id = this.data.matches[index]._id;
      page_url = '/pages/edit/edit?id=' + _id;
    } else {
      page_url = '/pages/edit/edit';
    }
    wx.navigateTo({
      url: page_url,
    })
  },
})