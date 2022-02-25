// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()

const db = cloud.database();
const _ = db.command;
// 云函数入口函数
exports.main = async (event, context) => {
  console.log(event);
  try {
    return await db.collection('activities').doc(event.id).update({
      data: {
        signUpList: _.set(event.signUpList),
        askForLeaveList: _.set(event.askForLeaveList),
        updateTime: event.updateTime,
        referredOpenIds: _.set(event.referredOpenIds)
      }
    })
  } catch (e) {
    console.error(e);
  }
}