// news.js
const app = getApp();
var util = require('../../common-js/util.js');
const db = app.globalData.db;

import Dialog from '../../miniprogram_npm/@vant/weapp/dialog/dialog';

Page({

  data: {
    news: [],
    parameters: ""
  },

  onLoad: function (options) {
    this.queryNews();
  },

  onShow: function () {
    console.log("news->onShow");
  },

  onPullDownRefresh: function () {
    console.log("news->onPullDownRefresh");
    this.queryNews();
  },

  onReachBottom: function () {
    console.log("news->onReachBottom");
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

          // 将新闻数据缓存入云数据库
          _this.cacheNews(_this.data.news);
        }
      },
      fail(res) {
        console.log(res);
      },
      complete(res) {
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

  itemClick: function(e) {
    console.log(e);
    var index = parseInt(e.currentTarget.dataset.index);
    var paster = this.data.news[index].url;
    wx.setClipboardData({
      data: paster,
      success: function() {
        Dialog.alert({
          message: '由于个人版微信小程序的开放限制，已将链接地址复制到剪贴板：\r\n' + paster + '\r\n请在其他浏览器内打开查看',
        }).then(() => {});
      }
    })
  },

  cacheNews: function(e) {
    console.log('remove news');
    // 调用云函数删除
    wx.cloud.callFunction({
      name: 'remove_news',
      success: function (res) {
        console.log('[云函数] [remove_news]: ', res);
        let newsMap = {};
        newsMap['newslist'] = e;
        let currentTime = (new Date()).getTime();
        newsMap['timestamp'] = currentTime;
        console.log('add news');
        db.collection('news').add({
          data: newsMap
        });
      }
    });
  },

  queryNews: function(e) {
    const _ = db.command;
    console.log('query news');
    var that = this;
    db.collection('news').get({
      success: function (res) {
        console.log(res.data);
        if (res.data.length > 0) {
          console.log(res.data[0].timestamp);
          let currentTime = (new Date()).getTime();
          let hour6Time = 6 * 60 * 60 * 1000;
          if (currentTime - res.data[0].timestamp > hour6Time) {
            that.loadNews(that);
          } else {
            that.data.news = res.data[0].newslist;
            that.setData({
              news: that.data.news
            });
          }
        } else {
          that.loadNews(that);
        }
      }
    });
  }
})