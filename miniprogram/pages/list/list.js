//list.js
const app = getApp();
const db = app.globalData.db;

import Notify from '../../miniprogram_npm/@vant/weapp/notify/notify';
import Dialog from '../../miniprogram_npm/@vant/weapp/dialog/dialog';

Page({

  data: {
    openid: '',
    matches: [],
    dataLoaded: false
  },

  onLoad: function (options) {
    console.log('list page onLoad');
    // 显示胶囊按键里的“转发”按钮
    wx.showShareMenu({
      withShareTicket: true
    });

    if (app.globalData.openid && app.globalData.openid != '') {
      this.data.openid = app.globalData.openid;
    } else {
      var that = this;
      app.CallbackFn = data => {
        console.log('CallbackFn.data-->' + data)
        that.data.openid = data;
        that.onQuery(that);
      }
    }
  },

  onShow: function() {
    console.log("list->onShow");
    if (!this.data.dataLoaded) {
      this.onQuery(this);
    }
  },

  onPullDownRefresh: function() {
    console.log("list->onPullDownRefresh");
    this.onQuery(this);
  },

  onReachBottom: function() {
    console.log("list->onReachBottom");
    if (this.data.matches.length > 0) {
      Notify({ type: 'success', message: '左滑可以删除比赛，进入详情可以转发比赛', duration: 3000 });
    }
  },

  onShareAppMessage: function (option) {
    console.log(option);
    var shareTitle = "足球友谊赛，等你来发布！";
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
    if (0 == _this.data.openid.length) return;
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
        _this.data.matches = matches;
        if (0 == _this.data.matches.length) {
          _this.notify('primary', '暂时没有历史比赛数据');
        } else {
          // 从缓存中获取比赛信息
          var cachedMatches = wx.getStorageSync(app.globalData.previousMatchesInfoKey);
          if (cachedMatches && cachedMatches.length > 0) {
            // 对比是否有新增数据
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
          // 检查每场比赛是否已过期
          var currentTime = new Date().getTime();
          for (let i = 0; i < _this.data.matches.length; i++) {
            if (currentTime > _this.data.matches[i].time) {
              _this.data.matches[i].expired = true;
            }
          }
        }
        _this.data.dataLoaded = true;
        _this.setData({
          matches: _this.data.matches,
          dataLoaded: _this.data.dataLoaded
        });
        // 缓存已获取到的比赛信息
        wx.setStorage({
          key: app.globalData.previousMatchesInfoKey,
          data: _this.data.matches,
        });
      },
      fail: err => {
        console.error('[数据库] [查询记录] 失败：', err);
        _this.notify('warning', '获取比赛数据失败');
      },
      complete: res => {
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

  onCellClose(e) {
    console.log('delete button tap');
    var dataIndex = parseInt(e.target.dataset.index);
    const { position, instance } = e.detail;
    switch (position) {
      case 'left':
      case 'cell':
        instance.close();
        break;
      case 'right':
        this.deleteMatch(dataIndex, instance);
        break;
    }
  },

  deleteMatch: function (dataIndex, instance) {
    var matchInfo = this.data.matches[dataIndex];
    var _id = matchInfo._id;
    var _openid = matchInfo._openid;
    var that = this;
    // 判断比赛是否为自己发布的
    if (_openid != that.data.openid) {
      Dialog.confirm({
        title: '提示',
        message: '此操作仅会删除您的报名或请假数据，不会删除原UP主的比赛，是否继续删除？',
      }).then(() => {
        // on confirm
        wx.showLoading({
          title: '删除中...',
        });
        // 删除自己的报名信息
        matchInfo.signUpList.forEach(function (item, index, arr) {
          if (item.openid === that.data.openid) {
            arr.splice(index, 1);
          }
        });
        // 删除自己的请假信息
        matchInfo.askForLeaveList.forEach(function (item, index, arr) {
          if (item.openid === that.data.openid) {
            arr.splice(index, 1);
          }
        });
        // 删除关联自己的openid
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
            that.onQuery(that);
            that.notify('success', '删除比赛数据成功');
          },
          fail: function () {
            that.notify('warning', '删除比赛数据失败');
          },
          complete: function () {
            wx.hideLoading();
            instance.close();
          }
        });
      }).catch(() => {
        // on cancel
        instance.close();
      });
    } else {
      Dialog.confirm({
        title: '提示',
        message: '作为比赛的UP主，此操作会删除参与这场比赛所有人的报名或请假数据，是否继续删除？',
      }).then(() => {
        // on confirm
        wx.showLoading({
          title: '删除中...',
        });
        db.collection(app.globalData.dbName).doc(_id).remove({
          success: function() {
            that.onQuery(that);
            that.notify('success', '删除比赛成功');
          },
          fail: function () {
            that.notify('warning', '删除比赛失败');
          },
          complete: function () {
            wx.hideLoading();
            instance.close();
          }
        });
      }).catch(() => {
        // on cancel
        instance.close();
      });
    }
  },

  toEditPage: function(e) {
    var page_url = '/pages/edit/edit';
    wx.navigateTo({
      url: page_url,
    })
  },

  notify: function (tp, msg) {
    Notify({
      type: tp,
      message: msg,
      duration: 2000
    });
  },
})