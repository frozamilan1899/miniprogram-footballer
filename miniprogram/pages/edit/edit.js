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
    publishText: '发布比赛',
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
    // ------------------------------
    sharePicUrl: "",
  },

  onLoad: function(options) {
    console.log(options);
    if ('id' in options) {
      this.data.publishNewMatch = false;
      this.data.matchId = options.id;
      if (app.globalData.shared) {
        // 从云数据中获取指定id的比赛信息
        wx.showLoading({
          title: '加载中',
        });
        var that = this;
        db.collection(app.globalData.dbName).where({
          _id: that.data.matchId
        }).get({
          success: res => {
            that.data.matchInfo = res.data[0];
            if (that.data.matchInfo._openid != app.globalData.openid) {
              that.data.publisher = false;
              that.renderPage(that, '报名/请假', true);
            }
            // 检查本场比赛是否已过期，若已过期将部分控件设置为不可用
            var currentTime = new Date().getTime();
            if (currentTime > that.data.matchInfo.time) {
              that.data.expired = true;
              that.renderPage(that, '发布比赛', true);
              that.notify('warning', '比赛已过期');
            } else {
              that.data.expired = false;
              // 检查报名列表的身份
              for (let i = 0; i < that.data.matchInfo.signUpList.length; i++) {
                let signUpMap = that.data.matchInfo.signUpList[i];
                that.data.matchInfo.signUpList[i].close = (signUpMap.openid == app.globalData.openid); 
              }
              // 检查请假列表的身份
              for (let i = 0; i < that.data.matchInfo.askForLeaveList.length; i++) {
                let askForLeaveMap = that.data.matchInfo.askForLeaveList[i];
                that.data.matchInfo.askForLeaveList[i].close = (askForLeaveMap.openid == app.globalData.openid); 
              }
            } 
          },
          fail: res => {
            console.log(res);
          },
          complete: res => {
            // 获取比赛位置信息
            that.data.currentLocation = that.data.matchInfo.location;
            var markers = that.createMarkers(that.data.matchInfo.location);
            that.data.markers = markers;
            console.log(that.data.matchInfo);
            that.setData({
              matchInfo: that.data.matchInfo,
              markers: that.data.markers
            });
            wx.hideLoading();
          }
        });

        // 10秒钟后没有数据返回，关闭loading
        setTimeout(function () {
          wx.hideLoading();
          wx.stopPullDownRefresh();
        }, 10000);
      } else {
        // 从缓存中获取指定id的比赛信息
        var cachedMatches = wx.getStorageSync(app.globalData.previousMatchesInfoKey);
        for (let i = 0; i < cachedMatches.length; i++) {
          let cachedMatch = cachedMatches[i];
          if (this.data.matchId == cachedMatch._id) {
            this.data.matchInfo = cachedMatch;
          }
        }
        if (this.data.matchInfo._openid != app.globalData.openid) {
          this.data.publisher = false;
          this.renderPage(this, '报名/请假', true);
        }
        // 检查本场比赛是否已过期，若已过期将部分控件设置为不可用
        if (this.data.matchInfo.expired) {
          this.data.expired = true;
          this.renderPage(this, '发布比赛', true);
          this.notify('warning', '比赛已过期');
        } else {
          this.data.expired = false;
          // 检查报名列表的身份
          for (let i = 0; i < this.data.matchInfo.signUpList.length; i++) {
            let signUpMap = this.data.matchInfo.signUpList[i];
            this.data.matchInfo.signUpList[i].close = (signUpMap.openid == app.globalData.openid);
          }
          // 检查请假列表的身份
          for (let i = 0; i < this.data.matchInfo.askForLeaveList.length; i++) {
            let askForLeaveMap = this.data.matchInfo.askForLeaveList[i];
            this.data.matchInfo.askForLeaveList[i].close = (askForLeaveMap.openid == app.globalData.openid);
          }
        }
        // 获取比赛位置信息
        this.data.currentLocation = this.data.matchInfo.location;
        var markers = this.createMarkers(this.data.matchInfo.location);
        this.data.markers = markers;
        console.log(this.data.matchInfo);
        this.setData({
          matchInfo: this.data.matchInfo,
          markers: this.data.markers
        });
      }
    } else {
      this.data.publishNewMatch = true;
      //获取当前位置
      this.getLocation();
    }

    // 这是胶囊按键里的“转发”按钮是否可以显示
    if (this.data.publishNewMatch) {
      wx.hideShareMenu({});
    } else {
      wx.showShareMenu({
        withShareTicket: true
      });
    }
    // 设置转发比赛按钮是否可以操作
    this.setData({
      publishNewMatch: this.data.publishNewMatch
    });
  },
  
  onShow: function() {
    if (app.globalData.shared) {
      wx.hideHomeButton();
    }
  },

  onUnload: function() {
    this.renderPage(this, '发布比赛', false);
    this.data.publisher = true;
    this.data.expired = false;
  },

  onShareAppMessage: function (option) {
    console.log(option);
    this.drawShareImage();
    var shareTitle = "愣着干嘛？踢球啊！";
    var sharePath = "/pages/edit/edit?id=" + this.data.matchId;  
    return {
      title: shareTitle,
      imageUrl: this.data.sharePicUrl,
      path: sharePath,
      success: function (res) {
        console.log(res);
      },
      fail: function (res) {
        console.log(res);
      }
    }
  },

  renderPage: function (_this, pText, disabled) {
    // 渲染页面
    if (!_this.data.publisher || _this.data.expired) {
      _this.data.publishText = pText;
      _this.data.subjectDisabled = disabled;
      _this.data.timeDisabled = disabled;
      _this.data.locationDisabled = disabled;
      _this.setData({
        publishText: _this.data.publishText,
        subjectDisabled: _this.data.subjectDisabled,
        timeDisabled: _this.data.timeDisabled,
        locationDisabled: _this.data.locationDisabled,
        expired: _this.data.expired
      });
    }
  },

  getSubjectInput: function(event) {
    var inputStr = event.detail;
    if (inputStr && inputStr.length > 0) {
      this.data.matchInfo.subject = inputStr;
    }
  },

  getSUInput: function (event) {
    var inputStr = event.detail;
    if (inputStr && inputStr.length > 0) {
      this.data.signUpMap = {
        openid: app.globalData.openid,
        content: inputStr
      };
    }
  }, 

  getAFLInput: function(event) {
    var inputStr = event.detail;
    if (inputStr && inputStr.length > 0) {
      this.data.askForLeaveMap = {
        openid: app.globalData.openid,
        content: inputStr
      };
    }
  }, 

  notify: function(tp, msg){
    Notify({ type: tp, message: msg, duration: 2000 });
  },

  submitMatchInfo: function() {
    // 必须项判空操作
    if ('' === this.data.matchInfo.subject) {
      this.notify('danger', '请填写比赛主题');
      return;
    }
    if ('' === this.data.matchInfo.showTime) {
      this.notify('danger', '请选择日期和时间');
      return;
    }
    if ('' === this.data.matchInfo.location.name 
      && '' === this.data.matchInfo.location.address) {
      this.notify('danger', '请选取比赛位置');
      return;
    }

    // 比赛信息发布或者追加
    var updateTime = new Date().getTime();
    this.data.matchInfo.updateTime = updateTime;
    // 添加这场比赛关联的openid
    if (-1 == this.data.matchInfo.referredOpeneIds.indexOf(app.globalData.openid)) {
      this.data.matchInfo.referredOpeneIds.push(app.globalData.openid);
    }
    var that = this;
    if (!this.data.publishNewMatch) {
      console.log("update match info");
      // 判断报名信息的合法性
      if (this.data.signUpMap.content != '') {
        var existedInSUL = false;
        for (let index = 0; index < this.data.matchInfo.signUpList.length; index++) {
          let signUpMap = this.data.matchInfo.signUpList[index];
          if (this.data.signUpMap.openid == signUpMap.openid
            && this.data.signUpMap.content == signUpMap.content) {
            existedInSUL = true;
            break;
          }
        }
        if (existedInSUL) {
          this.notify('warning', this.data.signUpMap.content + "已报名");
          return;
        } else {
          this.data.matchInfo.signUpList.push(this.data.signUpMap);
          // 将请假列表中的报名人删除
          this.data.matchInfo.askForLeaveList.forEach(function (item, index, arr) {
            if (item.content == that.data.signUpMap.content
              && item.openid == that.data.signUpMap.openid) {
              arr.splice(index, 1);
            }
          });
        }
      }
      // 判断请假信息的合法性
      if (this.data.askForLeaveMap.content != '') {
        var existedInAFL = false;
        for (let index = 0; index < this.data.matchInfo.askForLeaveList.length; index++) {
          let askForLeaveMap = this.data.matchInfo.askForLeaveList[index];
          if (this.data.askForLeaveMap.openid == askForLeaveMap.openid
            && this.data.askForLeaveMap.content == askForLeaveMap.content) {
            existedInAFL = true;
            break;
          }
        }
        if (existedInAFL) {
          this.notify('warning', this.data.askForLeaveMap.content + "已请假");
          return;
        } else {
          this.data.matchInfo.askForLeaveList.push(this.data.askForLeaveMap);
          // 将报名列表中的请假人删除
          this.data.matchInfo.signUpList.forEach(function (item, index, arr) {
            if (item.content == that.data.askForLeaveMap.content
              && item.openid == that.data.askForLeaveMap.openid) {
              arr.splice(index, 1);
            }
          });
        } 
      }
      // 执行更新操作
      if (this.data.publisher) {
        console.log("local update");
        db.collection(app.globalData.dbName).doc(that.data.matchId).update({
          data: {
            subject: that.data.matchInfo.subject,
            time: that.data.matchInfo.time,
            showTime: that.data.matchInfo.showTime,
            location: that.data.matchInfo.location,
            askForLeaveList: that.data.matchInfo.askForLeaveList,
            signUpList: that.data.matchInfo.signUpList,
            updateTime: that.data.matchInfo.updateTime,
            referredOpeneIds: that.data.matchInfo.referredOpeneIds
          },
          success: function (res) {
            util.showToast(that.data.publishText + "成功");
          }
        });
      } else {
        console.log("cloud update, the other people cannot directly modify the match info");
        if ('' === this.data.signUpMap.content && '' === this.data.askForLeaveMap.content) {
          this.notify('danger', '请追加报名或请假');
          return;
        }
        // 调用云函数更新
        wx.cloud.callFunction({
          name: 'update',
          data: {
            id: that.data.matchId,
            signUpList: that.data.matchInfo.signUpList,
            askForLeaveList: that.data.matchInfo.askForLeaveList,
            updateTime: that.data.matchInfo.updateTime,
            referredOpeneIds: that.data.matchInfo.referredOpeneIds
          },
          success: function(res) {
            console.log('[云函数] [update]: ', res);
            util.showToast(that.data.publishText + "成功");
          }
        });
      }
    } else {
      console.log("add match info");
      // 判断报名信息的合法性
      if (this.data.signUpMap.content != '') {
        this.data.matchInfo.signUpList.push(this.data.signUpMap);
      }
      // 判断请假信息的合法性
      if (this.data.askForLeaveMap.content != '') {
        this.data.matchInfo.askForLeaveList.push(this.data.askForLeaveMap);
      }
      db.collection(app.globalData.dbName).add({
        data: that.data.matchInfo,
        success: function (res) {
          util.showToast(that.data.publishText + "成功");
        }
      })
    }

    // 延迟跳转回首页
    var that = this;
    setTimeout(function() {
      that.toListPage();
    }, 2000);
  },

  toListPage: function() {
    var page_url = '/pages/list/list';
    if(this.data.publisher) {
      var pages = getCurrentPages();
      if (pages.length >= 2) {
        // 本人小程序内跳转到首页
        var previousPage = pages[pages.length - 2];
        wx.navigateBack({
          delta: 1,
          success: function () {
            if (previousPage) {
              previousPage.onQuery(previousPage);
            }
          }
        });
      } else {
        // 本人从卡片跳转到首页
        wx.switchTab({
          url: page_url,
          success: function() {
          }
        });
      }
    } else {
      // 非本人从卡片跳转到首页
      wx.switchTab({
        url: page_url,
        success: function () {
        }
      });
    }
  },

  onClose: function(e) {
    console.log(e);
    var that = this;
    Dialog.confirm({
      title: '提示',
      message: '确认是否删除？',
    }).then(() => {
      // on confirm
      // 从报名列表或者请假列表中删除自己
      var dataIndex = parseInt(e.target.dataset.index);
      var tagId = e.target.id;
      console.log(tagId);
      var tagDeleteTip = '';
      if ("signUp-tag" == tagId) {
        // 删除自己的报名信息
        that.data.matchInfo.signUpList.forEach(function (item, index, arr) {
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
          that.data.matchInfo.referredOpeneIds.forEach(function (item, index, arr) {
            if (item === app.globalData.openid) {
              arr.splice(index, 1);
            }
          });
        }
        tagDeleteTip = "删除报名成功";
      }
      if ("askForLeave-tag" == tagId) {
        // 删除自己的请假信息
        that.data.matchInfo.askForLeaveList.forEach(function (item, index, arr) {
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
          that.data.matchInfo.referredOpeneIds.forEach(function (item, index, arr) {
            if (item === app.globalData.openid) {
              arr.splice(index, 1);
            }
          });
        }
        tagDeleteTip = "删除请假成功";
      }
      // 执行更新操作
      if (that.data.publisher) {
        console.log("local update");
        db.collection(app.globalData.dbName).doc(that.data.matchId).update({
          data: {
            askForLeaveList: that.data.matchInfo.askForLeaveList,
            signUpList: that.data.matchInfo.signUpList,
            updateTime: that.data.matchInfo.updateTime,
            referredOpeneIds: that.data.matchInfo.referredOpeneIds
          },
          success: function (res) {
            that.notify('success', tagDeleteTip);
          },
          complete: function (res) {
            that.setData({
              matchInfo: that.data.matchInfo
            });
          }
        });
      } else {
        console.log("cloud update, the other people cannot directly modify the match info");
        // 调用云函数更新
        wx.cloud.callFunction({
          name: 'update',
          data: {
            id: that.data.matchId,
            signUpList: that.data.matchInfo.signUpList,
            askForLeaveList: that.data.matchInfo.askForLeaveList,
            updateTime: that.data.matchInfo.updateTime,
            referredOpeneIds: that.data.matchInfo.referredOpeneIds
          },
          success: function (res) {
            console.log('[云函数] [update]: ', res);
            that.notify('success', tagDeleteTip);
          },
          complete: function (res) {
            that.setData({
              matchInfo: that.data.matchInfo
            });
          }
        });
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
  getLocation: function(e) {
    var that = this;
    wx.getLocation({
      success: function (res) {
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
      success: function (res) {
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
      fail: function (res) {
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
      this.setData({ showTimePickerFlag: true });
    }
  },

  onTimePickerCancel: function (event) {
    this.setData({ showTimePickerFlag: false });
  },

  onTimePickerConfirm: function (event) {
    this.setData({ showTimePickerFlag: false });
    const { detail, currentTarget } = event;
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
    ctx.draw(true, function () {
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
})
