// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()

const db = cloud.database()
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  try {
    let currentTime = (new Date()).getTime();
    return await db.collection('news').where({
      timestamp: _.lt(currentTime)
    }).remove();
  } catch (e) {
    console.error(e)
  }
}