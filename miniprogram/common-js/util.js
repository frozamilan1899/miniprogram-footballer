// util.js

function showToast(content) {
  wx.showToast({
    icon: 'none',
    title: content,
  });
}

function convertDateFromString(dateString) {

  var components = dateString.split("/");
  var monthDay = components[0];
  var hourMinute = components[1];
  var month = (monthDay.split("-"))[0];
  var day = (monthDay.split("-"))[1];
  var hour = (hourMinute.split(":"))[0];
  var minute = (hourMinute.split(":"))[1];
  var date = new Date();
  var year = null;
  if (month > date.getMonth()+1 + 1) { // 一般情况比赛最多提前一个月计划
    year = date.getFullYear()-1;
  } else {
    year = date.getFullYear();
  }
  console.log(year, month - 1, day, hour, minute);
  var retDate = new Date(year, month - 1, day, hour, minute, 0);
  console.log(retDate);
  return retDate.getTime();
}


module.exports = {
  showToast: showToast,
  convertDateFromString: convertDateFromString
}