//edit.js
const app = getApp()

Page({
  data: {
    multiArray: [['今天', '明天', '3-2', '3-3', '3-4', '3-5'], [0, 1, 2, 3, 4, 5, 6], [0, 10, 20]],
    multiIndex: [0, 0, 0],
    matchInfo: {
      subject: "",
      time: "",
      signUpList: [],
      askForLeaveList: [],
      location: {
        longitude: 108.95000,
        latitude: 34.26667,
        name: '',
        address: ''
      }
    },
    markers: [],
    matchId: "",
    updateMatchInfo: false,
    pageDate: new Date(),
    signUpListToString: '',
    askForLeaveListToString: '',
  },

  onLoad: function(options) {
    console.log(options);
    if ('id' in options) {
      this.data.updateMatchInfo = true;
      this.data.matchId = options.id;
      var that = this;
      const db = wx.cloud.database();
      db.collection(app.globalData.dbName).where({
        _id: options.id,
        _openid: app.globalData.openid
      }).get({
        success: res => {
          var match = res.data[0];
          that.data.matchInfo = match;
          that.data.signUpListToString = match.signUpList.join('\n');
          that.data.askForLeaveListToString = match.askForLeaveList.join('\n');
          var markers = [{
            iconPath: "../../images/marker_01.png",
            id: 0,
            latitude: that.data.matchInfo.location.latitude,
            longitude: that.data.matchInfo.location.longitude,
            width: 25,
            height: 40
          }];
          that.setData({
            matchInfo: that.data.matchInfo,
            markers: markers, 
            signUpListToString: that.data.signUpListToString,
            askForLeaveListToString: that.data.askForLeaveListToString
          })
        }
      })
    } else {
      this.data.updateMatchInfo = false;
    }
  },

  onShow: function () {
    this.setData({
      matchInfo: this.data.matchInfo
    })
  },

  getSubjectInput: function(event) {
    this.data.matchInfo.subject = event.detail.value;
  },

  getSUInput: function (event) {
    this.data.signUpListToString = event.detail.value;
    var wholeText = this.data.signUpListToString;
    var linesOfText = wholeText.split(/[\n]/);
    this.data.matchInfo.signUpList = linesOfText;
  }, 

  getAFLInput: function(event) {
    this.data.askForLeaveListToString = event.detail.value;
    var wholeText = this.data.askForLeaveListToString;
    var linesOfText = wholeText.split(/[\n]/);
    this.data.matchInfo.askForLeaveList = linesOfText;
  }, 

  submitMatchInfo: function() {
    // 必须项判空操作
    if ('' === this.data.matchInfo.subject) {
      this.showToast("提示", "请填写比赛主题", false);
      return;
    }
    if ('' === this.data.matchInfo.time) {
      this.showToast("提示", "请选择日期和时间", false);
      return;
    }
    if ('' === this.data.matchInfo.location.name 
      && '' === this.data.matchInfo.location.address) {
      this.showToast("提示", "请选取比赛位置", false);
      return;
    }

    // 比赛信息发布或者追加
    const db = wx.cloud.database();
    var that = this;
    if (this.data.updateMatchInfo) {
      db.collection(app.globalData.dbName).doc(that.data.matchId).update({
        data: {
          subject: that.data.matchInfo.subject,
          time: that.data.matchInfo.time,
          location: that.data.matchInfo.location,
          askForLeaveList: that.data.matchInfo.askForLeaveList,
          signUpList: that.data.matchInfo.signUpList
        },
        success: function (res) {
          that.showToast("提示", "发布成功", false);
        }
      })
    } else {
      db.collection(app.globalData.dbName).add({
        data: that.data.matchInfo,
        success: function (res) {
          that.showToast("提示", "发布成功", false);
        }
      })
    }

    // 返回上一级页面
    wx.navigateBack({
      delta: 1,
    })
  },

  toMapsPage: function() {
    var page_url = '/pages/maps/maps';
    wx.navigateTo({
      url: page_url,
    })
  },

  showToast: function(title, content, showCancel) {
    wx.showModal({
      title: title,
      content: content,
      showCancel: showCancel
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
    
    var monthDay = ['今天', '明天'];
    var hours = [];
    var minute = [];
    var currentHours = date.getHours();
    var currentMinute = date.getMinutes();

    // 月-日
    for (var i = 2; i <= 28; i++) {
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
    var that = this;
    var monthDay = ['今天', '明天'];
    var hours = [];
    var minute = [];
    var currentHours = date.getHours();
    var currentMinute = date.getMinutes();

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

        that.loadData(hours, minute);

      } else {
        that.loadHoursMinute(hours, minute);
      }

      data.multiIndex[1] = 0;
      data.multiIndex[2] = 0;

      // 如果是第2列改变
    } else if (e.detail.column === 1) {

      // 如果第一列为今天
      if (data.multiIndex[0] === 0) {
        if (e.detail.value === 0) {
          that.loadData(hours, minute);
        } else {
          that.loadMinute(hours, minute);
        }
        // 第一列不为今天
      } else {
        that.loadHoursMinute(hours, minute);
      }
      data.multiIndex[2] = 0;

      // 如果是第3列改变
    } else {
      // 如果第一列为'今天'
      if (data.multiIndex[0] === 0) {

        // 如果第一列为 '今天'并且第二列为当前时间
        if (data.multiIndex[1] === 0) {
          that.loadData(hours, minute);
        } else {
          that.loadMinute(hours, minute);
        }
      } else {
        that.loadHoursMinute(hours, minute);
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
