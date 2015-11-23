var controllers = angular.module('controllers', []);
controllers.controller('activityController', function($scope, d3, _, horBarChart) {
  $scope.options = [
    {name: 'Targeted', value: 'targeted', color: '8, 188, 228'},
    {name: 'Outreached', value: 'outreached', color: '125, 63, 152'},
    {name: 'Reached', value: 'reached', color:'122, 193, 67'},
    {name: 'Completed', value: 'completed', color:'0, 167, 142'},
    {name: 'Reach Rate', value: 'reachRate', color: '95, 120, 187'}
  ];
  $scope.selectedOptionVal = $scope.options[0].value;
  $scope.progData = [];
  var selectedOptionObj = $scope.options[0];
  $scope.selectedContract = 'all';

  var type = function(d) {
    d.targeted = +d.targeted;
    d.outreached = +d.outreached;
    d.reached = +d.reached;
    d.completed = +d.completed;
    return d;
  };
  
  var stateFn = function(tot, val) {
    tot[val.state] = tot[val.state] || {};
    tot[val.state]['targeted'] = tot[val.state]['targeted'] || {value: 0};
    tot[val.state]['targeted']['value'] += val['targeted'];
    tot[val.state]['outreached'] = tot[val.state]['outreached'] || {value: 0};
    tot[val.state]['outreached']['value'] += val['outreached'];
    tot[val.state]['reached'] = tot[val.state]['reached'] || {value: 0};
    tot[val.state]['reached']['value'] += val['reached'];
    tot[val.state]['completed'] = tot[val.state]['completed'] || {value: 0};
    tot[val.state]['completed']['value'] += val['completed'];
    tot[val.state]['reachRate'] = tot[val.state]['reachRate'] || {value: 0};
    tot[val.state]['reachRate']['value'] = tot[val.state]['reached']['value']/tot[val.state]['outreached']['value'];
    return tot;
  };
  
  var progFn = function(tot, val) {
    tot[val.program] = tot[val.program] || {};
    tot[val.program]['targeted'] = tot[val.program]['targeted'] || {value: 0};
    tot[val.program]['targeted']['value'] += val['targeted'];
    tot[val.program]['outreached'] = tot[val.program]['outreached'] || {value: 0};
    tot[val.program]['outreached']['value'] += val['outreached'];
    tot[val.program]['reached'] = tot[val.program]['reached'] || {value: 0};
    tot[val.program]['reached']['value'] += val['reached'];
    tot[val.program]['completed'] = tot[val.program]['completed'] || {value: 0};
    tot[val.program]['completed']['value'] += val['completed'];
    tot[val.program]['reachRate'] = tot[val.program]['reachRate'] || {value: 0};
    tot[val.program]['reachRate']['value'] = tot[val.program]['reached']['value']/tot[val.program]['outreached']['value'];
    return tot;
  };
  
  d3.csv("./data/activity.csv", type, function(rawData) {
    var map;
    $scope.contracts = rawData;
 
    var update = function () {
      var filteredData = rawData.filter(function (item) {
        return item.contract == ($scope.selectedContract == 'all' ? item.contract : $scope.selectedContract);
      });
      var mapData = d3.nest()
        .key(function(d) {
          return ($scope.selectedContract == 'all' ? $scope.selectedContract : d.contract);
        })
        .rollup(function(d) {
          return d.reduce(stateFn, {});
        })
        .entries(filteredData);
     
      $scope.progData = d3.nest()
        .key(function(d) {
          return d.program;
        })
        .rollup(function(d) {
          return d.reduce(progFn, {});
        })
        .entries(filteredData);
  
      var totals = d3.nest()
        .key(function(d) {
          return d.drug_category;
        })
        .rollup(function(d) {
          return d.reduce(function(tot, val) {
            tot += val[$scope.selectedOptionVal];
            return tot;
          }, 0);
        })
        .entries(filteredData);
      $scope.totals = {};
      for (var i = 0; i < totals.length; i++) {
        $scope.totals[totals[i]['key']] = totals[i]['values'];
      }
      
      $scope.progDataByTherapy = d3.nest()
        .key(function(d) {
          return d.program;
        })
        .rollup(function(d) {
          return d.reduce(function(tot, val) {
            tot[val.program] = tot[val.program] || {'Diabetes': {value: 0, pct: 0}, 'High Blood Pressure': {value: 0, pct: 0}, 'High Cholesterol': {value: 0, pct: 0}};
            tot[val.program][val.drug_category]['value'] += val[$scope.selectedOptionVal];
            tot[val.program][val.drug_category]['pct'] = tot[val.program][val.drug_category]['value']/$scope.totals[val.drug_category];
            return tot;
          }, {});
        })
        .entries(filteredData);

      var x = d3.scale.linear()
          .domain([
            _.min(_.filter(mapData[0].values, function (item) { return item[$scope.selectedOptionVal].value != 0;}), function (item) { return item[$scope.selectedOptionVal].value; })[$scope.selectedOptionVal]['value'], 
            _.max(mapData[0].values, function (item) { return item[$scope.selectedOptionVal].value; })[$scope.selectedOptionVal]['value']
          ])
          .range(['rgba(' + selectedOptionObj.color + ', 0)','rgba(' + selectedOptionObj.color + ', 1)']);
      var fills = {};
      _.forEach(mapData[0].values, function (val, key) {
        fills[key] = x(val[$scope.selectedOptionVal].value);
        val.fillKey = key;
      });
  
      var options = {
        scope: 'usa',
        element: document.getElementById('map'),
        projection: 'mercator',
        height: 500,
        //width: 700,
        fills: fills,
        data: mapData[0].values,
        geographyConfig: {
          popupTemplate: function(geo, data) {
            return ['<div class="d3-tip"><table><thead><tr><th>',
              geo.properties.name,
              '</th></tr></thead><tbody>',
              '<tr><td>Targeted: ',
              d3.format(",")(data.targeted.value),
              '</td></tr>',
              '<tr><td>Outreached: ',
              d3.format(",")(data.outreached.value),
              ' (' + d3.format('%')(data.outreached.value/data.targeted.value) + ")",
              '</td></tr>',
              '<tr><td>Reached: ',
              d3.format(",")(data.reached.value),
              ' (' + d3.format('%')(data.reached.value/data.outreached.value) + ")",
              '</td></tr>',
              '<tr><td>Completed: ',
              d3.format(",")(data.completed.value),
              ' (' + d3.format('%')(data.completed.value/data.reached.value) + ")",
              '</td></tr>',
              '</tbody></table>',
              '</div>'
            ].join('');
          },
          borderWidth:  1,
          borderColor: 'rgba(127, 127, 127, 1)',
          highlightFillColor: 'rgba(127, 127, 127, .5)',
          highlightBorderColor: 'rgba(127, 127, 127, 1)',
          highlightBorderWidth: 2
        }
      };
    
      if (map) d3.select('#map').html('');
      map = new Datamap(options);
      //map.labels({fontFamily: 'Calibri'});
      
      var barChartData = d3.nest()
        .key(function(d) {
          return d.state;
        })
        .rollup(function(d) {
          return d.reduce(function(tot, val) {
            tot += val[$scope.selectedOptionVal];
            return tot;
          }, 0);
        })
        .entries(filteredData)
        .sort(function(a, b) {
          if (a.values < b.values)
            return 1;
          if (a.values > b.values)
            return -1;
          return 0;
        });
      
      horBarChart(barChartData, "#activity-bar-chart", {
        yColumn: "key",
        xColumn: "values",
        domain: [d3.max(barChartData, function (item) { return item.values}), 0],
        xAxis: d3.format(","),
        mouseover: function (d) { 
          return ['<div><strong>',
            d.item,
            '</strong></div>',
            '<div>',
            selectedOptionObj.name,
            ': ',
            d3.format(",")(d.values),
            '</div>'].join('');
        },
        color: function (d) {
          return x(d.values);
        }
      });
    };
    
    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
      update();
      $scope.$apply();
    });
    $scope.selectChanged = function() {
  	  selectedOptionObj = _.find($scope.options, function (item) {
  	    return item.value == $scope.selectedOptionVal;
  	  });
  	  update();
  	};
  });
});

