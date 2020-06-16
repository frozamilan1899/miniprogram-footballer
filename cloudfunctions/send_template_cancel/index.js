// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  console.log(event);
  try {
    const result = await cloud.openapi.subscribeMessage.send({
      touser: event.openid,
      data: {
        thing1: {
          value: event.subject
        },
        date2: {
          value: event.showTime
        },
        thing3: {
          value: event.position
        }
      },
      templateId: 'GpsR26bk9DN8Z_oEQB2X0XiWtQRLj56oXaAKyqFDVjc'
    });
    console.log(result);
    return result;
  } catch (err) {
    console.log(err);
    return err;
  }
}