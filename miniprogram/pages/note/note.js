const app = getApp();
var util = require('../../common-js/util.js');
const db = app.globalData.db;

import Notify from '../../miniprogram_npm/@vant/weapp/notify/notify';

Page({

  data: {
    nameNote: '',
    recordId: '',
    previousPage: ''
  },

  onLoad: function (options) {
    if ('from' in options) {
      this.data.previousPage = options.from;
    }
    this.queryNoteRecord(this);
  },

  onUnload: function () {
    this.data.nameNote = '';
    this.data.recordId = '';
    this.data.previousPage = '';
  },

  setNameNoteInput: function (event) {
    var inputStr = event.detail;
    if (inputStr && inputStr.length > 0) {
      this.data.nameNote = util.trim(inputStr);
    } else {
      this.data.nameNote = '';
    }
  },

  queryNoteRecord: function (_this) {
    console.log("query note record");
    if ('mine' == _this.data.previousPage) {
      wx.showLoading({
        title: '加载中...',
      });
    }
    db.collection("notes").where({
      _openid: app.globalData.openid
    }).get({
      success: function (res) {
        console.log(res);
        if (res.data.length > 0) {
          _this.data.recordId = res.data[0]._id;
          _this.data.nameNote = res.data[0].nameNote;
          _this.setData({
            nameNote: _this.data.nameNote
          });
        }
      },
      fail: function (res) {
        console.log(res);
      },
      complete: function (res) {
        console.log(res);
        if ('mine' == _this.data.previousPage) {
          wx.hideLoading();
        }
      }
    });
  },

  saveAndNaviback: function() {
    if ('' === this.data.nameNote) {
      this.notify('danger', '请填写名称备注');
      return;
    }
    
    if ('' === this.data.recordId) {
      this.data.recordId = app.globalData.openid;
    }
    wx.showLoading({
      title: '保存中...',
    });
    var that = this;
    db.collection('notes').doc(that.data.recordId).set({
      data: {
        nameNote: that.data.nameNote
      },
      success: function (res) {
        console.log(res);
        if ('editActivity' == that.data.previousPage) {
          let pages = getCurrentPages();
          if (pages.length >= 2) {
            let prevPage = pages[pages.length - 2];
            prevPage.data.nameNote = that.data.nameNote;
          }
        }
        if ('mine' == that.data.previousPage) {
          let pages = getCurrentPages();
          if (pages.length >= 2) {
            let prevPage = pages[pages.length - 2];
            prevPage.data.nameNote = that.data.nameNote;
          }
        }
      },
      fail: function (res) {
        console.log(res);
      },
      complete: function (res) {
        console.log(res);
        wx.hideLoading();
        wx.navigateBack({
          delta: 1
        });
      }
    });
  },

  deleteAndNaviback: function () {
    if ('' === this.data.recordId) {
      this.data.recordId = app.globalData.openid;
    }
    wx.showLoading({
      title: '删除中...',
    });
    var that = this;
    db.collection('notes').doc(that.data.recordId).remove({
      success: function (res) {
        console.log(res);
        that.data.nameNote = '';
        if ('mine' == that.data.previousPage) {
          let pages = getCurrentPages();
          if (pages.length >= 2) {
            let prevPage = pages[pages.length - 2];
            prevPage.data.nameNote = '我的备注';
          }
        }
      },
      fail: function (res) {
        console.log(res);
      },
      complete: function (res) {
        console.log(res);
        wx.hideLoading();
        wx.navigateBack({
          delta: 1
        });
      }
    });
  },

  notify: function(tp, msg) {
    Notify({
      type: tp,
      message: msg,
      duration: 2000
    });
  },
})