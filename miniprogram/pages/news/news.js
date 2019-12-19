// news.js
const app = getApp();
var util = require('../../common-js/util.js');

Page({

  data: {
    news: [],
    parameters: ""
  },

  onLoad: function (options) {
    this.loadNews(this);
  },

  onShow: function () {
    console.log("news->onShow");
  },

  onPullDownRefresh: function () {
    console.log("news->onPullDownRefresh");
    this.loadNews(this);
  },

  onReachBottom: function () {
    console.log("news->onReachBottom");
    // util.showToast("没有更多新闻了");
  },

  loadNews: function(_this) {
    wx.showLoading({
      title: '加载中...',
    });
    wx.request({
      url: 'https://api.tianapi.com/football/index',
      data: {
        key: "79d39e9bcd7dba2365fe0f1ac8c57b1d",
        num: 20,
        rand: 1
      },
      header: {
        'content-type': 'application/json;charset=utf-8'
      },
      success(res) {
        console.log(res);
        if (res.data.code == 200) {
          _this.data.news = res.data.newslist;
          _this.setData({
            news: _this.data.news
          });

          // 缓存新闻数据
          wx.setStorage({
            key: app.globalData.newsInfoKey,
            data: _this.data.news
          })
        }
        wx.hideLoading();
        wx.stopPullDownRefresh();
      },
      fail(res) {
        console.log(res);
        wx.hideLoading();
        wx.stopPullDownRefresh();
      }
    });
  }
})