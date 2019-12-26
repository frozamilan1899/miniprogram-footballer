//list.js
const app = getApp();
var util = require('../../common-js/util.js');

Page({

  data: {
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
    this.onQuery(this);
  },

  onPullDownRefresh: function() {
    console.log("list->onPullDownRefresh");
    this.onQuery(this);
  },

  onReachBottom: function() {
    console.log("list->onReachBottom");
    // util.showToast("没有更多比赛了");
  },

  onShareAppMessage: function (option) {
    console.log(option);
    var shareTitle = "在这里，你可以发布新的足球友谊赛！";
    var sharePath = "/pages/list/list";
    return {
      title: shareTitle,
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
    const db = app.globalData.db;
    const _ = db.command;
    wx.showLoading({
      title: '加载中...',
    });
    // 如果没有指定limit，则默认且最多取20条记录
    db.collection(app.globalData.dbName).where(_.or([
      {
        _openid: _this.data.openid
      },
      {
        referredOpeneIds: _this.data.openid
      }
    ])).orderBy('updateTime', 'desc').get({
      success: res => {
        console.log('[数据库] [查询记录] 成功: ', res.data);
        var matches = res.data;
        if (matches.length > 0) {
          _this.data.matches = matches;
          // 获取比赛缓存信息
          var cachedMatches = wx.getStorageSync(app.globalData.previousMatchesInfoKey);
          // 对比是否有新增数据
          if (cachedMatches && cachedMatches.length > 0) {
            for (let i = 0; i < _this.data.matches.length; i++) {
              var match = _this.data.matches[i];
              var existedInCache = false;
              for (let j = 0; j < cachedMatches.length; j++) {
                var cachedMatch = cachedMatches[j];
                if (match._id == cachedMatch._id) {
                  if (match.updateTime > cachedMatch.updateTime) {
                    _this.data.matches[i].hasNewMatchInfo = true;
                  }
                  existedInCache = true;
                  break;
                } 
              }
              if (!existedInCache) {
                _this.data.matches[i].hasNewMatchInfo = true;
              }
            }
          }
          // 重新渲染区分自己创建的和别人创建的
          for (let i = 0; i < _this.data.matches.length; i++) {
            if (_this.data.matches[i]._openid != _this.data.openid) {
              _this.data.matches[i].extClass = "mycell-other";
            } else {
              _this.data.matches[i].extClass = "mycell";
            }
          }
        } else {
          util.showToast("暂时没有历史比赛数据");
          _this.data.matches = matches;
        }
        _this.setData({
          matches: _this.data.matches
        });
        wx.hideLoading();
        wx.stopPullDownRefresh();

        // 缓存比赛信息
        wx.setStorage({
          key: app.globalData.previousMatchesInfoKey,
          data: _this.data.matches,
        });
      },
      fail: err => {
        console.error('[数据库] [查询记录] 失败：', err);
        util.showToast("获取比赛数据失败");
        wx.hideLoading();
        wx.stopPullDownRefresh();
      }
    });

    // 10秒钟后没有数据返回，关闭loading
    setTimeout(function () {
      wx.hideLoading();
      wx.stopPullDownRefresh();
    }, 10000);
  },

  deleteMatch: function (dataIndex) {
    const db = app.globalData.db;
    var matchInfo = this.data.matches[dataIndex];
    var _id = matchInfo._id;
    var _openid = matchInfo._openid;
    var that = this;
    if (_openid != that.data.openid) {
      wx.showModal({
        title: '提示',
        content: '此操作仅会删除您的报名或请假数据，不会删除原UP主的比赛，是否继续删除？',
        cancelText: '取消',
        confirmText: '删除',
        success(res) {
          if (res.cancel) {
            console.log(res);
          } else if (res.confirm) {
            wx.showLoading({
              title: '删除中...',
            });
            // 删除所有报名信息
            matchInfo.signUpList.forEach(function (item, index, arr) {
              if (item.openid === that.data.openid) {
                arr.splice(index, 1);
              }
            });
            // 删除所有请假信息
            matchInfo.askForLeaveList.forEach(function (item, index, arr) {
              if (item.openid === that.data.openid) {
                arr.splice(index, 1);
              }
            });
            // 删除关联openid
            matchInfo.referredOpeneIds.forEach(function (item, index, arr) {
              if (item === that.data.openid) {
                arr.splice(index, 1);
              }
            });

            // 调用云函数更新
            wx.cloud.callFunction({
              name: 'update',
              data: {
                id: _id,
                signUpList: matchInfo.signUpList,
                askForLeaveList: matchInfo.askForLeaveList,
                updateTime: new Date().getTime(),
                referredOpeneIds: matchInfo.referredOpeneIds
              },
              success: function (res) {
                console.log('[云函数] [update]: ', res);
                wx.hideLoading();
                that.onQuery(that);
                util.showToast("删除比赛数据成功");
              },
              fail: function (res) {
                wx.hideLoading();
                util.showToast("删除比赛数据失败");
              }
            });
          }
        }
      });
    } else {
      wx.showModal({
        title: '提示',
        content: '作为比赛的UP主，此操作会删除参与这场比赛所有人的报名或请假数据，是否继续删除？',
        cancelText: '取消',
        confirmText: '删除',
        success(res) {
          if (res.cancel) {
            console.log(res);
          } else if (res.confirm) {
            wx.showLoading({
              title: '删除中...',
            });
            db.collection(app.globalData.dbName).doc(_id).remove({
              success: res => {
                wx.hideLoading();
                that.onQuery(that);
                util.showToast("删除比赛成功");
              },
              fail: err => {
                wx.hideLoading();
                util.showToast("删除比赛失败");
              }
            });
          }
        }
      });
    }
  },

  toEditPage: function(e) {
    var page_url = '/pages/edit/edit';
    wx.navigateTo({
      url: page_url,
    })
  }
})