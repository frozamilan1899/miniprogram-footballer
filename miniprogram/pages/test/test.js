// miniprogram/pages/test/test.js
var detailList = [
  { datetime: '2017-01-01 17:00', count: 100, unit: 'ml', type: '开水', remark: '哈哈哈哈' },
  { datetime: '2017-01-01 17:01', count: 100, unit: 'ml', type: '开水' },
  { datetime: '2017-01-01 17:02', count: 100, unit: 'ml', type: '开水' }
];
var recordStartX = 0;
var currentOffsetX = 0;
Page(
  {
    data: {
      detailList: detailList
    }
    ,
    recordStart: function (e) {
      recordStartX = e.touches[0].clientX;
      currentOffsetX = this.data.detailList[0].offsetX;
      console.log('start x ', recordStartX);
    }
    ,
    recordMove: function (e) {
      var detailList = this.data.detailList;
      var item = detailList[0];
      var x = e.touches[0].clientX;
      var mx = recordStartX - x;
      console.log('move x ', mx);

      var result = currentOffsetX - mx;
      if (result >= -80 && result <= 0) {
        item.offsetX = result;
      }
      this.setData({
        detailList: detailList
      });
    }
    ,
    recordEnd: function (e) {
      var detailList = this.data.detailList;
      var item = detailList[0];
      console.log('end x ', item.offsetX);

      if (item.offsetX < -40) {
        item.offsetX = -80;

      } else {
        item.offsetX = 0;

      }
      this.setData({
        detailList: detailList
      });
    }

  }
);