//app.js
App({

  globalData: {
    dbName: "matches",
    openid: "",
    sceneId: "",
    previousMatchesInfoKey: "previousMatchesInfo",
    sceneIdList: [1007, 1008],
    shared: false
  },

  onLaunch: function (options) {
    
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      // 云开发初始化
      wx.cloud.init({
        env: "footballer-tiny-nakea",
        traceUser: true
      });
    }

    // 获取openid
    wx.cloud.callFunction({
      name: 'login'
    }).then(res => {
      console.log('[云函数] [login] user openid: ', res.result.openid);
      this.globalData.openid = res.result.openid;
      if (this.CallbackFn) {
        this.CallbackFn(res.result.openid);
      }
    }).catch(err => {
      console.error(err);
    });

    let option = JSON.stringify(options);
    console.log('app onLaunch option-----' + option);
    this.globalData.sceneId = options.scene;
    //从转发场景进入
    if (-1 != this.globalData.sceneIdList.indexOf(this.globalData.sceneId)) {
      this.globalData.shared = true;
    }
  },

  onShow: function (options) {
    let option = JSON.stringify(options);
    console.log('app onShow option-----' + option);
  },
})