//edit.js
const app = getApp();
var util = require('../../common-js/util.js');
const db = app.globalData.db;

Page({
  data: {
    multiArray: [['3-1', '3-2', '3-3', '3-4', '3-5'], [0, 1, 2, 3, 4, 5, 6], [0, 10, 20]],
    multiIndex: [0, 0, 0],
    matchInfo: {
      subject: "",
      time: "",
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
    markers: [],
    matchId: "",
    pageDate: new Date(),
    publishNewMatch: true,
    publisher: true,
    publishText: '发布比赛',
    subjectDisabled: false,
    timeDisabled: false,
    locationDisabled: false,
    currentLocation: {
      longitude: 108.95000,
      latitude: 34.26667,
      name: '',
      address: ''
    },
    expired: false
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
            wx.hideLoading();
            that.data.matchInfo = res.data[0];
            if (that.data.matchInfo._openid != app.globalData.openid) {
              that.data.publisher = false;
              that.renderPage(that, '报名/请假', true);
            }
            // 检查本场比赛是否已过期，若已过期将部分控件设置为不可用
            var currentTime = new Date().getTime();
            if (currentTime > util.convertDateFromString(that.data.matchInfo.time)) {
              that.data.expired = true;
              that.renderPage(that, '发布比赛', true);
              util.showToast("比赛已过期");
            }
            that.data.currentLocation = that.data.matchInfo.location;
            var markers = that.createMarkers(that.data.matchInfo.location);
            that.data.markers = markers;
            console.log(that.data.matchInfo);
            that.setData({
              matchInfo: that.data.matchInfo,
              markers: that.data.markers
            })
          },
          fail: res => {
            wx.hideLoading();
            console.log(res);
            that.data.matchInfo.location = that.data.currentLocation;
            var markers = that.createMarkers(that.data.currentLocation);
            that.data.markers = markers;
            that.setData({
              matchInfo: that.data.matchInfo,
              markers: that.data.markers
            })
          }
        });
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
          util.showToast("比赛已过期");
        }
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

  onUnload: function() {
    this.renderPage(this, '发布比赛', false);
    this.data.publisher = true;
    this.data.expired = false;
  },

  onShareAppMessage: function (option) {
    console.log(option);
    var shareTitle = this.data.matchInfo.subject;
    var sharePath = "/pages/edit/edit?id=" + this.data.matchId;  
    return {
      title: shareTitle,
      imageUrl: "../../images/playground.png",
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
    var inputStr = event.detail.value;
    if (inputStr && inputStr.length > 0) {
      this.data.matchInfo.subject = inputStr;
    }
  },

  getSUInput: function (event) {
    var inputStr = event.detail.value;
    if (inputStr && inputStr.length > 0) {
      this.data.signUpMap = {
        openid: app.globalData.openid,
        content: inputStr
      };
    }
  }, 

  getAFLInput: function(event) {
    var inputStr = event.detail.value;
    if (inputStr && inputStr.length > 0) {
      this.data.askForLeaveMap = {
        openid: app.globalData.openid,
        content: inputStr
      };
    }
  }, 

  submitMatchInfo: function() {
    // 必须项判空操作
    if ('' === this.data.matchInfo.subject) {
      util.showToast("请填写比赛主题");
      return;
    }
    if ('' === this.data.matchInfo.time) {
      util.showToast("请选择日期和时间");
      return;
    }
    if ('' === this.data.matchInfo.location.name 
      && '' === this.data.matchInfo.location.address) {
      util.showToast("请选取比赛位置");
      return;
    }

    // 比赛信息发布或者追加
    
    var updateTime = new Date().getTime();
    this.data.matchInfo.updateTime = updateTime;
    if (-1 == this.data.matchInfo.referredOpeneIds.indexOf(app.globalData.openid)) {
      this.data.matchInfo.referredOpeneIds.push(app.globalData.openid);
    }
    var that = this;
    if (!this.data.publishNewMatch) {
      console.log("update match info");
      // 判断报名信息的合法性
      var existedInSUL = false;
      if (this.data.signUpMap.content != '') {
        for (let index = 0; index < this.data.matchInfo.signUpList.length; index++) {
          let signUpMap = this.data.matchInfo.signUpList[index];
          if (this.data.signUpMap.openid == signUpMap.openid
            && this.data.signUpMap.content == signUpMap.content) {
            existedInSUL = true;
            break;
          }
        }
        if (existedInSUL) {
          util.showToast(this.data.signUpMap.content + "已报名");
          return;
        } else {
          this.data.matchInfo.signUpList.push(this.data.signUpMap);
        }
      }
      // 判断请假信息的合法性
      var existedInAFL = false;
      if (this.data.askForLeaveMap.content != '') {
        for (let index = 0; index < this.data.matchInfo.askForLeaveList.length; index++) {
          let askForLeaveMap = this.data.matchInfo.askForLeaveList[index];
          if (this.data.askForLeaveMap.openid == askForLeaveMap.openid
            && this.data.askForLeaveMap.content == askForLeaveMap.content) {
            existedInAFL = true;
            break;
          }
        }
        if (existedInAFL) {
          util.showToast(this.data.signUpMap.content + "已请假");
          return;
        } else {
          this.data.matchInfo.askForLeaveList.push(this.data.askForLeaveMap);
        }
      }
      // 执行更新操作
      if (this.data.publisher) {
        console.log("local update");
        db.collection(app.globalData.dbName).doc(that.data.matchId).update({
          data: {
            subject: that.data.matchInfo.subject,
            time: that.data.matchInfo.time,
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
        console.log("cloud update");
        if ('' === this.data.signUpMap.content && '' === this.data.askForLeaveMap.content) {
          util.showToast("请追加报名或请假");
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
          url: page_url
        });
      }
    } else {
      // 非本人从卡片跳转到首页
      wx.switchTab({
        url: page_url
      });
    }
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
        var matchInfo = that.data.matchInfo;
        matchInfo.location = that.data.currentLocation;
        that.data.matchInfo = matchInfo;
        var markers = that.createMarkers(that.data.currentLocation);
        that.data.markers = markers;
        that.setData({
          matchInfo: matchInfo,
          markers: that.data.markers
        });
      },
      fail: function(res) {
        console.log(res);
        that.data.matchInfo.location = that.data.currentLocation;
        var markers = that.createMarkers(that.data.currentLocation);
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
        var markers = that.createMarkers(that.data.currentLocation);
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
      width: 19,
      height: 24
    }];
    return markers;
  },

  /**
   * ================================================================
   * picker相关的代码，使用页面变量pageDate
   * ================================================================
   */
  pickerTap: function () {
    
    var date = new Date();
    this.data.pageDate = date;
  
    var monthDay = [];
    var hours = [];
    var minute = [];
    var currentHours = date.getHours();
    var currentMinute = date.getMinutes();

    // 月-日
    for (var i = 0; i <= 28; i++) {
      var date1 = new Date(date);
      date1.setDate(date.getDate() + i);
      var md = (date1.getMonth() + 1) + "-" + date1.getDate();
      monthDay.push(md);
    }

    var minuteIndex;
    if (currentMinute > 0 && currentMinute <= 10) {
      minuteIndex = 10;
    } else if (currentMinute > 10 && currentMinute <= 20) {
      minuteIndex = 20;
    } else if (currentMinute > 20 && currentMinute <= 30) {
      minuteIndex = 30;
    } else if (currentMinute > 30 && currentMinute <= 40) {
      minuteIndex = 40;
    } else if (currentMinute > 40 && currentMinute <= 50) {
      minuteIndex = 50;
    } else {
      minuteIndex = 60;
    }

    if (minuteIndex == 60) {
      for (var i = currentHours + 1; i < 24; i++) {
        hours.push(i);
      }
      for (var i = 0; i < 60; i += 10) {
        minute.push(i);
      }
    } else {
      for (var i = currentHours; i < 24; i++) {
        hours.push(i);
      }
      for (var i = minuteIndex; i < 60; i += 10) {
        minute.push(i);
      }
    }

    var data = {
      multiArray: this.data.multiArray,
      multiIndex: this.data.multiIndex
    };
    data.multiArray[0] = monthDay;
    data.multiArray[1] = hours;
    data.multiArray[2] = minute;
    this.setData(data);
  },

  bindMultiPickerColumnChange: function (e) {
    
    var hours = [];
    var minute = [];
    var data = {
      multiArray: this.data.multiArray,
      multiIndex: this.data.multiIndex
    };
    // 把选择的对应值赋值给 multiIndex
    data.multiIndex[e.detail.column] = e.detail.value;

    // 然后再判断当前改变的是哪一列,如果是第1列改变
    if (e.detail.column === 0) {
      // 如果第一列滚动到第一行
      if (e.detail.value === 0) {
        this.loadData(hours, minute);
      } else {
        this.loadHoursMinute(hours, minute);
      }

      data.multiIndex[1] = 0;
      data.multiIndex[2] = 0;

      // 如果是第2列改变
    } else if (e.detail.column === 1) {

      // 如果第一列为今天
      if (data.multiIndex[0] === 0) {
        if (e.detail.value === 0) {
          this.loadData(hours, minute);
        } else {
          this.loadMinute(hours, minute);
        }
        // 第一列不为今天
      } else {
        this.loadHoursMinute(hours, minute);
      }
      data.multiIndex[2] = 0;

      // 如果是第3列改变
    } else {
      // 如果第一列为'今天'
      if (data.multiIndex[0] === 0) {

        // 如果第一列为 '今天'并且第二列为当前时间
        if (data.multiIndex[1] === 0) {
          this.loadData(hours, minute);
        } else {
          this.loadMinute(hours, minute);
        }
      } else {
        this.loadHoursMinute(hours, minute);
      }
    }
    data.multiArray[1] = hours;
    data.multiArray[2] = minute;
    this.setData(data);
  },

  bindStartMultiPickerChange: function (event) {
    
    var data = {
      multiArray: this.data.multiArray,
      multiIndex: this.data.multiIndex
    };
    var value = event.detail.value;
    var monthDay = data.multiArray[0][value[0]];
    var hour = data.multiArray[1][value[1]];
    var minute = data.multiArray[2][value[2]];
    if (hour < 10) {
      hour = '0' + hour;
    }
    if (minute == 0) {
      minute = '0' + minute;
    }
    var matchInfo = this.data.matchInfo;
    matchInfo.time = monthDay + "/" + hour + ":" + minute;
    this.setData({
      matchInfo: matchInfo
    });
  },

  loadData: function (hours, minute) {
    
    var date = this.data.pageDate;
    var currentHours = date.getHours();
    var currentMinute = date.getMinutes();

    var minuteIndex;
    if (currentMinute > 0 && currentMinute <= 10) {
      minuteIndex = 10;
    } else if (currentMinute > 10 && currentMinute <= 20) {
      minuteIndex = 20;
    } else if (currentMinute > 20 && currentMinute <= 30) {
      minuteIndex = 30;
    } else if (currentMinute > 30 && currentMinute <= 40) {
      minuteIndex = 40;
    } else if (currentMinute > 40 && currentMinute <= 50) {
      minuteIndex = 50;
    } else {
      minuteIndex = 60;
    }

    if (minuteIndex == 60) {
      for (var i = currentHours + 1; i < 24; i++) {
        hours.push(i);
      }
      for (var i = 0; i < 60; i += 10) {
        minute.push(i);
      }
    } else {
      for (var i = currentHours; i < 24; i++) {
        hours.push(i);
      }
      for (var i = minuteIndex; i < 60; i += 10) {
        minute.push(i);
      }
    }
  },

  loadHoursMinute: function (hours, minute) {
    for (var i = 0; i < 24; i++) {
      hours.push(i);
    }
    for (var i = 0; i < 60; i += 10) {
      minute.push(i);
    }
  },

  loadMinute: function (hours, minute) {

    var date = this.data.pageDate;
    var currentHours = date.getHours();
    var currentMinute = date.getMinutes();

    var minuteIndex;
    if (currentMinute > 0 && currentMinute <= 10) {
      minuteIndex = 10;
    } else if (currentMinute > 10 && currentMinute <= 20) {
      minuteIndex = 20;
    } else if (currentMinute > 20 && currentMinute <= 30) {
      minuteIndex = 30;
    } else if (currentMinute > 30 && currentMinute <= 40) {
      minuteIndex = 40;
    } else if (currentMinute > 40 && currentMinute <= 50) {
      minuteIndex = 50;
    } else {
      minuteIndex = 60;
    }

    if (minuteIndex == 60) {
      for (var i = currentHours + 1; i < 24; i++) {
        hours.push(i);
      }
    } else {
      for (var i = currentHours; i < 24; i++) {
        hours.push(i);
      }
    }
    for (var i = 0; i < 60; i += 10) {
      minute.push(i);
    }
  },
})
