// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()

const db = cloud.database();
// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  console.log(event);
  try {
    return await db.collection('matches').doc(event.id).update({
      data: {
        signUpList: event.signUpList,
        askForLeaveList: event.askForLeaveList,
        updateTime: event.updateTime,
        referredOpeneIds: event.referredOpeneIds
      }
    })
  } catch (e) {
    console.error(e);
  }
}