const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

App({

  globalData: {
    db: new Object(),
    openid: "",
    previousActivitiesInfoKey: "previousActivitiesInfo",
    sharePicUrlKey: "sharePicUrl",
    sceneIdList: [1007, 1008, 1014, 1017, 1037, 1044, 1096],
    shared: false,
    needAuthMsg: false,
    avatarUrl: ''
  },

  onLaunch: function (options) {
    let option = JSON.stringify(options);
    console.log('app onLaunch option-----' + option);
    this.onJudgeEntryScene(option.scene);

    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      wx.showModal({
        title: '提示',
        content: '基础库2.2.3版本以上才能使用云能力，请升级微信客户端',
        showCancel: false,
        confirmText: '确定'
      })
    } else {
      // 云开发初始化
      wx.cloud.init({
        env: "footballer-tiny-nakea",
        traceUser: true
      });
      
      // 初始化云数据库对象
      this.globalData.db = wx.cloud.database();
      // 初始化默认头像url
      this.globalData.avatarUrl = defaultAvatarUrl;

      // 调用云函数获取openid
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
    }
  },

  onShow: function (options) {
    let option = JSON.stringify(options);
    console.log('app onShow option-----' + option);
    this.onJudgeEntryScene(option.scene);
    this.checkIfNeedAuthMsg(option.scene);
  },

  onJudgeEntryScene: function(sceneId) {
    //从转发场景进入, sceneIdList包含所有转发场景值
    if (-1 != this.globalData.sceneIdList.indexOf(sceneId)) {
      this.globalData.shared = true;
    } else {
      this.globalData.shared = false;
    }
  },

  checkIfNeedAuthMsg: function(sceneId) {
    console.log('check if need auth message');
    if (sceneId == '1014') {
      console.log('yes, auth');
      this.globalData.needAuthMsg = true;
    } else {
      console.log('no, skip');
      this.globalData.needAuthMsg = false;
    }
  }
})