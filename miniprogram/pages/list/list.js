//list.js
var app = getApp()

Page({

  data: {
    avatarUrl: '../../images/user-unlogin.png',
    userInfo: {},
    openid: '',
    matches: [],
    pageLoaded: false
  },

  onLoad: function (options) {
    // 显示胶囊按键里的“转发”按钮
    wx.showShareMenu({
      withShareTicket: true
    });

    if (app.globalData.openid && app.globalData.openid != '') {
      this.data.openid = app.globalData.openid;
      this.data.pageLoaded = true;
    } else {
      var that = this;
      app.CallbackFn = data => {
        console.log('CallbackFn.data-->' + data)
        that.data.openid = data;
        that.onQuery(that);
        that.data.pageLoaded = true;
      }
    }

    this.setData({
      slideButtons: [{
        type: 'warn',
        text: '删除',
      }]
    });
  },

  slideButtonTap(e) {
    console.log('slide button tap', e.detail);
    var dataIndex = parseInt(e.target.dataset.index);
    switch (e.detail.index) {
      case 0: {
        this.deleteMatch(dataIndex);
      }
      break;
      default: {
        console.error('unknown data');
      }
    }
  },

  onShow: function() {
    console.log("list->onShow");
    if (this.data.pageLoaded) {
      this.onQuery(this);
    }
  },

  onPullDownRefresh: function() {
    console.log("list->onPullDownRefresh");
    this.onQuery(this);
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

  onQuery: function(_this) {
    const db = wx.cloud.database();
    const _ = db.command;
    wx.showLoading({
      title: '加载中...',
    });
    db.collection(app.globalData.dbName).where(_.or([
      {
        _openid: _this.data.openid
      },
      {
        referredOpeneIds: _this.data.openid
      }
    ])).get({
      success: res => {
        console.log('[数据库] [查询记录] 成功: ', res.data);
        var matches = res.data;
        _this.data.matches = matches.sort(function (a, b) {
          return b.updateTime - a.updateTime;
        });
        if (_this.data.matches.length > 0) {
          for (let i = 0; i < _this.data.matches.length; i++) {
            if (_this.data.matches[i]._openid != _this.data.openid) {
              _this.data.matches[i].batStyle = "color:red";
            }
          }
        } else {
          _this.showToast("暂时没有历史比赛数据");
        }
        _this.setData({
          matches: _this.data.matches
        });
        wx.hideLoading();
        wx.stopPullDownRefresh();
      },
      fail: err => {
        console.error('[数据库] [查询记录] 失败：', err);
        _this.showToast("获取比赛数据失败");
        wx.hideLoading();
        wx.stopPullDownRefresh();
      }
    })
  },

  deleteMatch: function (dataIndex) {
    wx.showLoading({
      title: '删除中...',
    });
    const db = wx.cloud.database();
    var matchInfo = this.data.matches[dataIndex];
    var _id = matchInfo._id;
    var _openid = matchInfo._openid;
    var that = this;
    if (_openid != that.data.openid) {

      // 删除所有报名信息
      for (let i = 0; i < matchInfo.signUpList.length; i++) {
        var signUpMap = matchInfo.signUpList[i];
        if (signUpMap.openid == that.data.openid) {
          matchInfo.signUpList.splice(i, 1);
        }
      }
      // 删除所有请假信息
      for (let i = 0; i < matchInfo.signUpList.length; i++) {
        var askForLeaveMap = matchInfo.askForLeaveList[i];
        if (askForLeaveMap.openid == that.data.openid) {
          matchInfo.askForLeaveList.splice(i, 1);
        }
      }
      // 删除关联openid
      for (let i = 0; i < matchInfo.referredOpeneIds.length; i++) {
        var tmpOpenid = matchInfo.referredOpeneIds[i];
        if (tmpOpenid == that.data.openid) {
          matchInfo.referredOpeneIds.splice(i, 1);
        }
      }
      // 调用云函数
      wx.cloud.callFunction({
        name: 'update',
        data: {
          id: _id,
          signUpList: matchInfo.signUpList,
          askForLeaveList: matchInfo.askForLeaveList,
          updateTime: new Date().getTime(),
          referredOpeneIds: matchInfo.referredOpeneIds
        },
        success: function(res) {
          console.log('[云函数] [update]: ', res);
          wx.hideLoading();
          that.onQuery(that);
          that.showToast("删除比赛成功");
        },
        fail: function(res) {
          wx.hideLoading();
          that.showToast("删除比赛失败");
        }
      });
    } else {
      db.collection(app.globalData.dbName).doc(_id).remove({
        success: res => {
          wx.hideLoading();
          that.onQuery(that);
          that.showToast("删除比赛成功");
        },
        fail: err => {
          wx.hideLoading();
          that.showToast("删除比赛失败");
        }
      });
    }
  },

  toEditPage: function(e) {
    var page_url = '/pages/edit/edit';
    // if ('index' in e.currentTarget.dataset) {
    //   var index = parseInt(e.currentTarget.dataset.index);
    //   var _id = this.data.matches[index]._id;
    //   page_url += '?id=' + _id;
    // } 
    wx.navigateTo({
      url: page_url,
    })
  },

  showToast: function (content) {
    wx.showToast({
      icon: 'none',
      title: content,
    });
  },
})