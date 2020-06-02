//edit.js
const app = getApp();
var util = require('../../common-js/util.js');
const db = app.globalData.db;

import Notify from '../../miniprogram_npm/@vant/weapp/notify/notify';
import Dialog from '../../miniprogram_npm/@vant/weapp/dialog/dialog';

Page({
  data: {
    matchId: "",
    matchInfo: {
      subject: "",
      time: "",
      showTime: "",
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
    publishNewMatch: true,
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
    minDate: new Date().getTime(),
    currentDate: new Date().getTime(),
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
    hideAuthMsgBtnFlag: true
  },

  onLoad: function(options) {
    console.log(options);
    if ('id' in options) {
      // 打开已有数据的比赛，因为有id
      this.data.publishNewMatch = false;
      this.data.matchId = options.id;
      if (app.globalData.shared) {
        this.queryDataFromCloud();
      } else {
        this.queryDataFromCache();
      }
    } else {
      this.data.publishNewMatch = true;
      //获取当前位置
      this.getCurrentLocation();
    }

    // 设置转发比赛按钮是否可以操作
    this.setData({
      publishNewMatch: this.data.publishNewMatch
    });

    // 这是胶囊按键里的“转发”按钮是否可以显示
    if (this.data.publishNewMatch) {
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
  },

  onUnload: function() {
    this.renderPage(this, false);
    this.data.publishNewMatch = true;
    this.data.publisher = true;
    this.data.expired = false;
    this.data.showTimePickerFlag = false;
    this.data.hideAuthMsgBtnFlag = true;
  },

  onShareAppMessage: function(option) {
    console.log(option);
    this.drawShareImage();
    var shareTitle = "闲着没事？踢球啊！";
    var sharePath = "/pages/edit/edit?id=" + this.data.matchId;
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
    // 来自分享卡片，从云数据中获取指定id的比赛信息
    wx.showLoading({
      title: '加载中',
    });
    var that = this;
    db.collection(app.globalData.dbName).where({
      _id: that.data.matchId
    }).get({
      success: res => {
        if (res.data.length > 0) {
          that.data.matchInfo = res.data[0];
          that.checkMatchExpired(that);
          that.adjustUIItems(that);
        }
      },
      fail: res => {
        console.log(res);
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
    // 从缓存中获取指定id的比赛信息
    var cachedMatches = wx.getStorageSync(app.globalData.previousMatchesInfoKey);
    for (let i = 0; i < cachedMatches.length; i++) {
      let cachedMatch = cachedMatches[i];
      if (this.data.matchId == cachedMatch._id) {
        this.data.matchInfo = cachedMatch;
        break;
      }
    }
    this.checkMatchExpired(this);
    this.adjustUIItems(this);
    this.queryAndSetLoacation(this);
  },

  checkMatchExpired: function(_this) {
    // 检查本场比赛是否已过期
    var currentTime = new Date().getTime();
    if (currentTime > _this.data.matchInfo.time) {
      _this.data.expired = true;
    } else {
      _this.data.expired = false;
    }
  },

  adjustUIItems: function(_this) {
    // 检查本场比赛是否为自己发布的比赛
    if (_this.data.matchInfo._openid != app.globalData.openid) {
      _this.data.publisher = false;
      _this.renderPage(_this, true);
    }
    // 若本场比赛已过期将部分控件设置为不可用
    if (_this.data.expired) {
      _this.renderPage(_this, true);
      _this.notify('warning', '比赛已过期');
    } else {
      _this.checkTagListForClose(_this);
    }
  },

  checkTagListForClose: function(_this) {
    // 检查报名列表的身份，将close重新设置
    for (let i = 0; i < _this.data.matchInfo.signUpList.length; i++) {
      let signUpMap = _this.data.matchInfo.signUpList[i];
      _this.data.matchInfo.signUpList[i].close = (signUpMap.openid == app.globalData.openid);
    }
    // 检查请假列表的身份，将close重新设置
    for (let i = 0; i < _this.data.matchInfo.askForLeaveList.length; i++) {
      let askForLeaveMap = _this.data.matchInfo.askForLeaveList[i];
      _this.data.matchInfo.askForLeaveList[i].close = (askForLeaveMap.openid == app.globalData.openid);
    }
  },

  queryAndSetLoacation: function(_this) {
    // 获取并设置比赛位置信息
    _this.data.currentLocation = _this.data.matchInfo.location;
    var markers = _this.createMarkers(_this.data.matchInfo.location);
    _this.data.markers = markers;
    console.log(_this.data.matchInfo);
    _this.setData({
      matchInfo: _this.data.matchInfo,
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
      this.data.matchInfo.subject = util.trim(inputStr);
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
    if ('' === this.data.matchInfo.subject) {
      this.notify('danger', '请填写比赛主题');
      return true;
    }
    if ('' === this.data.matchInfo.showTime) {
      this.notify('danger', '请选择日期和时间');
      return true;
    }
    if ('' === this.data.matchInfo.location.name &&
      '' === this.data.matchInfo.location.address) {
      this.notify('danger', '请选取比赛位置');
      return true;
    }
    return false;
  },

  submitMatchInfo: function() {
    // 比赛信息发布或者追加
    if (this.checkRequiredItem()) {
      return;
    }
    // 分场景：1）发布新比赛；2）更新比赛
    if (this.data.publishNewMatch) {
      this.addNewMatch();
    } else {
      this.updateMatchInfo();
    }
  },

  addNewMatch: function() {
    // 添加这场比赛关联的openid
    if (-1 == this.data.matchInfo.referredOpeneIds.indexOf(app.globalData.openid)) {
      this.data.matchInfo.referredOpeneIds.push(app.globalData.openid);
    }
    // 发布新的比赛
    console.log("add match info");
    // 如果有报名信息添加
    if (this.data.signUpMap.content != '') {
      this.data.matchInfo.signUpList.push(this.data.signUpMap);
    }
    // 如果有请假信息添加
    if (this.data.askForLeaveMap.content != '') {
      this.data.matchInfo.askForLeaveList.push(this.data.askForLeaveMap);
    }
    this.data.matchInfo.updateTime = new Date().getTime();
    var that = this;
    db.collection(app.globalData.dbName).add({
      data: that.data.matchInfo,
      success: function(res) {
        that.setData({
          matchInfo: that.data.matchInfo
        });
        that.resetSUMap(that);
        that.resetAFLMap(that);
        that.notify("success", "发布比赛成功");
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

  updateMatchInfo: function(e) {
    if (this.data.publishNewMatch) {
      console.log('input SU or AFL data');
      return;
    }
    var successText = '发布比赛';
    if (e) {
      var tagId = e.target.id;
      if ("signUp" == tagId) { successText = '报名'; }
      if ("askForLeave" == tagId) { successText = '请假'; }
    }
    // 添加这场比赛关联的openid
    if (-1 == this.data.matchInfo.referredOpeneIds.indexOf(app.globalData.openid)) {
      this.data.matchInfo.referredOpeneIds.push(app.globalData.openid);
    }
    console.log("update match info");
    // 判断报名信息的合法性
    if (this.checkSignUpList()) {
      return;
    }
    // 判断请假信息的合法性
    if (this.checkAskForLeaveList()) {
      return;
    }
    // 执行更新操作
    if (this.data.publisher) {
      // 自己可以更新全部比赛数据
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
      this.updateMatchInfoViaDB(this,
        success => function(res) {
          console.log('[update]: ', res);
          _this.notify('success', successText + "成功");
        },
        complete => function() {
          _this.setData({
            matchInfo: _this.data.matchInfo
          });
          _this.resetSUMap(_this);
          _this.resetAFLMap(_this);
          if (e) {
            _this.sendTemplateMsg(_this, "有人" + successText + "了");
          } else {
            _this.sendTemplateMsg(_this, "比赛信息更新了");
          }
        }
      );
      // 如果不是点了键盘的完成，而是发布比赛，则需要自动跳转页面
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
      this.updateMatchInfoViaCloud(this,
        success => function(res) {
          console.log('[云函数] [update]: ', res);
          _this.notify('success', successText + "成功");
        },
        complete => function () {
          _this.setData({
            matchInfo: _this.data.matchInfo
          });
          _this.resetSUMap(_this);
          _this.resetAFLMap(_this);
          _this.sendTemplateMsg(_this, "有人" + successText + "了");
        }
      );
    }
  },

  checkSignUpList: function() {
    if (this.data.signUpMap.content != '') {
      var existedInSUL = false;
      for (let index = 0; index < this.data.matchInfo.signUpList.length; index++) {
        let signUpMap = this.data.matchInfo.signUpList[index];
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
        this.data.matchInfo.signUpList.push(this.data.signUpMap);
        // 将请假列表中的报名人删除
        var _this = this;
        this.data.matchInfo.askForLeaveList.forEach(function(item, index, arr) {
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
      for (let index = 0; index < this.data.matchInfo.askForLeaveList.length; index++) {
        let askForLeaveMap = this.data.matchInfo.askForLeaveList[index];
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
        this.data.matchInfo.askForLeaveList.push(this.data.askForLeaveMap);
        // 将报名列表中的请假人删除
        var _this = this;
        this.data.matchInfo.signUpList.forEach(function(item, index, arr) {
          if (item.content == _this.data.askForLeaveMap.content &&
            item.openid == _this.data.askForLeaveMap.openid) {
            arr.splice(index, 1);
          }
        });
      }
    }
    return false;
  },

  updateMatchInfoViaDB: function(_this, successCallback, completeCallback) {
    console.log("db update");
    _this.data.matchInfo.updateTime = new Date().getTime();
    db.collection(app.globalData.dbName).doc(_this.data.matchId).update({
      data: {
        subject: _this.data.matchInfo.subject,
        time: _this.data.matchInfo.time,
        showTime: _this.data.matchInfo.showTime,
        location: _this.data.matchInfo.location,
        askForLeaveList: _this.data.matchInfo.askForLeaveList,
        signUpList: _this.data.matchInfo.signUpList,
        updateTime: _this.data.matchInfo.updateTime,
        referredOpeneIds: _this.data.matchInfo.referredOpeneIds
      },
      success: successCallback(),
      complete: completeCallback()
    });
  },

  updateMatchInfoViaCloud: function(_this, successCallback, completeCallback) {
    // 调用云函数更新
    console.log("cloud update");
    _this.data.matchInfo.updateTime = new Date().getTime();
    wx.cloud.callFunction({
      name: 'update_match',
      data: {
        id: _this.data.matchId,
        signUpList: _this.data.matchInfo.signUpList,
        askForLeaveList: _this.data.matchInfo.askForLeaveList,
        updateTime: _this.data.matchInfo.updateTime,
        referredOpeneIds: _this.data.matchInfo.referredOpeneIds
      },
      success: successCallback(),
      complete: completeCallback()
    });
  },

  toListPage: function() {
    var page_url = '/pages/list/list';
    if (this.data.publisher) {
      var pages = getCurrentPages();
      if (pages.length >= 2) {
        // 本人小程序内跳转到首页
        var previousPage = pages[pages.length - 2];
        wx.navigateBack({
          delta: 1,
          success: function() {
            if (previousPage) {
              previousPage.onQuery(previousPage);
            }
          }
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

  // 点击报名或者请假标签的删除按钮后触发
  onTagClose: function(e) {
    console.log(e);
    // 从报名列表或者请假列表中删除自己
    Dialog.confirm({
      title: '提示',
      message: '确认是否删除？',
    }).then(() => {
      // on confirm
      var that = this;
      var dataIndex = parseInt(e.target.dataset.index);
      var tagId = e.target.id;
      var tagDeleteTip = '';
      if ("signUp-tag" == tagId) {
        // 删除自己的报名信息
        that.data.matchInfo.signUpList.forEach(function(item, index, arr) {
          if (index === dataIndex) {
            arr.splice(index, 1);
          }
        });
        // 如果在报名列表中没有自己的报名信息，将关联的openid删除（发布者除外）
        let foundSU = false;
        for (let i = 0; i < that.data.matchInfo.signUpList.length; i++) {
          let signUpMap = that.data.matchInfo.signUpList[i];
          if (signUpMap.openid == app.globalData.openid) {
            foundSU = true;
            break;
          }
        }
        if (!foundSU) {
          // 删除关联自己的openid
          that.data.matchInfo.referredOpeneIds.forEach(function(item, index, arr) {
            if (item === app.globalData.openid) {
              arr.splice(index, 1);
            }
          });
        }
        tagDeleteTip = "取消报名";
      }
      if ("askForLeave-tag" == tagId) {
        // 删除自己的请假信息
        that.data.matchInfo.askForLeaveList.forEach(function(item, index, arr) {
          if (index === dataIndex) {
            arr.splice(index, 1);
          }
        });
        // 如果在请假列表中没有自己的请假信息，将关联的openid删除（发布者除外）
        let foundAFL = false;
        for (let i = 0; i < that.data.matchInfo.askForLeaveList.length; i++) {
          let askForLeaveMap = that.data.matchInfo.askForLeaveList[i];
          if (askForLeaveMap.openid == app.globalData.openid) {
            foundAFL = true;
            break;
          }
        }
        if (!foundAFL) {
          // 删除关联自己的openid
          that.data.matchInfo.referredOpeneIds.forEach(function(item, index, arr) {
            if (item === app.globalData.openid) {
              arr.splice(index, 1);
            }
          });
        }
        tagDeleteTip = "取消请假";
      }
      // 执行更新操作
      if (that.data.publisher) {
        that.updateMatchInfoViaDB(that,
          success => function(res) {
            console.log('[update]: ', res);
            that.notify('success', tagDeleteTip + "成功");
          },
          complete => function(res) {
            that.setData({
              matchInfo: that.data.matchInfo
            });
            that.resetSUMap(that);
            that.resetAFLMap(that);
            that.sendTemplateMsg(that, "有人" + tagDeleteTip + "了");
          }
        );
      } else {
        that.updateMatchInfoViaCloud(that,
          success => function(res) {
            console.log('[云函数] [update]: ', res);
            that.notify('success', tagDeleteTip + "成功");
          },
          complete => function() {
            that.setData({
              matchInfo: that.data.matchInfo
            });
            that.resetSUMap(that);
            that.resetAFLMap(that);
            that.sendTemplateMsg(that, "有人" + tagDeleteTip + "了");
          }
        );
      }
    }).catch(() => {
      // on cancel
    });
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
        var matchInfo = that.data.matchInfo;
        matchInfo.location = that.data.currentLocation;
        that.data.matchInfo = matchInfo;
        var markers = that.createMarkers(that.data.matchInfo.location);
        that.data.markers = markers;
        that.setData({
          matchInfo: matchInfo,
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

  chooseLocation: function(e) {
    var that = this;
    wx.chooseLocation({
      success: function(res) {
        console.log(res);
        that.data.currentLocation.longitude = res.longitude;
        that.data.currentLocation.latitude = res.latitude;
        that.data.currentLocation.name = res.name;
        that.data.currentLocation.address = res.address;
        var matchInfo = that.data.matchInfo;
        matchInfo.location = that.data.currentLocation;
        that.data.matchInfo = matchInfo;
        var markers = that.createMarkers(that.data.matchInfo.location);
        that.data.markers = markers;
        that.setData({
          matchInfo: matchInfo,
          markers: that.data.markers
        });
      },
      fail: function(res) {
        console.log(res);
      }
    })
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
    this.data.matchInfo.time = detail;
    this.data.matchInfo.showTime = util.formatDate(new Date(detail), "yyyy-MM-dd hh:mm");
    this.setData({
      matchInfo: this.data.matchInfo
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

  sendTemplateMsg: function (_this, detail) {
    // 调用云函数发送订阅消息
    console.log("send template message");
    for(let i = 0; i < _this.data.matchInfo.referredOpeneIds.length; i++) {
      let openid = _this.data.matchInfo.referredOpeneIds[i];
      // 只发送给除自己之外的参与者
      if (openid != app.globalData.openid) {
        var other_openid = openid;
        wx.cloud.callFunction({
          name: 'send_template',
          data: {
            openid: other_openid,
            page: "/pages/edit/edit",
            parameter: "?id="+_this.data.matchId,
            subject: _this.data.matchInfo.subject,
            showTime: _this.data.matchInfo.showTime,
            detail: detail,
            sighUpCount: _this.data.matchInfo.signUpList.length,
            position: _this.data.matchInfo.location.name
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
  }
})