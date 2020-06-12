// nearby.js
const app = getApp();
const db = app.globalData.db;
const _ = db.command;

var util = require('../../common-js/util.js');

Page({

  data: {
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
    allMatches: [],
    displayMatches: [],
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
      this.queryAllMatches(this);
    }
  },

  onHide: function() {
    this.data.dataLoaded = false;
  },

  onUnload: function() {
    this.data.allMatches = [];
    this.data.displayMatches = [];
    this.data.dataLoaded = false;
  },

  queryAllMatches: function(_this) {
    // 如果没有指定limit，则默认且最多取20条记录
    var currentTime = (new Date()).getTime();
    db.collection(app.globalData.dbName).where({
      time: _.gte(currentTime)
    }).orderBy('time', 'asc').get({
      success: res => {
        console.log(res.data);
        _this.data.allMatches = res.data;
        _this.createMiddleData(_this);
        _this.filterMatches(_this);
        _this.checkCanIOpenDisplayMatches(_this);
        _this.setData({
          displayMatches: _this.data.displayMatches
        });
        _this.data.dataLoaded = true;
      },
      fail: err => {
        console.error(err);
      }
    });
  },

  createMiddleData: function(_this) {
    _this.data.middleDataArray = [];
    var currentTime = (new Date()).getTime();
    for (let i = 0; i < _this.data.allMatches.length; i++) {
      let match = _this.data.allMatches[i];
      let distToLoc = util.getDistance(_this.data.currentCoordinate.latitude, _this.data.currentCoordinate.longitude, match.location.latitude, match.location.longitude);
      let intervalToNow = match.time - currentTime;
      var middleData = {
        id: match._id,
        distToLoc: distToLoc,
        intervalToNow: intervalToNow,
      };
      _this.data.middleDataArray.push(middleData);
      _this.data.allMatches[i].distToLoc = distToLoc.toFixed(2);
    }
  },

  filterMatches: function(_this) {
    // 转换选项值
    var distance = _this.convertOption1ValueToRealData(_this.data.option1Value);
    var intervalTime = _this.convertOption2ValueToRealData(_this.data.option2Value);
    var tmpMatchIds = [];
    if (0 == distance && 0 == intervalTime) {
      _this.data.displayMatches = _this.data.allMatches;
    } else {
      // 核心过滤
      for (let i = 0; i < _this.data.middleDataArray.length; i++) {
        let middleData = _this.data.middleDataArray[i];
        if (0 == distance) {
          if (intervalTime >= middleData.intervalToNow) {
            tmpMatchIds.push(middleData.id);
          }
        }
        else if (0 == intervalTime) {
          if (distance >= middleData.distToLoc) {
            tmpMatchIds.push(middleData.id);
          }
        }
        else {
          if (distance >= middleData.distToLoc && intervalTime >= middleData.intervalToNow) {
            tmpMatchIds.push(middleData.id);
          }
        }
      }
      // 组装displayMatches
      for (let i = 0; i < tmpMatchIds.length; i++) {
        let matchId = tmpMatchIds[i];
        for (let j = 0; j < _this.data.allMatches.length; j++) {
          let match = _this.data.allMatches[j];
          if (matchId == match._id) {
            _this.data.displayMatches.push(match);
            break;
          }
        }
      }
    }
  },

  checkCanIOpenDisplayMatches: function(_this) {
    for (let i = 0; i < _this.data.displayMatches.length; i++) {
      let displayMatch = _this.data.displayMatches[i];
      if (-1 == displayMatch.referredOpeneIds.indexOf(app.globalData.openid)) {
        _this.data.displayMatches[i].canOpen = false;
        _this.data.displayMatches[i].navigatePage = '';
      } else {
        _this.data.displayMatches[i].canOpen = true;
        _this.data.displayMatches[i].navigatePage = '../edit/edit?id=' + displayMatch._id;
      }
    }
  },

  distanceChanged: function(value) {
    console.log(value);
    this.data.displayMatches = [];
    this.data.option1Value = value.detail;
    this.filterMatches(this);
    this.checkCanIOpenDisplayMatches(this);
    this.setData({
      displayMatches: this.data.displayMatches
    });
  },

  intervalTimeChanged: function(value) {
    console.log(value);
    this.data.displayMatches = [];
    this.data.option2Value = value.detail;
    this.filterMatches(this);
    this.checkCanIOpenDisplayMatches(this);
    this.setData({
      displayMatches: this.data.displayMatches
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
        _this.queryAllMatches(_this);
      }
    })
  },
})