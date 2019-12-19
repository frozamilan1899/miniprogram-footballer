// detail.js
const app = getApp();
var util = require('../../common-js/util.js');

Page({

  data: {
    news: {},
    url: ""
  },

  onLoad: function (options) {
    console.log(options);
    if ('index' in options) {
      // 显示胶囊按键里的“转发”按钮
      wx.showShareMenu({
        withShareTicket: true
      });
      // 从缓存中获取新闻数据
      var newsList = wx.getStorageSync(app.globalData.newsInfoKey);
      var index = parseInt(options.index);
      this.data.news = newsList[index];
      console.log(this.data.news);
      // 加载web-view
      this.data.url = this.data.news.url;
      this.setData({
        url: this.data.news
      });
    } else {
      // 隐藏胶囊按键里的“转发”按钮
      wx.hideShareMenu({});
      // 加载web-view
      this.data.url = options.url;
      this.setData({
        url: this.data.url
      });
    }
  },

  onShareAppMessage: function (option) {
    console.log(option);
    var shareTitle = this.data.news.title;
    var sharePath = "/pages/detail/detail?url=" + this.data.news.url;
    return {
      title: shareTitle,
      imageUrl: "http:" + this.data.news.picUrl,
      path: sharePath,
      success: function (res) {
        console.log(res);
      },
      fail: function (res) {
        console.log(res);
      }
    }
  }
})