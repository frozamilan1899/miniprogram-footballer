// maps.js
var app = getApp()

Page({

  data: {
    longitude: 0.0,
    latitude: 0.0,
    name: '',
    address: '',
    markers: [],
  },

  onLoad: function (options) {
    //获取当前位置
    this.getLocation();
  },

  getLocation: function(e) {
    var that = this;
    wx.getLocation({
      success: function(res) {
        console.log(res);
        that.data.longitude = res.longitude;
        that.data.latitude = res.latitude;
        console.log(that.data);
        that.setData({
          longitude: that.data.longitude,
          latitude: that.data.latitude
        });
      },
    })
  },

  chooseLocation: function(e) {
    var that = this;
    wx.chooseLocation({
      success: function(res) {
        console.log(res);
        that.data.longitude = res.longitude;
        that.data.latitude = res.latitude;
        that.data.name = res.name;
        that.data.address = res.address;
        var markers = [{
          iconPath: "../../images/marker_01.png",
          id: 0,
          latitude: that.data.latitude,
          longitude: that.data.longitude,
          width: 25,
          height: 40
        }];
        that.data.markers = markers;
        console.log(that.data);
        that.setData({
          longitude: that.data.longitude,
          latitude: that.data.latitude,
          name: that.data.name,
          address: that.data.address,
          markers: that.data.markers
        });
      },
    })
  },

  toEditPage: function(e) {
    if (this.data.name === '' && this.data.address === '') {
      this.showToast("提示", "还没有选择位置", false);
      return;
    }

    let pages = getCurrentPages();
    let prevPage = pages[pages.length - 2];
    //把需要回传的值保存到上一个页面
    var matchInfo = prevPage.data.matchInfo;
    matchInfo.location.longitude = this.data.longitude;
    matchInfo.location.latitude = this.data.latitude;
    matchInfo.location.name = this.data.name;
    matchInfo.location.address = this.data.address;
    var markers = [{
      iconPath: "../../images/marker_01.png",
      id: 0,
      latitude: this.data.latitude,
      longitude: this.data.longitude,
      width: 25,
      height: 40
    }];
    prevPage.setData({   
      matchInfo: matchInfo,
      markers: markers
    });
    
    // 返回上一级页面
    wx.navigateBack({
      delta: 1
    })
  },

  showToast: function (title, content, showCancel) {
    wx.showModal({
      title: title,
      content: content,
      showCancel: showCancel
    })
  },
})