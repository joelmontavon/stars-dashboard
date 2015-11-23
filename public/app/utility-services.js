var services = angular.module('utilityServices', []);
services.factory("d3", function() {
  return window.d3;
});
services.factory("tip", ["d3", 
  function(d3) {
    var t = d3.tip()
      .attr('class', 'd3-tip')
      .direction('n')
      .offset([-5, 0]);
    return t;
  }
]);
services.factory("_", function() {
  return window._;
});