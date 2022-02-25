const app = getApp();
const db = app.globalData.db;
const _ = db.command;

import Notify from '../../miniprogram_npm/@vant/weapp/notify/notify';
import Dialog from '../../miniprogram_npm/@vant/weapp/dialog/dialog';

Page({

  data: {
    dbName: "activities",
    avatarDbName: "avatars",
    openid: '',
    activities: [],
    dataLoaded: false,
    avatarUrl: ''
  },

  onLoad: function (options) {
    console.log('activity page onLoad');
    // 显示胶囊按键里的“转发”按钮
    wx.showShareMenu({
      withShareTicket: true
    });

    if (app.globalData.openid != null && app.globalData.openid != '') {
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
    console.log("activity->onShow");
    if (!this.data.dataLoaded) {
      this.onQuery(this);
    }
  },

  onPullDownRefresh: function() {
    console.log("activity->onPullDownRefresh");
    this.onQuery(this);
  },

  onReachBottom: function() {
    console.log("activity->onReachBottom");
    if (this.data.activities.length > 0) {
      Notify({ type: 'success', message: '左滑可以删除活动，进入详情可以转发活动', duration: 3000 });
    }
  },

  onShareAppMessage: function (option) {
    console.log(option);
    var shareTitle = "发布足球活动和比赛，精彩\"有\"你！";
    var sharePath = "/pages/activity/activity";
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
    // 加载头像
    _this.queryAvatarUrl(_this);
    // 加载活动
    wx.showLoading({
      title: '加载中...',
    });
    // 如果没有指定limit，则默认且最多取20条记录，在此规则下用户默认拿到最新的20条数据
    db.collection(_this.data.dbName).where(_.or([
      {
        _openid: _this.data.openid
      },
      {
        referredOpenIds: _this.data.openid
      }
    ])).orderBy('updateTime', 'desc').get({
      success: res => {
        console.log('[数据库] [查询记录] 成功: ', res.data);
        _this.data.activities = res.data;
        if (0 == _this.data.activities.length) {
          _this.notify('primary', '暂时没有历史活动数据');
        } else {
          // 从缓存中获取活动信息
          var cachedActivities = wx.getStorageSync(app.globalData.previousActivitiesInfoKey);
          if (cachedActivities && cachedActivities.length > 0) {
            // 对比是否有新增数据
            for (let i = 0; i < _this.data.activities.length; i++) {
              var activity = _this.data.activities[i];
              var existedInCache = false;
              for (let j = 0; j < cachedActivities.length; j++) {
                var cachedActivity = cachedActivities[j];
                if (activity._id == cachedActivity._id) {
                  if (activity.updateTime > cachedActivity.updateTime) {
                    _this.data.activities[i].hasNewActivityInfo = true;
                  }
                  existedInCache = true;
                  break;
                }
              }
              if (!existedInCache) {
                _this.data.activities[i].hasNewActivityInfo = true;
              }
            }
          }
          // 检查各活动是否已过期
          var currentTime = new Date().getTime();
          for (let i = 0; i < _this.data.activities.length; i++) {
            if (currentTime > _this.data.activities[i].time) {
              _this.data.activities[i].expired = true;
            }
          }
        }
        _this.data.dataLoaded = true;
        // 兼容代码，去除activities中的null元素
        _this.deleteNoneElementsInArray(_this);
        _this.setData({
          activities: _this.data.activities,
          dataLoaded: _this.data.dataLoaded
        });
        // 缓存已获取到的比赛信息
        wx.setStorage({
          key: app.globalData.previousActivitiesInfoKey,
          data: _this.data.activities,
        });
      },
      fail: err => {
        console.error('[数据库] [查询记录] 失败：', err);
        _this.notify('warning', '获取活动数据失败');
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
        this.deleteActivity(dataIndex, instance);
        break;
    }
  },

  onChooseAvatar: function (e) {
    console.log(e.detail.avatarUrl)
    this.data.avatarUrl = e.detail.avatarUrl;
    this.setData({
      avatarUrl: this.data.avatarUrl
    });
    this.saveAvatarUrl(this)
  },

  queryAvatarUrl: function(_this) {
    if (0 == _this.data.openid.length) return;
    _this.data.avatarUrl = app.globalData.avatarUrl;
    db.collection(_this.data.avatarDbName).where({
      _openid: _this.data.openid
    }).get({
      success: function (res) {
        console.log(res);
        if (res.data.length > 0) {
          _this.data.avatarUrl = res.data[0].avatarUrl;
          _this.setData({
            avatarUrl: _this.data.avatarUrl
          });
          app.globalData.avatarUrl = _this.data.avatarUrl;
        }
      }
    });
  },

  saveAvatarUrl: function(_this) {
    db.collection(_this.data.avatarDbName).where({
      _openid: _this.data.openid
    }).get({
      success: function (res) {
        console.log(res);
        // 存在就更新avatar url
        if (res.data.length > 0) {
          db.collection(_this.data.avatarDbName).where({
            _openid: _this.data.openid
          }).update({
            data: {
              avatarUrl: _this.data.avatarUrl
            },
            success: function (res) {
              console.log(res);
            }
          });
        }
        // 不存在就添加avatar url
        else {
          db.collection(_this.data.avatarDbName).add({
            data: {
              avatarUrl: _this.data.avatarUrl
            },
            success: function (res) {
              console.log(res); 
            }
          });
        }
        app.globalData.avatarUrl = _this.data.avatarUrl;
      }
    });
  },

  deleteActivity: function (dataIndex, instance) {
    var activityInfo = this.data.activities[dataIndex];
    var _id = activityInfo._id;
    var _openid = activityInfo._openid;
    var that = this;
    // 判断活动是否为自己发布的
    if (_openid != that.data.openid) {
      Dialog.confirm({
        title: '提示',
        message: '此操作仅会删除您的报名或请假数据，不会删除原活动数据，是否继续删除？',
        zIndex: 999
      }).then(() => {
        // on confirm
        wx.showLoading({
          title: '删除中...',
        });
        // 删除自己的报名信息
        activityInfo.signUpList.forEach(function (item, index, arr) {
          if (item.openid === that.data.openid) {
            arr.splice(index, 1);
          }
        });
        // 删除自己的请假信息
        activityInfo.askForLeaveList.forEach(function (item, index, arr) {
          if (item.openid === that.data.openid) {
            arr.splice(index, 1);
          }
        });
        // 删除关联自己的openid
        activityInfo.referredOpenIds.forEach(function (item, index, arr) {
          if (item === that.data.openid) {
            arr.splice(index, 1);
          }
        });

        // 调用云函数更新
        wx.cloud.callFunction({
          name: 'update_activity',
          data: {
            id: _id,
            signUpList: activityInfo.signUpList,
            askForLeaveList: activityInfo.askForLeaveList,
            updateTime: new Date().getTime(),
            referredOpenIds: activityInfo.referredOpenIds
          },
          success: function (res) {
            console.log('[云函数] [update]: ', res);
            that.onQuery(that);
            that.notify('success', '删除成功');
          },
          fail: function () {
            that.notify('warning', '删除失败');
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
        message: '此操作会删除参与这场活动的所有数据，包括所有人的报名或请假数据，是否继续删除？',
        zIndex: 999
      }).then(() => {
        // on confirm
        wx.showLoading({
          title: '删除中...',
        });
        db.collection(that.data.dbName).doc(_id).remove({
          success: function() {
            that.onQuery(that);
            that.notify('success', '删除活动成功');
          },
          fail: function () {
            that.notify('warning', '删除活动失败');
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
    var page_url = '/pages/editActivity/editActivity';
    wx.navigateTo({
      url: page_url,
    });
  },

  notify: function (tp, msg) {
    Notify({
      type: tp,
      message: msg,
      duration: 2000
    });
  },

  deleteNoneElementsInArray: function(_this) {
    for (let i = 0; i < _this.data.activities.length; i++) {
      var activity = _this.data.activities[i];
      _this.removeNoneElements(activity.signUpList);
      _this.removeNoneElements(activity.askForLeaveList);
      _this.removeNoneElements(activity.referredOpenIds);
      _this.data.activities[i] = activity;
    }
  }, 

  removeNoneElements: function(array) {
    array.forEach(function (item, index, arr) {
      if (item == null) {
        arr.splice(index, 1);
      }
    });
  }
})