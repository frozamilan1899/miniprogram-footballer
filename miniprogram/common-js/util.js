// util.js

function getSubStrBylen(str, len) {
  var subStr = '';
  if (!str) return subStr;
  if (str.length <= len) {
    return str;
  } else {
    subStr = str.substr(0, len) + '...';
  }
  return subStr;
}

function get_object_all_attribute(data) {
  var all_attribute_value = [];
  for (var key in data)
    all_attribute_value.push(data[key]);
  return all_attribute_value;
}

//删除左右两端的空格
function trim(str) { 
  return str.replace(/(^\s*)|(\s*$)/g, "");
}
//删除左边的空格
function ltrim(str) { 
  return str.replace(/(^\s*)/g, "");
}
//删除右边的空格
function rtrim(str) { 
  return str.replace(/(\s*$)/g, "");
}

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
  var retDate = new Date(year, month - 1, day, hour, minute, 0);
  return retDate.getTime();
}

function formatDate(date, fmt) {
  // 获取年份
  if (/(y+)/.test(fmt)) {
    fmt = fmt.replace(
      RegExp.$1,  //匹配到的结果yyyy，替换成后面的内容
      (date.getFullYear() + "").substr(4 - RegExp.$1.length) //(date.getFullYear() + "") 2019 + + "" 表示将数字转换成字符串
      //substr表示截取几位，假如传过来的是两位yy，就将2019截取4-2位成了19
    );
  }
  let o = {
    "M+": date.getMonth() + 1,
    "d+": date.getDate(),
    "h+": date.getHours(),
    "m+": date.getMinutes(),
    "s+": date.getSeconds()
  };
  for (let k in o) {
    if (new RegExp(`(${k})`).test(fmt)) {
      let str = o[k] + "";
      fmt = fmt.replace(
        RegExp.$1,
        RegExp.$1.length === 1 ? str : padLeftZero(str)
      );
    }
  }
  return fmt;
}

//小时分钟秒不足两位的话用00补位，然后str.length
function padLeftZero(str) { 
  //假如是04：0004 截取两位 04
  //假如是4：004 截取一位：04
  return ("00" + str).substr(str.length);
}

module.exports = {
  getSubStrBylen: getSubStrBylen,
  get_object_all_attribute: get_object_all_attribute,
  trim: trim,
  ltrim: ltrim,
  rtrim: rtrim,
  showToast: showToast,
  convertDateFromString: convertDateFromString,
  formatDate: formatDate
}