controllers.controller('contractsController', function($scope, $rootScope, d3, _, dataService, contractDataService, donutChart, table, lineChart, vertStackedBarChart) {
  var colors = ['#2c9c69', '#dbba34', '#c62f29'];
  $scope.preConsolidation = 'true';
  $scope.includeConsolidated = false;
  $scope.contract = 'H5521';
  dataService.get().then(function (sourceData) {
    $scope.update = function() {
      var data = contractDataService(sourceData, 10, $scope.contract, $scope.preConsolidation == 'true', $scope.includeConsolidated);
      donutChart(data.donutChart, '#contracts-donut', {
        colors: function(d) {
          if (d.data.key == "0") {
            return colors[2];
          } else if (d.data.key == "3") {
            return colors[0];
          } else {
            return colors[1];
          }
        },
        click: function(d) {
          var chart = d3.select('#contracts-donut');
          var label = chart.select(".inner-label");
          if (label.text() == d.data.values.pct) {
            table(data.table, sourceData, '#contracts-table');
            label.text(function() {
              return '';
            });
          } else {
            table(data.table.filter(function(e) {
              return d.data.key == e.values.measuresAtFourStarsBand;
            }), sourceData, '#contracts-table');
            label.text(function() {
              return d.data.values.pct;
            })
          }
        }
      });
      table(data.table, sourceData, '#contracts-table');
      lineChart(data.lineChart, "#contracts-line-chart");
      vertStackedBarChart(data.lineChart, '#contracts-bar-chart');
      //$rootScope.$broadcast('includeConsolidatedToMeasures', $scope.includeConsolidated);
    };
    $scope.$on('contractChanged', function (event, data) {
      $scope.contract = data;
      $scope.update();
    });
    /*$scope.$on('includeConsolidatedToContracts', function (event, data) {
      $scope.includeConsolidated = data;
      $scope.update();
    });*/
    $scope.update();
  });
});

