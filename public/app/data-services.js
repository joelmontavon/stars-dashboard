var services = angular.module('dataServices', []);
services.factory("dataService", ["$q", "d3", "_",
	function($q, d3, _) {
    var services = {};
    
    var _get = function (service) {
      d3.csv(service.path, service.type, function (d) {
  	    if (d) {
    	    service.cb(d);
    	    service.deferred.resolve(d);
  	    }
    	});
    };
    
    services.contract = {
      path: "./data/contract.csv",
      type: function(d) {
        var months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        d.month = +d.month;
        d.monthDescription = months[d.month - 6];
        d.contract = d['Contract'];
        d.anchorContract = d['CONSOLIDATED_CMS_CNTRCT_NBR'];
        d.isAnchor = d['Contract'] == d['CONSOLIDATED_CMS_CNTRCT_NBR'] ? true : false;
        d.contractDescription = d['ALT_DISPLAY_NM'];
        d.members = +d['MEMBERS'];
        d.therapy = d['Therapy'];
        d.score = parseFloat(d['2015 Forecast']);
        d.goal = parseFloat(d['2015 Adherence Goal']);
        d.membersToGoal = +d['Additional patients needed to be'];
        switch (d.therapy) {
          case 'oad':
            d.cutpoint = 0.76;
            break;
          case 'rasa':
            d.cutpoint = 0.79;
            break;
          case 'statins':
            d.cutpoint = 0.75;
            break;
        }
        d.atFourStars = d.score >= d.cutpoint ? 1 : 0;
        d.atGoal = d.score >= d.goal ? 1 : 0;
        return d;
      },
      deferred: $q.defer(),
      cb: function(d) {
        d.sort(function(a, b) {
          if (a.members < b.members)
            return 1;
          if (a.members > b.members)
            return -1;
          return 0;
        });
      }
    };

    services.activity = {
      path: "./data/activity.csv",
      type: function(d) {
        d.outreached = +d.outreached;
        d.reached = +d.reached;
        return d;
      },
      deferred: $q.defer(),
      cb: function(d) {
        return d;
      }
    };

    services.nnt = {
      path: "./data/nnt.csv",
      type: function(d) {
        d.numerator = +d.numerator;
        d.denominator = +d.denominator;
        return d;
      },
      deferred: $q.defer(),
      cb: function(d) {
        return d;
      }
    };
    
    services.outcomes = {
      path: "./data/outcomes.csv",
      type: function(d) {
        d.members = +d.members;
        d.days_missed = +d.days_missed;
        d.days_to_refill = +d.days_to_refill;
        return d;
      },
      deferred: $q.defer(),
      cb: function(d) {
        return d;
      }
    };

  	_.forEach(services, function (service) {
  	  _get(service);
  	});
	  
		var get = function (src) {
		  src = src || 'contract';
      return  services[src].deferred.promise;
		};
		return {
			get: get
		};
	}
]);

services.factory("nesterService", ["d3",
  function(d3) {
    var service = function (data) {
      this.sortedData = this.nestedData = this.filteredData = this.rawData = data;
      return this;
    };
    service.prototype.filter = function (fn)  {
      this.sortedData = this.sortedData = this.nestedData = this.filteredData = _.filter(this.rawData, fn);
      return this;
    };
    service.prototype.nest = function (key, rollup)  {
      this.sortedData = this.nestedData = d3.nest()
        .key(function(d) {
          return d[key];
        })
        .rollup(rollup)
        .entries(this.filteredData);
      return this;
    };
    service.prototype.sort = function (path) {
      this.sortedData = this.nestedData.sort(function(a, b) {
        if (_.result(a, path) < _.result(b, path))
          return 1;
        if (_.result(a, path) > _.result(b, path))
          return -1;
        return 0;
      });
      return this;
    };
    service.prototype.toArray = function () {
      return this.nestedData;
    };
    service.prototype.toObject = function () {
      var obj = {};
      this.nestedData.forEach(function (item) {
        obj[item.key] = item.values;
      });
      console.log(obj['Customer Service']);
      return obj;
    };
    return service;
  }
]);

