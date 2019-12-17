//edit.js
const app = getApp()

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
    }
  },

  onLoad: function(options) {
    console.log(options);
    if ('id' in options) {
      wx.showLoading({
        title: '加载中',
      });
      this.data.publishNewMatch = false;
      this.data.matchId = options.id;
      var that = this;
      const db = wx.cloud.database();
      db.collection(app.globalData.dbName).where({
        _id: options.id
      }).get({
        success: res => {
          wx.hideLoading();
          that.data.matchInfo = res.data[0];
          if (that.data.matchInfo._openid != app.globalData.openid) {
            that.data.publisher = false;
            this.renderPage(that, '报名或请假', true);
          }
          that.data.currentLocation = that.data.matchInfo.location;
          var markers = [{
            iconPath: "../../images/marker_01.png",
            id: 0,
            latitude: that.data.matchInfo.location.latitude,
            longitude: that.data.matchInfo.location.longitude,
            width: 16.67,
            height: 26.67
          }];
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
        }
      })
    } else {
      this.data.publishNewMatch = true;
      //获取当前位置
      this.getLocation();
    }
  },

  onShow: function() {
    this.renderPage(this, '报名或请假', true);
    this.setData({
      matchInfo: this.data.matchInfo
    })
  },

  onUnload: function() {
    this.renderPage(this, '发布比赛', false);
  },

  renderPage: function (_this, pText, disabled) {
    // 渲染页面
    if (!_this.data.publisher) {
      _this.data.publishText = pText;
      _this.data.subjectDisabled = disabled;
      _this.data.timeDisabled = disabled;
      _this.data.locationDisabled = disabled;
      _this.setData({
        publishText: _this.data.publishText,
        subjectDisabled: _this.data.subjectDisabled,
        timeDisabled: _this.data.timeDisabled,
        locationDisabled: _this.data.locationDisabled,
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
      this.showToast("请填写比赛主题");
      return;
    }
    if ('' === this.data.matchInfo.time) {
      this.showToast("请选择日期和时间");
      return;
    }
    if ('' === this.data.matchInfo.location.name 
      && '' === this.data.matchInfo.location.address) {
      this.showToast("请选取比赛位置");
      return;
    }

    // 比赛信息发布或者追加
    const db = wx.cloud.database();
    var updateTime = new Date().getTime();
    this.data.matchInfo.updateTime = updateTime;
    if (-1 == this.data.matchInfo.referredOpeneIds.indexOf(app.globalData.openid)) {
      this.data.matchInfo.referredOpeneIds.push(app.globalData.openid);
    }
    var that = this;
    if (!this.data.publishNewMatch) {
      console.log("update match info");
      var existedInList = false;
      for (var signUpMap in this.data.matchInfo.signUpList) {
        if (this.data.signUpMap.openid == signUpMap.openid && this.data.signUpMap.content == signUpMap.content) {
          existedInList = true;
          break;
        }
      }
      if (!existedInList && this.data.signUpMap.content != '') {
        this.data.matchInfo.signUpList.push(this.data.signUpMap);
      }
      existedInList = false;
      for (var askForLeaveMap in this.data.matchInfo.askForLeaveList) {
        if (this.data.askForLeaveMap.openid == askForLeaveMap.openid && this.data.askForLeaveMap.content == askForLeaveMap.content) {
          existedInList = true;
          break;
        }
      }
      if (!existedInList && this.data.askForLeaveMap.content != '') {
        this.data.matchInfo.askForLeaveList.push(this.data.askForLeaveMap);
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
            that.showToast(that.data.publishText + "成功");
          }
        });
      } else {
        console.log("cloud update");
        if ('' === this.data.signUpMap.content && '' === this.data.askForLeaveMap.content) {
          this.showToast("请追加报名或请假");
          return;
        }
        // 调用云函数
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
            that.showToast(that.data.publishText + "成功");
          }
        });
      }
    } else {
      console.log("add match info");
      db.collection(app.globalData.dbName).add({
        data: that.data.matchInfo,
        success: function (res) {
          that.showToast(that.data.publishText + "成功");
        }
      })
    }

    this.toListPage();
  },

  toListPage: function() {
    if(this.data.publisher) {
      wx.navigateBack({
        delta: 1,
      })
    } else {
      var page_url = '/pages/list/list';
      wx.redirectTo({
        url: page_url,
      })
    }
  },

  showToast: function(content) {
    wx.showToast({
      icon: 'none',
      title: content,
    });
  },

  /**
   * ================================================================
   * map相关的代码，使用页面变量pageDate
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
        var markers = [{
          iconPath: "../../images/marker_01.png",
          id: 0,
          latitude: that.data.currentLocation.latitude,
          longitude: that.data.currentLocation.longitude,
          width: 16.67,
          height: 26.67
        }];
        that.data.markers = markers;
        that.setData({
          matchInfo: matchInfo,
          markers: that.data.markers
        });
      },
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
        var markers = [{
          iconPath: "../../images/marker_01.png",
          id: 0,
          latitude: that.data.currentLocation.latitude,
          longitude: that.data.currentLocation.longitude,
          width: 16.67,
          height: 26.67
        }];
        that.data.markers = markers;
        that.setData({
          matchInfo: matchInfo,
          markers: that.data.markers
        });
      },
    })
  },

  /**
   * ================================================================
   * picker相关的代码，使用页面变量pageDate
   * ================================================================
   */
  pickerTap: function () {
    
    var date = new Date();
    // if (this.data.matchInfo.time != '请选择日期和时间') {
    //   console.log(this.data.matchInfo.time);
    //   var components = this.data.matchInfo.time.split('/');
    //   var monthDay = components[0];
    //   var tmpcomponets = monthDay.split('-');
    //   var month = tmpcomponets[0];
    //   var day = tmpcomponets[1];
    //   var value = components[1];
    //   components = value.split(':');
    //   var hour = components[0];
    //   var minute = components[1];
    //   date = new Date(date.getFullYear(), month-1, day, hour, minute, 0);
    //   console.log(date);
    // } 
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
    
    var date = this.data.pageDate;
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
