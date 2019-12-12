//app.js
App({

  globalData: {
    dbName: "matches",
    openid: "",
    sceneInfo: [],
    publisher: true
  },

  onLaunch: function () {
    
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      // 云开发初始化
      wx.cloud.init({
        env: "footballer-tiny-nakea",
        traceUser: true,
      })
    }

    // 获取openid
    wx.cloud.callFunction({
      name: 'login'
    }).then(res => {
      console.log('[云函数] [login] user openid: ', res.result.openid)
      this.globalData.openid = res.result.openid
      if (this.CallbackFn) {
        this.CallbackFn(res.result.openid)
      }
    }).catch(err => {
      console.error(err)
    })
  },

  onShow: function (options) {
    let option = JSON.stringify(options);
    console.log('app.js option-----' + option)
    console.log('app.js>>options.scene-----' + options.scene);
    var resultScene = this.sceneInfo(options.scene);
    console.log(resultScene);
  },

  //场景值判断
  sceneInfo: function (s) {
    var scene = [];
    switch (s) {
      case 1001:
        scene.push(s, "发现栏小程序主入口");
        break;
      case 1005:
        scene.push(s, "顶部搜索框的搜索结果页");
        break;
      case 1006:
        scene.push(s, "发现栏小程序主入口搜索框的搜索结果页");
        break;
      case 1007:
        scene.push(s, "单人聊天会话中的小程序消息卡片");
        break;
      case 1008:
        scene.push(s, "群聊会话中的小程序消息卡片");
        break;
      case 1011:
        scene.push(s, "扫描二维码");
        break;
      case 1012:
        scene.push(s, "长按图片识别二维码");
        break;
      case 1014:
        scene.push(s, "手机相册选取二维码");
        break;
      case 1020:
        scene.push(s, "公众号profile页相关小程序列表");
        break;
      case 1022:
        scene.push(s, "聊天顶部置顶小程序入口");
        break;
      case 1023:
        scene.push(s, "安卓系统桌面图标");
        break;
      case 1024:
        scene.push(s, "小程序profile页");
        break;
      case 1026:
        scene.push(s, "附近小程序列表");
        break;
      case 1027:
        scene.push(s, "顶部搜索框搜索结果页“使用过的小程序”列表");
        break;
      case 1047:
        scene.push(s, "扫描小程序码");
        break;
      case 1048:
        scene.push(s, "长按图片识别小程序码");
        break;
      case 1049:
        scene.push(s, "手机相册选取小程序码");
        break;
      case 1053:
        scene.push(s, "搜一搜的结果页");
        break;
      case 1054:
        scene.push(s, "顶部搜索框小程序快捷入口");
        break;
      case 1056:
      case 1089:
        scene.push(s, "微信聊天主界面下拉");
        break;
      case 1090:
        scene.push(s, "长按小程序右上角菜单唤出最近使用历史");
        break;
      default:
        scene.push("未知入口");
        break;
    }
    return scene;
  }
})
