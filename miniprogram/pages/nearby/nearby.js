const app = getApp();
const db = app.globalData.db;
const _ = db.command;

var util = require('../../common-js/util.js');

Page({

  data: {
    dbName: "activities",
    option1: [{
        text: '所有距离',
        value: 0
      },
      {
        text: '1km以内',
        value: 1
      },
      {
        text: '5km以内',
        value: 2
      },
      {
        text: '10km以内',
        value: 3
      }
    ],
    option2: [{
        text: '所有时间',
        value: 'a'
      },
      {
        text: '三天以内',
        value: 'b'
      },
      {
        text: '一周以内',
        value: 'c'
      },
      {
        text: '半个月以内',
        value: 'd'
      }
    ],
    defaulValue1: 0,
    defaulValue2: 'a',
    // -----------------------------
    allActivities: [],
    displayActivities: [],
    middleDataArray: [{
      id: '',
      distToLoc: 0,
      intervalToNow: 0
    }],
    option1Value: 0,
    option2Value: 'a',
    // -----------------------------
    currentCoordinate: {
      longitude: 108.95000,
      latitude: 34.26667
    },
    // -----------------------------
    dataLoaded: false
  },

  onLoad: function(options) {
    this.getCurrentCoordinate(this);
    this.data.dataLoaded = true;
  },

  onShow: function() {
    if (!this.data.dataLoaded) {
      this.queryAllActivities(this);
    }
  },

  onUnload: function() {
    this.data.allActivities = [];
    this.data.displayActivities = [];
    this.data.dataLoaded = false;
  },

  onPullDownRefresh: function() {
    console.log("nearby->onPullDownRefresh");
    this.queryAllActivities(this);
  },

  queryAllActivities: function(_this) {
    wx.showLoading({
      title: '加载中...',
    });
    // 如果没有指定limit，则默认且最多取20条记录
    var currentTime = (new Date()).getTime();
    db.collection(_this.data.dbName).where({
      time: _.gte(currentTime)
    }).orderBy('time', 'asc').get({
      success: res => {
        console.log(res.data);
        _this.data.allActivities = res.data;
        _this.createMiddleData(_this);
        _this.filterActivities(_this);
        _this.checkCanIOpenDisplayActivities(_this);
        _this.setData({
          displayActivities: _this.data.displayActivities
        });
        _this.data.dataLoaded = true;
      },
      fail: err => {
        console.error(err);
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

  createMiddleData: function(_this) {
    _this.data.middleDataArray = [];
    var currentTime = (new Date()).getTime();
    for (let i = 0; i < _this.data.allActivities.length; i++) {
      let activity = _this.data.allActivities[i];
      let distToLoc = util.getDistance(_this.data.currentCoordinate.latitude, _this.data.currentCoordinate.longitude, activity.location.latitude, activity.location.longitude);
      let intervalToNow = activity.time - currentTime;
      var middleData = {
        id: activity._id,
        distToLoc: distToLoc,
        intervalToNow: intervalToNow,
      };
      _this.data.middleDataArray.push(middleData);
      _this.data.allActivities[i].distToLoc = distToLoc.toFixed(2);
    }
  },

  filterActivities: function(_this) {
    // 转换选项值
    var distance = _this.convertOption1ValueToRealData(_this.data.option1Value);
    var intervalTime = _this.convertOption2ValueToRealData(_this.data.option2Value);
    var tmpActivityIds = [];
    if (0 == distance && 0 == intervalTime) {
      _this.data.displayActivities = _this.data.allActivities;
    } else {
      // 核心过滤
      for (let i = 0; i < _this.data.middleDataArray.length; i++) {
        let middleData = _this.data.middleDataArray[i];
        if (0 == distance) {
          if (intervalTime >= middleData.intervalToNow) {
            tmpActivityIds.push(middleData.id);
          }
        }
        else if (0 == intervalTime) {
          if (distance >= middleData.distToLoc) {
            tmpActivityIds.push(middleData.id);
          }
        }
        else {
          if (distance >= middleData.distToLoc && intervalTime >= middleData.intervalToNow) {
            tmpActivityIds.push(middleData.id);
          }
        }
      }
      // 组装displayActivities
      _this.data.displayActivities = [];
      for (let i = 0; i < tmpActivityIds.length; i++) {
        let activityId = tmpActivityIds[i];
        for (let j = 0; j < _this.data.allActivities.length; j++) {
          let activity = _this.data.allActivities[j];
          if (activityId == activity._id) {
            _this.data.displayActivities.push(activity);
            break;
          }
        }
      }
    }
  },

  checkCanIOpenDisplayActivities: function(_this) {
    for (let i = 0; i < _this.data.displayActivities.length; i++) {
      let displayActivity = _this.data.displayActivities[i];
      if (-1 == displayActivity.referredOpeneIds.indexOf(app.globalData.openid)) {
        _this.data.displayActivities[i].canOpen = false;
        _this.data.displayActivities[i].navigatePage = '';
      } else {
        _this.data.displayActivities[i].canOpen = true;
        _this.data.displayActivities[i].navigatePage = '../editActivity/editActivity?id=' + displayActivity._id;
      }
    }
  },

  distanceChanged: function(value) {
    console.log(value);
    this.data.displayActivities = [];
    this.data.option1Value = value.detail;
    this.filterActivities(this);
    this.checkCanIOpenDisplayActivities(this);
    this.setData({
      displayActivities: this.data.displayActivities
    });
  },

  intervalTimeChanged: function(value) {
    console.log(value);
    this.data.displayActivities = [];
    this.data.option2Value = value.detail;
    this.filterActivities(this);
    this.checkCanIOpenDisplayActivities(this);
    this.setData({
      displayActivities: this.data.displayActivities
    });
  },

  convertOption1ValueToRealData: function(option1Value) {
    var distance = 0;
    switch (option1Value) {
      case 0:
        {
          distance = 0;
          break;
        }
      case 1:
        {
          distance = 1;
          break;
        }
      case 2:
        {
          distance = 5;
          break;
        }
      case 3:
        {
          distance = 10;
          break;
        }
    }
    return distance;
  },

  convertOption2ValueToRealData: function(option2Value) {
    var intervalTime = 0;
    let oneDayTime = 24 * 60 * 60 * 1000;
    switch (option2Value) {
      case 'a':
        {
          intervalTime = 0;
          break;
        }
      case 'b':
        {
          intervalTime = 3 * oneDayTime;
          break;
        }
      case 'c':
        {
          intervalTime = 7 * oneDayTime;
          break;
        }
      case 'd':
        {
          intervalTime = 15 * oneDayTime;
          break;
        }
    }
    return intervalTime;
  },

  getCurrentCoordinate: function(_this) {
    wx.getLocation({
      success: function(res) {
        console.log(res);
        _this.data.currentCoordinate.longitude = res.longitude;
        _this.data.currentCoordinate.latitude = res.latitude;
      },
      fail: function(res) {
        console.log(res);
      },
      complete: function(res) {
        _this.queryAllActivities(_this);
      }
    })
  },
})