services.factory("rollupService", ["d3",
	function(d3) {
	  var rollups = {};
	  rollups.contract = function(d) {
      return d.reduce(function(tot, val) {
        tot['month'] = val.month;
        tot['monthDescription'] = val.monthDescription;
        tot['contract'] = val.contract;
        tot['contractDescription'] = val.contractDescription;
        tot['members'] = val.members;
        tot[val.therapy + '_score'] = val.score;
        tot[val.therapy + '_goal'] = val.goal;
        tot[val.therapy + '_cutpoint'] = val.cutpoint;
        tot[val.therapy + '_four_stars'] = val.atFourStars;
        tot[val.therapy + '_members_to_goal'] = val.membersToGoal;
        tot['measuresAtFourStars'] = (tot['measuresAtFourStars'] || 0) + val.atFourStars;
        if (tot['measuresAtFourStars'] == 3) {
          tot['measuresAtFourStarsBand'] = "3";
        } else if (tot['measuresAtFourStars'] == 0) {
          tot['measuresAtFourStarsBand'] = "0";
        } else {
          tot['measuresAtFourStarsBand'] = "1-2";
        }
        return tot;
      }, {});
    };
    rollups.anchorContract = function(d) {
      return d.reduce(function(tot, val) {
        tot['month'] = val.month;
        tot['monthDescription'] = val.monthDescription;
        tot['contract'] = val.anchorContract;
        if (val.isAnchor) {
          tot['contractDescription'] = val.contractDescription;
          tot[val.therapy + '_score'] = val.score;
          tot[val.therapy + '_goal'] = val.goal;
          tot[val.therapy + '_cutpoint'] = val.cutpoint;
          tot[val.therapy + '_four_stars'] = val.atFourStars;
          tot[val.therapy + '_members_to_goal'] = val.membersToGoal;
          tot['measuresAtFourStars'] = (tot['measuresAtFourStars'] || 0) + val.atFourStars;
          if (tot['measuresAtFourStars'] == 3) {
            tot['measuresAtFourStarsBand'] = "3";
          } else if (tot['measuresAtFourStars'] == 0) {
            tot['measuresAtFourStarsBand'] = "0";
          } else {
            tot['measuresAtFourStarsBand'] = "1-2";
          }
        }
        if (val.therapy == "oad") {
          tot['members'] = tot['members'] || 0;
          tot['members'] += val.members;
        }
        return tot;
      }, {});
    };
    rollups.activity = function(d) {
      return d.reduce(function(tot, val) {
        tot += val.reached;
        return tot;
      }, 0);
    };
    rollups.nnt = function(d) {
      return d.reduce(function(tot, val) {
        if(val.reached == "1") {
          tot['reached']['numerator'] += val.numerator;
          tot['reached']['denominator'] += val.denominator;
        } else {
          tot['not_reached']['numerator'] += val.numerator;
          tot['not_reached']['denominator'] += val.denominator;          
        }
        return tot;
      }, {reached: {numerator: 0, denominator: 0}, not_reached: {numerator: 0, denominator: 0}});
    };
    rollups.outcomes = function(d) {
      return d.reduce(function(tot, val) {
        tot['members'] += val.members;
        tot['days_missed'] += val.days_missed;
        tot['days_to_refill'] += val.days_to_refill;
        return tot;
      }, {members: 0, days_missed: 0, days_to_refill: 0});
    };
	  
	  var services = {};
	  services.contract = function (data, option)  {
      return d3.nest()
        .key(function(d) {
          return option ? d.contract : d.anchorContract;
        })
        .rollup(option ? rollups.contract : rollups.anchorContract)
        .entries(data);
  	};
    services.month = function (data, option)  {
      return d3.nest()
        .key(function(d) {
          return d.month;
        })
        .rollup(option ? rollups.contract : rollups.anchorContract)
        .entries(data);
  	};
  	services.activity = function (data, option)  {
      return d3.nest()
        .key(function(d) {
          return d.program;
        })
        .rollup(rollups.activity)
        .entries(data);
  	};
  	services.nnt = function (data, option)  {
      return d3.nest()
        .key(function(d) {
          return d.program;
        })
        .rollup(rollups.nnt)
        .entries(data);
  	};
  	services.outcomes = function (data, option)  {
      return d3.nest()
        .key(function(d) {
          return d.program_name;
        })
        .rollup(rollups.outcomes)
        .entries(data);
  	};
  	
		return {
			contract: services.contract,
			month: services.month,
			activity: services.activity,
			nnt: services.nnt,
			outcomes: services.outcomes
		};
	}
]);
services.factory("contractDataService", ["d3", "rollupService",
	function(d3, rollupService) {
	  return function (data, month, contract, preConsolidation, includeConsolidated) {
	    if (!preConsolidation) includeConsolidated = true;
      var filteredData = data.filter(function(item) {
        return !includeConsolidated ? item.isAnchor : true;
      });
      var contractData = filteredData.filter(function(item) {
        return item.contract == contract;
      });
      var lineChart = rollupService.month(contractData, preConsolidation);
      
      var currentMonthData = filteredData.filter(function(d) {
        return d.month == month;
      });
      var table = rollupService.contract(currentMonthData, preConsolidation)
        .sort(function(a, b) {
          return b.values.members - a.values.members;
        });
        
      var totalMembers = d3.sum(table, function(d) {
        return d.values.members
      });
      var donutChart = d3.nest()
        .key(function(d) {
          return d.values.measuresAtFourStarsBand;
        })
        .rollup(function(d) {
          var members = d3.sum(d, function(g) {
            return g.values.members;
          });
          return {
            members: members,
            pct: d3.format('%')(members / totalMembers)
          };
        })
        .entries(table);

	    return {
	      lineChart: lineChart,
	      table: table,
	      donutChart: donutChart
	    };
    }
	}
]);
services.factory("measureDataService", ["d3",
	function(d3) {
	  return function (data, month, therapy, includeConsolidated, threshold) {
      var barChart = data.filter(function(d) {
        return (!includeConsolidated ? d.isAnchor : true)
          && (d.month == month)
          && (d.therapy == therapy);
      });
      var totalMembers = d3.sum(barChart, function(d) {
        return d.members
      });
      
      var donutChart = d3.nest()
        .key(function(d) {
          return threshold == 'cutpoint' ? d.atFourStars : d.atGoal;
        })
        .rollup(function(d) {
          var members = d3.sum(d, function(g) {
            return g.members;
          })
          return {
            members: members,
            pct: d3.format('%')(members / totalMembers)
          };
        })
        .entries(barChart);
        
	    return {
	      barChart: barChart,
	      donutChart: donutChart
	    };
    }
	}
]);
services.factory("outcomesDataService", ["d3", "rollupService",
	function(d3, rollupService) {
	  return function (activityData, nntData, outcomesData, contract) {
      var activity = {};
      rollupService.activity(
        activityData.filter(function(d) {
          return d.contract == (contract == "all" ? d.contract : contract);
        })
      )
      .forEach(function (item) {
        activity[item.key] = item.values;
      });
      var nnt = {};
      rollupService.nnt(
        nntData.filter(function(d) {
          return d.contract == (contract == "all" ? d.contract : contract);
        })
      )
      .forEach(function (item) {
        nnt[item.key] = activity[item.key]/(((item.values.reached.numerator/item.values.reached.denominator) - (item.values.not_reached.numerator/item.values.not_reached.denominator)) * item.values.reached.denominator);
        //console.log(activity[item.key], (((item.values.reached.numerator/item.values.reached.denominator) - (item.values.not_reached.numerator/item.values.not_reached.denominator)) * item.values.reached.denominator), nnt[item.key]);
      });

      var outcomes = rollupService.outcomes(
        outcomesData.filter(function(d) {
          return d.contract == (contract == "all" ? d.contract : contract);
        })
      );
      outcomes.forEach(function (item) {
        item.values.nnt = nnt[item.key];
      });

	    return outcomes;
    };
	}
]);