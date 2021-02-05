const app = getApp();
const db = app.globalData.db;

import Notify from '../../miniprogram_npm/@vant/weapp/notify/notify';

Page({

  data: {
    locations:[],
    location: {
      longitude: 108.95000,
      latitude: 34.26667,
      name: '',
      address: ''
    },
    previousPage: ''
  },

  onLoad: function (options) {
    if ('from' in options) {
      this.data.previousPage = options.from;
    }
    this.queryLocationRecord(this);
  },

  onUnload: function () {
    this.data.locations = [];
    this.data.location = {}
    this.data.previousPage = '';
  },

  onPullDownRefresh: function () {
    _this.queryLocationRecord(_this);
  },

  notify: function (tp, msg) {
    Notify({
      type: tp,
      message: msg,
      duration: 2000
    });
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
        this.deleteLocationRecord(this, dataIndex, true, instance);
        break;
    }
  },

  toPreviousPage: function(e) {
    console.log(e);
    if ('right' === e.detail) return;
    if ('left' === e.detail) return;
    if ('outside' === e.detail) return;

    if ('editActivity' === this.data.previousPage) {
      var dataIndex = parseInt(e.target.dataset.index);
      var location = this.data.locations[dataIndex];
      let pages = getCurrentPages();
      if (pages.length >= 2) {
        let prevPage = pages[pages.length - 2];
        prevPage.setData({
          location: location.location,
        });
      }
      // 延迟0.5秒返回
      setTimeout(() => {
        wx.navigateBack({
          delta: 1
        })
      }, 500);
    }
  },

  resetLocationList: function(_this) {
    _this.queryLocationRecord(_this);
  },

  chooseLocation: function (e) {
    var that = this;
    wx.chooseLocation({
      success: function (res) {
        console.log(res);
        that.data.location.longitude = res.longitude;
        that.data.location.latitude = res.latitude;
        that.data.location.name = res.name;
        that.data.location.address = res.address;
        that.storeLocationRecord(that, that.data.location, true);
      },
      fail: function (res) {
        console.log(res);
      }
    })
  },

  queryLocationRecord: function (_this) {
    console.log("query location record");
    wx.showLoading({
      title: '加载中...',
    });
    db.collection("locations").where({
      _openid: app.globalData.openid
    }).get({
      success: function (res) {
        console.log(res);
        _this.data.locations = res.data;
        _this.setData({
          locations: _this.data.locations
        });
      },
      fail: function (res) {
        console.log(res);
      },
      complete: function (res) {
        console.log(res);
        wx.hideLoading();
      }
    });
  },

  storeLocationRecord: function (_this, location, resetUI) {
    console.log("store location record");
    db.collection("locations").add({
      data: {
        location: location
      },
      success: function (res) {
        console.log(res);
        _this.notify('primary', '位置添加成功');
        if (resetUI) {
          _this.resetLocationList(_this);
        }
      }
    });
  },

  updateLocationRecord: function (_this, location, resetUI) {
    console.log("update location record");
    db.collection("locations").where({
      _openid: app.globalData.openid
    }).update({
      data: {
        location: location
      },
      success: function (res) {
        console.log(res);
        if (resetUI) {
          _this.resetLocationList(_this);
        }
      }
    });
  },

  deleteLocationRecord: function (_this, dataIndex, resetUI, instance) {
    console.log("delete location record");
    var location = _this.data.locations[dataIndex];
    db.collection("locations").doc(location._id).remove({
      success: function (res) {
        console.log(res);
        _this.notify('primary', '位置删除成功');
        if (resetUI) {
          _this.resetLocationList(_this);
        }
      },
      complete: function () {
        instance.close();
      }
    });
  },
})