const app = getApp();
var util = require('../../common-js/util.js');
const db = app.globalData.db;

import Notify from '../../miniprogram_npm/@vant/weapp/notify/notify';
import Dialog from '../../miniprogram_npm/@vant/weapp/dialog/dialog';

Page({
  data: {
    dbName: "activities",
    activityId: "",
    activityInfo: {
      subject: "",
      time: "",
      showTime: "",
      duration: "90",
      signUpList: [],
      askForLeaveList: [],
      location: {
        longitude: 0.0,
        latitude: 0.0,
        name: '',
        address: ''
      },
      updateTime: 0,
      referredOpeneIds: []
    },
    signUpMap: {
      openid: "",
      content: ""
    },
    askForLeaveMap: {
      openid: "",
      content: ""
    },
    publishNewActivity: true,
    publisher: true,
    subjectDisabled: false,
    timeDisabled: false,
    locationDisabled: false,
    expired: false,
    // ------------------------------
    markers: [],
    currentLocation: {
      longitude: 108.95000,
      latitude: 34.26667,
      name: '',
      address: ''
    },
    // ------------------------------
    showTimePickerFlag: false,
    formatter(type, value) {
      if (type === 'year') {
        return `${value}年`;
      }
      if (type === 'month') {
        return `${value}月`;
      }
      if (type === 'day') {
        return `${value}日`;
      }
      return value;
    },
    filter(type, options) {
      if (type === 'minute') {
        let filteredOptions = options.filter((option) => option % 30 === 0);
        if (0 == filteredOptions.length) filteredOptions.push(options[0]);
        return filteredOptions;
      }
      return options;
    },
    // ------------------------------
    sharePicUrl: "",
    // ------------------------------
    hideAuthMsgBtnFlag: true,
    // ------------------------------
    nameNote: '',
    // ------------------------------
    showDurationPickerFlag: false,
    durationColumns: ['30', '60', '90', '120', '150', '180']
  },

  onLoad: function(options) {
    console.log(options);
    if ('id' in options) {
      // 打开已有数据的活动，因为有id
      this.data.publishNewActivity = false;
      this.data.activityId = options.id;
      if (app.globalData.shared) {
        this.queryDataFromCloud();
      } else {
        this.queryDataFromCache();
      }
    } else {
      this.data.publishNewActivity = true;
      //获取当前位置
      this.getCurrentLocation();
    }

    // 设置转发活动按钮是否可以操作
    this.setData({
      publishNewActivity: this.data.publishNewActivity
    });

    // 这是胶囊按键里的“转发”按钮是否可以显示
    if (this.data.publishNewActivity) {
      wx.hideShareMenu({});
    } else {
      wx.showShareMenu({
        withShareTicket: true
      });
    }

    // 是否从通知服务中的小程序模板启动
    if (app.globalData.needAuthMsg) {
      // 如果是，表明已经接收到一次订阅消息，更改自己的订阅消息状态
      // 其实如果接收到，别人已经更改过一次，这里属于二次验证
      this.data.hideAuthMsgBtnFlag = false;
      this.updateAuthRecord(this, false, true);
    } else {
      // 如果不是，获取订阅消息的授权状态并按需显示授权按钮
      this.queryAuthRecord(this);
    } 

    // 获取名称备注
    this.queryNoteRecord(this);
  },

  onShow: function(options) {
    console.log(options);
    var pages = getCurrentPages();
    var currPage = pages[pages.length - 1];
    var location = currPage.data.location;
    if (location) {
      this.setLocation(this, location);
    }
  },

  onUnload: function() {
    this.renderPage(this, false);
    this.data.publishNewActivity = true;
    this.data.publisher = true;
    this.data.expired = false;
    this.data.showTimePickerFlag = false;
    this.data.showDurationPickerFlag = false;
    this.data.hideAuthMsgBtnFlag = true;
  },

  onShareAppMessage: function(option) {
    console.log(option);
    this.drawShareImage();
    var shareTitle = "「咱们球场见」踢球啦！";
    var sharePath = "/pages/editActivity/editActivity?id=" + this.data.activityId;
    return {
      title: shareTitle,
      imageUrl: this.data.sharePicUrl,
      path: sharePath,
      success: function(res) {
        console.log(res);
      },
      fail: function(res) {
        console.log(res);
      }
    }
  },

  queryDataFromCloud: function() {
    // 来自分享卡片，从云数据中获取指定id的活动信息
    wx.showLoading({
      title: '加载中',
    });
    var that = this;
    db.collection(that.data.dbName).where({
      _id: that.data.activityId
    }).get({
      success: res => {
        if (res.data.length > 0) {
          that.data.activityInfo = res.data[0];
          that.checkActivityExpired(that);
          that.adjustUIItems(that);
        }
      },
      fail: res => {
        console.log(res);
        that.notify('warning', '当前活动已被发布者删除');
      },
      complete: res => {
        that.queryAndSetLoacation(that);
        wx.hideLoading();
      }
    });

    // 10秒钟后没有数据返回，关闭loading
    setTimeout(function() {
      wx.hideLoading();
      wx.stopPullDownRefresh();
    }, 10000);
  },

  queryDataFromCache: function() {
    // 从缓存中获取指定id的活动信息
    var cachedActivities = wx.getStorageSync(app.globalData.previousActivitiesInfoKey);
    for (let i = 0; i < cachedActivities.length; i++) {
      let cachedActivity = cachedActivities[i];
      if (this.data.activityId == cachedActivity._id) {
        this.data.activityInfo = cachedActivity;
        break;
      }
    }
    this.checkActivityExpired(this);
    this.adjustUIItems(this);
    this.queryAndSetLoacation(this);
  },

  checkActivityExpired: function(_this) {
    // 检查本场活动是否已过期
    var currentTime = new Date().getTime();
    if (currentTime > _this.data.activityInfo.time) {
      _this.data.expired = true;
    } else {
      _this.data.expired = false;
    }
  },

  adjustUIItems: function(_this) {
    // 检查本场活动是否为自己发布的活动
    if (_this.data.activityInfo._openid != app.globalData.openid) {
      _this.data.publisher = false;
      _this.renderPage(_this, true);
    }
    // 若本场活动已过期将部分控件设置为不可用
    if (_this.data.expired) {
      _this.renderPage(_this, true);
      _this.notify('warning', '活动已过期');
    } else {
      _this.checkTagListForClose(_this);
    }
  },

  checkTagListForClose: function(_this) {
    // 检查报名列表的身份，将close重新设置
    for (let i = 0; i < _this.data.activityInfo.signUpList.length; i++) {
      let signUpMap = _this.data.activityInfo.signUpList[i];
      _this.data.activityInfo.signUpList[i].close = (signUpMap.openid == app.globalData.openid);
    }
    // 检查请假列表的身份，将close重新设置
    for (let i = 0; i < _this.data.activityInfo.askForLeaveList.length; i++) {
      let askForLeaveMap = _this.data.activityInfo.askForLeaveList[i];
      _this.data.activityInfo.askForLeaveList[i].close = (askForLeaveMap.openid == app.globalData.openid);
    }
  },

  queryAndSetLoacation: function(_this) {
    // 获取并设置活动位置信息
    _this.data.currentLocation = _this.data.activityInfo.location;
    var markers = _this.createMarkers(_this.data.activityInfo.location);
    _this.data.markers = markers;
    console.log(_this.data.activityInfo);
    _this.setData({
      activityInfo: _this.data.activityInfo,
      markers: _this.data.markers
    });
  },

  renderPage: function(_this, disabled) {
    // 渲染页面
    if (!_this.data.publisher || _this.data.expired) {
      _this.data.subjectDisabled = disabled;
      _this.data.timeDisabled = disabled;
      _this.data.locationDisabled = disabled;
      _this.setData({
        publisher: _this.data.publisher,
        subjectDisabled: _this.data.subjectDisabled,
        timeDisabled: _this.data.timeDisabled,
        locationDisabled: _this.data.locationDisabled,
        expired: _this.data.expired
      });
    }
  },

  setSubjectInput: function(event) {
    var inputStr = event.detail;
    if (inputStr && inputStr.length > 0) {
      this.data.activityInfo.subject = util.trim(inputStr);
    } else {
      this.data.activityInfo.subject = '';
    }
  },

  setSUInput: function(event) {
    var inputStr = event.detail;
    if (inputStr && inputStr.length > 0) {
      this.data.signUpMap = {
        openid: app.globalData.openid,
        content: util.trim(inputStr),
        close: true
      };
    } else {
      this.data.signUpMap = {
        openid: app.globalData.openid,
        content: '',
        close: true
      };
    }
  },

  setAFLInput: function(event) {
    var inputStr = event.detail;
    if (inputStr && inputStr.length > 0) {
      this.data.askForLeaveMap = {
        openid: app.globalData.openid,
        content: util.trim(inputStr),
        close: true
      };
    } else {
      this.data.askForLeaveMap = {
        openid: app.globalData.openid,
        content: '',
        close: true
      };
    }
  },

  resetSUMap: function (_this) {
    _this.data.signUpMap = {
      openid: '',
      content: ''
    };
    _this.setData({
      fieldSUValue: '',
    });
  },

  resetAFLMap: function (_this) {
    _this.data.askForLeaveMap = {
      openid: '',
      content: ''
    };
    _this.setData({
      fieldAFLValue: '',
    });
  },

  notify: function(tp, msg) {
    Notify({
      type: tp,
      message: msg,
      duration: 2000
    });
  },

  checkRequiredItem: function() {
    // 必须项判空操作
    if ('' === this.data.activityInfo.subject) {
      this.notify('danger', '请填写活动主题');
      return true;
    }
    if ('' === this.data.activityInfo.showTime) {
      this.notify('danger', '请选择日期和时间');
      return true;
    }
    if ('' === this.data.activityInfo.location.name &&
      '' === this.data.activityInfo.location.address) {
      this.notify('danger', '请选取活动位置');
      return true;
    }
    return false;
  },

  submitActivityInfo: function() {
    // 活动信息发布或者追加
    if (this.checkRequiredItem()) {
      return;
    }
    // 分场景：1）发布新活动；2）更新活动
    if (this.data.publishNewActivity) {
      this.addNewActivity();
    } else {
      this.updateActivityInfo();
    }
  },

  addNewActivity: function() {
    // 发布新的活动
    console.log("add activity info");
    // 添加这场活动关联的openid
    if (-1 == this.data.activityInfo.referredOpeneIds.indexOf(app.globalData.openid)) {
      this.data.activityInfo.referredOpeneIds.push(app.globalData.openid);
    }
    // 如果有报名信息添加
    if (this.data.signUpMap.content != '') {
      this.data.activityInfo.signUpList.push(this.data.signUpMap);
    }
    // 如果有请假信息添加
    if (this.data.askForLeaveMap.content != '') {
      this.data.activityInfo.askForLeaveList.push(this.data.askForLeaveMap);
    }
    this.data.activityInfo.updateTime = new Date().getTime();
    var that = this;
    db.collection(that.data.dbName).add({
      data: that.data.activityInfo,
      success: function(res) {
        that.setData({
          activityInfo: that.data.activityInfo
        });
        that.resetSUMap(that);
        that.resetAFLMap(that);
        that.notify("success", "发布活动成功");
        // 刷新list页面数据
        that.refreshListPage();
      }
    });
    this.delayToHomePage(this);
  },

  delayToHomePage: function(_this) {
    // 延迟跳转回首页
    setTimeout(function () {
      _this.toListPage();
    }, 2000);
  },

  updateActivityInfo: function(e) {
    if (this.data.publishNewActivity) {
      console.log('input SU or AFL data');
      return;
    }
    // 更新活动信息
    console.log("update activity info");
    // 判断报名信息的合法性
    if (this.checkSignUpList()) {
      return;
    }
    // 判断请假信息的合法性
    if (this.checkAskForLeaveList()) {
      return;
    }
    // 添加这场活动关联的openid
    if (-1 == this.data.activityInfo.referredOpeneIds.indexOf(app.globalData.openid)) {
      this.data.activityInfo.referredOpeneIds.push(app.globalData.openid);
    }
    var successText = '发布活动';
    if (e) {
      var tagId = e.target.id;
      if ("signUp" == tagId) { successText = '报名'; }
      if ("askForLeave" == tagId) { successText = '请假'; }
    }
    // 执行更新操作
    if (this.data.publisher) {
      // 自己可以更新全部活动数据
      if (e) {
        var tagId = e.target.id;
        if ("signUp" == tagId && '' === this.data.signUpMap.content) { 
          return;
        }
        if ("askForLeave" == tagId && '' === this.data.askForLeaveMap.content) {
          return;
        }
      }
      var _this = this;
      this.updateActivityInfoViaDB(this,
        success => function(res) {
          console.log('[update]: ', res);
          _this.notify('success', successText + "成功");
        },
        complete => function() {
          _this.setData({
            activityInfo: _this.data.activityInfo
          });
          _this.resetSUMap(_this);
          _this.resetAFLMap(_this);
          if (e) {
            _this.sendTemplateUpdateMsg(_this, "有人" + successText + "了");
          } else {
            _this.sendTemplateUpdateMsg(_this, "活动信息更新了");
          }
          // 刷新list页面数据
          _this.refreshListPage();
        }
      );
      // 如果不是点了键盘的完成，而是发布活动，则需要自动跳转页面
      if (!e) {
        this.delayToHomePage(this);
      }
    } else {
      // 其他人只能更新报名或者请假数据
      // 如果报名和请假信息都为空
      if ('' === this.data.signUpMap.content && '' === this.data.askForLeaveMap.content) {
        this.notify('danger', '请追加报名或请假');
        return;
      }
      var _this = this;
      this.updateActivityInfoViaCloud(this,
        success => function(res) {
          console.log('[云函数] [update]: ', res);
          _this.notify('success', successText + "成功");
        },
        complete => function () {
          _this.setData({
            activityInfo: _this.data.activityInfo
          });
          _this.resetSUMap(_this);
          _this.resetAFLMap(_this);
          _this.sendTemplateUpdateMsg(_this, "有人" + successText + "了");
          // 刷新list页面数据
          _this.refreshListPage();
        }
      );
    }
  },

  checkSignUpList: function() {
    if (this.data.signUpMap.content != '') {
      var existedInSUL = false;
      for (let index = 0; index < this.data.activityInfo.signUpList.length; index++) {
        let signUpMap = this.data.activityInfo.signUpList[index];
        if (this.data.signUpMap.openid == signUpMap.openid &&
          this.data.signUpMap.content == signUpMap.content) {
          existedInSUL = true;
          break;
        }
      }
      if (existedInSUL) {
        this.notify('warning', this.data.signUpMap.content + "已报名");
        this.resetSUMap(this);
        return true;
      } else {
        this.data.activityInfo.signUpList.push(this.data.signUpMap);
        // 将请假列表中的报名人删除
        var _this = this;
        this.data.activityInfo.askForLeaveList.forEach(function(item, index, arr) {
          if (item.content == _this.data.signUpMap.content &&
            item.openid == _this.data.signUpMap.openid) {
            arr.splice(index, 1);
          }
        });
      }
    }
    return false;
  },

  checkAskForLeaveList: function() {
    if (this.data.askForLeaveMap.content != '') {
      var existedInAFL = false;
      for (let index = 0; index < this.data.activityInfo.askForLeaveList.length; index++) {
        let askForLeaveMap = this.data.activityInfo.askForLeaveList[index];
        if (this.data.askForLeaveMap.openid == askForLeaveMap.openid &&
          this.data.askForLeaveMap.content == askForLeaveMap.content) {
          existedInAFL = true;
          break;
        }
      }
      if (existedInAFL) {
        this.notify('warning', this.data.askForLeaveMap.content + "已请假");
        this.resetAFLMap(this);
        return true;
      } else {
        this.data.activityInfo.askForLeaveList.push(this.data.askForLeaveMap);
        // 将报名列表中的请假人删除
        var _this = this;
        this.data.activityInfo.signUpList.forEach(function(item, index, arr) {
          if (item.content == _this.data.askForLeaveMap.content &&
            item.openid == _this.data.askForLeaveMap.openid) {
            arr.splice(index, 1);
          }
        });
      }
    }
    return false;
  },

  updateActivityInfoViaDB: function(_this, successCallback, completeCallback) {
    console.log("db update");
    _this.data.activityInfo.updateTime = new Date().getTime();
    db.collection(_this.data.dbName).doc(_this.data.activityId).update({
      data: {
        subject: _this.data.activityInfo.subject,
        time: _this.data.activityInfo.time,
        showTime: _this.data.activityInfo.showTime,
        duration: _this.data.activityInfo.duration,
        location: _this.data.activityInfo.location,
        askForLeaveList: _this.data.activityInfo.askForLeaveList,
        signUpList: _this.data.activityInfo.signUpList,
        updateTime: _this.data.activityInfo.updateTime,
        referredOpeneIds: _this.data.activityInfo.referredOpeneIds
      },
      success: successCallback(),
      complete: completeCallback()
    });
  },

  updateActivityInfoViaCloud: function(_this, successCallback, completeCallback) {
    // 调用云函数更新
    console.log("cloud update");
    _this.data.activityInfo.updateTime = new Date().getTime();
    wx.cloud.callFunction({
      name: 'update_activity',
      data: {
        id: _this.data.activityId,
        signUpList: _this.data.activityInfo.signUpList,
        askForLeaveList: _this.data.activityInfo.askForLeaveList,
        updateTime: _this.data.activityInfo.updateTime,
        referredOpeneIds: _this.data.activityInfo.referredOpeneIds
      },
      success: successCallback(),
      complete: completeCallback()
    });
  },

  // 点击报名或者请假标签的删除按钮后触发
  onTagClose: function (e) {
    console.log(e);
    // 从报名列表或者请假列表中删除自己
    Dialog.confirm({
      title: '提示',
      message: '确认是否取消？',
      zIndex: 999
    }).then(() => {
      // on confirm
      var that = this;
      var dataIndex = parseInt(e.target.dataset.index);
      var tagId = e.target.id;
      var tagDeleteTip = '';
      if ("signUp-tag" == tagId) {
        // 删除自己的报名信息
        that.data.activityInfo.signUpList.forEach(function (item, index, arr) {
          if (index === dataIndex) {
            arr.splice(index, 1);
          }
        });
        tagDeleteTip = "取消报名";
      }
      if ("askForLeave-tag" == tagId) {
        // 删除自己的请假信息
        that.data.activityInfo.askForLeaveList.forEach(function (item, index, arr) {
          if (index === dataIndex) {
            arr.splice(index, 1);
          }
        });
        tagDeleteTip = "取消请假";
      }
      // 将关联的openid删除（发布者的openid除外）
      if (that.data.activityInfo._openid != app.globalData.openid) {
        // 在报名列表中查找自己的报名信息
        let foundSU = false;
        for (let i = 0; i < that.data.activityInfo.signUpList.length; i++) {
          let signUpMap = that.data.activityInfo.signUpList[i];
          if (signUpMap.openid == app.globalData.openid) {
            foundSU = true;
            break;
          }
        }
        // 在请假列表中查找自己的请假信息
        let foundAFL = false;
        for (let i = 0; i < that.data.activityInfo.askForLeaveList.length; i++) {
          let askForLeaveMap = that.data.activityInfo.askForLeaveList[i];
          if (askForLeaveMap.openid == app.globalData.openid) {
            foundAFL = true;
            break;
          }
        }
        if (!foundSU && !foundAFL) {
          // 删除关联的openid
          that.data.activityInfo.referredOpeneIds.forEach(function (item, index, arr) {
            if (item === app.globalData.openid) {
              arr.splice(index, 1);
            }
          });
        }
      }
      // 执行更新操作
      if (that.data.publisher) {
        that.updateActivityInfoViaDB(that,
          success => function (res) {
            console.log('[update]: ', res);
            that.notify('success', tagDeleteTip + "成功");
          },
          complete => function (res) {
            that.setData({
              activityInfo: that.data.activityInfo
            });
            that.resetSUMap(that);
            that.resetAFLMap(that);
            that.sendTemplateUpdateMsg(that, "有人" + tagDeleteTip + "了");
            // 刷新list页面数据
            that.refreshListPage();
          }
        );
      } else {
        that.updateActivityInfoViaCloud(that,
          success => function (res) {
            console.log('[云函数] [update]: ', res);
            that.notify('success', tagDeleteTip + "成功");
          },
          complete => function () {
            that.setData({
              activityInfo: that.data.activityInfo
            });
            that.resetSUMap(that);
            that.resetAFLMap(that);
            that.sendTemplateUpdateMsg(that, "有人" + tagDeleteTip + "了");
            // 刷新list页面数据
            that.refreshListPage();
          }
        );
      }
    }).catch(() => {
      // on cancel
    });
  },

  refreshListPage: function () {
    var pages = getCurrentPages();
    if (pages.length >= 2) {
      var previousPage = pages[pages.length - 2];
      if (previousPage && previousPage.route === 'pages/activity/activity') {
        previousPage.onQuery(previousPage);
      }
    }
  },

  toListPage: function() {
    var page_url = '/pages/activity/activity';
    if (this.data.publisher) {
      var pages = getCurrentPages();
      if (pages.length >= 2) {
        // 本人小程序内跳转到首页
        wx.navigateBack({
          delta: 1,
          success: function() {}
        });
      } else {
        // 本人从卡片跳转到首页
        wx.switchTab({
          url: page_url,
          success: function() {}
        });
      }
    } else {
      // 非本人从卡片跳转到首页
      wx.switchTab({
        url: page_url,
        success: function() {}
      });
    }
  },

  /**
   * ================================================================
   * map相关的代码，使用页面变量currentLocation
   * ================================================================
   */
  getCurrentLocation: function(e) {
    var that = this;
    wx.getLocation({
      success: function(res) {
        console.log(res);
        that.data.currentLocation.longitude = res.longitude;
        that.data.currentLocation.latitude = res.latitude;
      },
      fail: function(res) {
        console.log(res);
      },
      complete: function(res) {
        var activityInfo = that.data.activityInfo;
        activityInfo.location = that.data.currentLocation;
        that.data.activityInfo = activityInfo;
        var markers = that.createMarkers(that.data.activityInfo.location);
        that.data.markers = markers;
        that.setData({
          activityInfo: activityInfo,
          markers: that.data.markers
        });
      }
    })
  },

  openLocation: function(e) {
    var that = this;
    wx.openLocation({
      latitude: that.data.currentLocation.latitude,
      longitude: that.data.currentLocation.longitude,
    })
  },

  setLocation: function(_this, location) {
    console.log(location);
    _this.data.currentLocation.longitude = location.longitude;
    _this.data.currentLocation.latitude = location.latitude;
    _this.data.currentLocation.name = location.name;
    _this.data.currentLocation.address = location.address;
    var activityInfo = _this.data.activityInfo;
    activityInfo.location = _this.data.currentLocation;
    _this.data.activityInfo = activityInfo;
    var markers = _this.createMarkers(_this.data.activityInfo.location);
    _this.data.markers = markers;
    _this.setData({
      activityInfo: activityInfo,
      markers: _this.data.markers
    });
  },

  createMarkers: function(location) {
    var markers = [{
      iconPath: "../../images/marker_01.png",
      id: 0,
      latitude: location.latitude,
      longitude: location.longitude,
      width: 24,
      height: 24
    }];
    return markers;
  },

  toLocationPage: function() {
    var page_url = '/pages/location/location?from=editActivity';
    wx.navigateTo({
      url: page_url,
    });
  },

  /**
   * ================================================================
   * timePicker相关的代码
   * ================================================================
   */
  showTimePicker() {
    if (!this.data.timeDisabled) {
      this.setData({
        showTimePickerFlag: true
      });
    }
  },

  onTimePickerCancel: function(event) {
    this.setData({
      showTimePickerFlag: false
    });
  },

  onTimePickerConfirm: function(event) {
    this.setData({
      showTimePickerFlag: false
    });
    const {
      detail,
      currentTarget
    } = event;
    this.data.activityInfo.time = detail;
    this.data.activityInfo.showTime = util.formatDate(new Date(detail), "yyyy-MM-dd hh:mm");
    this.setData({
      activityInfo: this.data.activityInfo
    });
  },

  showDurationPicker: function() {
    if (!this.data.timeDisabled) {
      this.setData({
        showDurationPickerFlag: true
      });
    }
  },

  onDurationPickerCancel: function(event) {
    this.setData({
      showDurationPickerFlag: false
    });
  },

  onDurationPickerConfirm: function(event) {
    this.setData({
      showDurationPickerFlag: false
    });
    const {
      detail,
      currentTarget
    } = event;
    this.data.activityInfo.duration = detail.value;
    this.setData({
      activityInfo: this.data.activityInfo
    });
  },

  /**
   * ================================================================
   * canvas绘制图片相关的代码
   * ================================================================
   */
  //绘制canvas图片
  drawShareImage: function() {
    //创建一个canvas对象
    const ctx = wx.createCanvasContext('shareBox', this);
    //绘制画布，并在回调中获取画布文件的临时路径
    var that = this;
    var width = wx.getSystemInfoSync().windowWidth;
    ctx.draw(true, function() {
      wx.canvasToTempFilePath({
        x: 20,
        y: 100,
        width: width - 40,
        height: 200,
        canvasId: 'shareBox',
        success(res) {
          console.log(res)
          if (res.tempFilePath) {
            that.data.sharePicUrl = res.tempFilePath;
            // 将绘制的图片缓存
            wx.setStorageSync(app.globalData.sharePicUrlKey, res.tempFilePath);
          }
        }
      });
    });
  },
  //绘制图片封装
  drawImage: function(ctx, url, x, y, w, h) {
    ctx.drawImage(url, x * scale, y * scale, w * scale, h * scale);
  },

  /**
   * ================================================================
   * 订阅消息相关的代码
   * ================================================================
   */
  showAuthMsgBtn: function(_this) {
    _this.setData({
      hideAuthMsgBtnFlag: _this.data.hideAuthMsgBtnFlag
    });
  },

  hideAuthMsgBtn: function (_this) {
    _this.setData({
      hideAuthMsgBtnFlag: _this.data.hideAuthMsgBtnFlag
    });
  },

  switchAuthMsgBtn: function(_this, state) {
    if (state) {
      _this.hideAuthMsgBtn(_this);
    } else {
      _this.showAuthMsgBtn(_this);
    }
  },

  onUserAuthMsg: function () {
    // 获取用户对订阅消息的授权
    var that = this;
    wx.requestSubscribeMessage({
      tmplIds: ['9pBjK8fdwRqcjTXBvgL7ueMpQnSiq_xvw8caYB08hTg'],
      success: function (res) {
        console.log(res);
        var all_attribute_value = util.get_object_all_attribute(res);
        var state = false;
        for (let i = 0; i < all_attribute_value.length; i++) {
          let result = all_attribute_value[i];
          if (result == 'accept') {
            console.log('已授权接收订阅消息');
            that.notify('success', '已成功订阅一次通知消息');
            state = true;
            break;
          } else if (result == 'reject') {
            console.log('已拒绝接收订阅消息');
            that.notify('warning', '拒绝后将接收不到报名进展消息');
            state = false;
            break;
          }
        }
        that.data.hideAuthMsgBtnFlag = state;
        that.updateAuthRecord(that, state, true);
      },
      fail: function (res) {
        console.log('授权订阅消息失败');
        console.log(res);
        that.notify('warning', '通知消息订阅失败');
      },
      complete: function (res) {
        console.log('完成订阅消息的授权');
      },
    });
  },

  queryAuthRecord: function (_this) {
    console.log("query auth record");
    db.collection("authorizations").where({
      _openid: app.globalData.openid
    }).get({
      success: function (res) {
        console.log(res);
        if (res.data.length > 0) {
          _this.data.hideAuthMsgBtnFlag = res.data[0].state;
          _this.switchAuthMsgBtn(_this, res.data[0].state);
        } else {
          // 该用户没有授权记录
          _this.data.hideAuthMsgBtnFlag = false;
          _this.storeAuthRecord(_this, false, true);
        }
      },
      fail: function (res) {
        console.log(res);
      }
    });
  },

  storeAuthRecord: function (_this, state, resetUI) {
    console.log("store auth record");
    db.collection("authorizations").add({
      data: {
        state: state
      },
      success: function (res) {
        console.log(res);
        if (resetUI) {
          _this.switchAuthMsgBtn(_this, state);
        }
      }
    });
  },

  updateAuthRecord: function (_this, state, resetUI) {
    console.log("update auth record");
    db.collection("authorizations").where({
      _openid: app.globalData.openid
    }).update({
      data: {
        state: state
      },
      success: function (res) {
        console.log(res);
        if (resetUI) {
          _this.switchAuthMsgBtn(_this, state);
        }
      }
    });
  },

  sendTemplateUpdateMsg: function (_this, detail) {
    // 调用云函数发送订阅消息
    console.log("send template update message");
    for(let i = 0; i < _this.data.activityInfo.referredOpeneIds.length; i++) {
      let openid = _this.data.activityInfo.referredOpeneIds[i];
      // 只发送给除自己之外的参与者
      if (openid != app.globalData.openid) {
        var other_openid = openid;
        wx.cloud.callFunction({
          name: 'send_template_update',
          data: {
            openid: other_openid,
            page: "/pages/editActivity/editActivity",
            parameter: "?id="+_this.data.activityId,
            subject: util.getSubStrBylen(_this.data.activityInfo.subject, 17),
            showTime: _this.data.activityInfo.showTime,
            detail: detail,
            signUpCount: _this.data.activityInfo.signUpList.length,
            position: util.getSubStrBylen(_this.data.activityInfo.location.name, 17)
          },
          success: function(res) {
            // 更改别人的订阅消息状态, 需要调用云函数
            console.log("update the other user's auth record by cloud funtion");
            wx.cloud.callFunction({
              name: 'update_auth',
              data: {
                openid: other_openid,
                state: false
              },
              success: function(res) {
                console.log(res);
              }
            });
          }
        });
      }
    }
  },

  /**
   * ================================================================
   * 名称备注相关的代码
   * ================================================================
   */
  queryNoteRecord: function (_this) {
    console.log("query note record");
    db.collection("notes").where({
      _openid: app.globalData.openid
    }).get({
      success: function (res) {
        console.log(res);
        if (res.data.length > 0) {
          _this.data.nameNote = res.data[0].nameNote;
        }
      },
      fail: function (res) {
        console.log(res);
      }
    });
  },

  inputNameNote: function (e) {
    if (this.data.nameNote.length === 0) {
      // 提示用户去设置名称备注
      var that = this;
      Dialog.confirm({
        title: '提示',
        message: '还没有设置名称备注，去设置？',
        zIndex: 999
      }).then(() => {
        // on confirm
        that.toNotePage();
      }).catch(() => {
        // on cancel
        that.notify('warning', '请稍后在[我的->我的备注]中设置');
      });
      return;
    }

    if (e) {
      var tagId = e.target.id;
      if ("signUp" == tagId) { 
        this.data.signUpMap = {
          openid: app.globalData.openid,
          content: this.data.nameNote,
          close: true
        };
        this.setData({
          fieldSUValue: this.data.nameNote
        });
        this.resetAFLMap(this);

        // 延迟0.5秒自动提交
        var that = this;
        setTimeout(function () {
          that.updateActivityInfo(e);
        }, 500);
      } else if ("askForLeave" == tagId) {
        this.data.askForLeaveMap = {
          openid: app.globalData.openid,
          content: this.data.nameNote,
          close: true
        };
        this.setData({
          fieldAFLValue: this.data.nameNote
        });
        this.resetSUMap(this);

        // 延迟0.5秒自动提交
        var that = this;
        setTimeout(function () {
          that.updateActivityInfo(e);
        }, 500);
      }
    }
  },

  toNotePage: function () {
    var page_url = '/pages/note/note?from=editActivity';
    wx.navigateTo({
      url: page_url,
    });
  },
})