controllers.controller('measuresController', function($scope, $rootScope, d3, _, dataService, measureDataService, horBarChart, donutChart) {
  dataService.get().then(function (sourceData) {
    var month = 10;
    var colors = ['#c62f29', '#2c9c69'];
    $scope.options = [
      {name: 'Diabetes', value: 'oad'}, 
      {name: 'RASA', value: 'rasa'}, 
      {name: 'Statin', value: 'statins'}
    ];
    $scope.threshold = 'cutpoint';
    $scope.thresholds = {
      cutpoint: {
        title: '4-Stars',
        good: 'At or Above 4-Stars',
        bad: 'Below 4-Stars'
      },
      goal: {
        title: 'Goal',
        good: 'At or Above Goal',
        bad: 'Below Goal'
      }
    }
    $scope.selectedTherapy = $scope.options[0].value;
    $scope.includeConsolidated = false;
    
    $scope.update = function () {
      var data = measureDataService(sourceData, month, $scope.selectedTherapy, $scope.includeConsolidated, $scope.threshold);
      horBarChart(data.barChart, "#measures-bar-chart", {
        threshold: $scope.threshold, 
        mouseover: function (d) { 
          return ['<div><strong>',
            d.contract,
            '</strong></div>',
            '<div>Projected Score: ',
            d3.format("%")(d.score),
            '</div>',
            '<div>Projected 4-Star Cutpoint: ',
            d3.format("%")(d.goal),
            '</div>',
            '<div>Goal: ',
            d3.format("%")(d.cutpoint),
            '</div>'].join('');
        },
        class: function(d) {
          return ($scope.threshold == 'goal' ? d.atGoal : d.atFourStars) ? 'above_cutpoint' : 'below_cutpoint';
        }
      });
      donutChart(data.donutChart, "#measures-donut", {
        colors: function(d) {
          
          return colors[d.data.key];
        },
        mouseover: function(d) {
          var chart = d3.select('#measures-donut');
          var label = chart.select(".inner-label")
            .text(function() {
              return d.data.values.pct;
            })
          var bars = d3.selectAll(d.data.key == 1 ? 'rect.above_cutpoint' : 'rect.below_cutpoint');
          bars.transition()
            .duration(250)
            .style('fill', d.data.key == 1 ? '#2c9c69' : '#c62f29');
          /*var lines = d3.selectAll('path.line');
          lines.transition()
            .style('stroke', 'black');*/
        }, 
        mouseout: function(d) {
          var chart = d3.select('#measures-donut');
          chart.select(".inner-label")
            .text(function() {
                return '';
              });
          var bars = d3.selectAll(d.data.key == 1 ? 'rect.above_cutpoint' : 'rect.below_cutpoint');
          bars.transition()
            .duration(250)
            .style('fill', '');
          /*var lines = d3.selectAll('path.line');
          lines.transition()
            .style('stroke', '#2c9c69');*/
        }
      });
      //$rootScope.$broadcast('includeConsolidatedToContracts', $scope.includeConsolidated);
    };
    /*$scope.$on('includeConsolidatedToMeasures', function (event, data) {
      $scope.includeConsolidated = data;
      $scope.update();
    });*/
    $scope.update();
  });
});

controllers.controller('outcomesController', function($scope, d3, _, dataService, outcomesDataService, vertBarChart, nesterService) {
  $scope.metrics = ['Days to Refill', 'Days Missed in 60 Days after Call', 'Calls to Move Member'];
  $scope.selectMetric = $scope.metrics[0];
  $scope.selectedContract = 'all';
  
  var progFn = function(tot, val) {
    tot = tot[val.program] || {};
    tot['targeted'] = tot['targeted'] || {value: 0};
    tot['targeted']['value'] += val['targeted'];
    tot['outreached'] = tot['outreached'] || {value: 0};
    tot['outreached']['value'] += val['outreached'];
    tot['reached'] = tot['reached'] || {value: 0};
    tot['reached']['value'] += val['reached'];
    tot['completed'] = tot['completed'] || {value: 0};
    tot['completed']['value'] += val['completed'];
    tot['reachRate'] = tot['reachRate'] || {value: 0};
    tot['reachRate']['value'] = tot['reached']['value']/tot['outreached']['value'];
    return tot;
  };
  var rollup = function(d) {
    return d.reduce(progFn, {});
  };
  
  dataService.get('activity').then(function (activityData) {
    dataService.get('nnt').then(function (nntData) {
      dataService.get('outcomes').then(function (outcomesData) {
        $scope.update = function () {
          $scope.activity = new nesterService(activityData).nest('program', rollup).toArray();
          var outcomes = outcomesDataService(activityData, nntData,  outcomesData, $scope.selectedContract);
          var obj = {};
          outcomes.forEach(function (item) {
            obj[item.key] = item.values;
          });
          $scope.outcomes = obj;
          vertBarChart(outcomes, "#outcomes-vert-bar-chart");
        };
        
        $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
          $scope.update();
          $scope.$apply();
        });
        
        $scope.update();
      });
    });
  });
  

  
});