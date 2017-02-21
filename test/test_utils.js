exports.restore = function(objs) {
  objs.forEach(function(obj) {
    if (obj.restore) {
      obj.restore();
    }
  });
};
