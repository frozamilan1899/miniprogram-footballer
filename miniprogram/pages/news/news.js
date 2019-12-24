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
          // 替换url中的http为https
          // var tmpList = [];
          // for (let index = 0; index < _this.data.news.length; index++) {
          //   var item = _this.data.news[index];
          //   item.url = item.url.replace("http", "https");
          //   tmpList.push(item);
          // }
          // _this.data.news = tmpList;
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
  }, 

  itemClick: function(e) {
    console.log(e);
    var index = parseInt(e.currentTarget.dataset.index);
    var paster = this.data.news[index].url;
    var that = this;
    wx.setClipboardData({
      data: paster,
      success: function() {
        wx.showModal({
          title: '提示',
          content: '已将链接地址复制到剪贴板：\r\n' + paster + '\r\n可在其他浏览器内打开查看',
          cancelText: '好的',
          confirmText: '知道了',
          success(res) {}
        });
      }
    })
  },
})