// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()

const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  console.log(event);
  try {
    return await db.collection('authorizations').where({
      _openid: _.eq(event.openid)
    }).update({
      data: {
        state: event.state
      }
    });
  } catch (e) {
    console.error(e);
  }
}