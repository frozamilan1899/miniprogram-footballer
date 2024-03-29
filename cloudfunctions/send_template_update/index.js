// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  console.log(event);
  try {
    var pagePath = event.page + event.parameter;
    const result = await cloud.openapi.subscribeMessage.send({
      touser: event.openid,
      page: pagePath,
      data: {
        thing1: {
          value: event.subject
        },
        date2: {
          value: event.showTime
        },
        thing4: {
          value: event.detail
        },
        number8: {
          value: event.signUpCount
        },
        thing5: {
          value: event.position
        }
      },
      templateId: '9pBjK8fdwRqcjTXBvgL7ueMpQnSiq_xvw8caYB08hTg'
    });
    console.log(result);
    return result;
  } catch (err) {
    console.log(err);
    return err;
  }
}