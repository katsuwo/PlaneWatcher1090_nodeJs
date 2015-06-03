
    var CH_detailTarget;
	var clientType = "CH_"; //Chart
    var AJ_comInterval = 600;
    var CH_grid;
    var CH_dataView = new Slick.Data.DataView();
    var CH_chartData = new Array();

    var CH_colmuns = [
	   {id: "icao", name: "ICAO", field: "id",width: 71, sortable: true},
	   {id: "flight", name: "Flight", field: "flight",width: 70, sortable: true},
	   {id: "squawk", name: "Squawk", field: "squawk",width: 60, sortable: true},
	   {id: "altitude", name: "Altitude", field: "altitude",width: 60, sortable: true},
	   {id: "speed", name: "Speed", field: "speed",width: 60, sortable: true},
	   {id: "heading", name: "Heading", field: "heading",width: 60, sortable: true},
	   {id: "msg", name: "Msg", field: "msg",width: 60, sortable: true},
    ];

  	var options = {
    	enableCellNavigation: true,
    	enableColumnReorder: false
  	};

	//Config component setup
	$(function() {
        CH_createAcDetailTable();
        AJ_main();
  	});

    CH_dataView.onRowCountChanged.subscribe(function (e, args) {
        CH_grid.updateRowCount();
        CH_grid.render();
    });
    CH_dataView.onRowsChanged.subscribe(function (e, args) {
        CH_grid.invalidateRows(args.rows);
        CH_grid.render();
    });

  	function CH_updateChart(acData){
  		if (acData == undefined){
  			return;
  		}
  		if (CH_grid == undefined){
            CH_grid = new Slick.Grid("#dataChart", CH_dataView, CH_colmuns, options);
 
            CH_grid.onSort.subscribe(function(e, args) {
                var comparer = function(a, b) {
                    return (a[args.sortCol.field] > b[args.sortCol.field]) ? 1 : -1;
                }
                CH_dataView.sort(comparer, args.sortAsc);
            });

            CH_grid.setSelectionModel(new Slick.RowSelectionModel())

            CH_grid.onClick.subscribe(function(e, args) {
                var sel = CH_dataView.getItemByIdx(args.row);
                CH_detailTarget = sel.id;
                AJ_trackTarget = CH_detailTarget;
                CH_updateAcDetail();
            });

  			CH_makeChart(acData);
  		}
  		else {
            CH_dataView.beginUpdate();
            CH_chartAddRow(acData);
            CH_updateRow(acData);
            CH_dataView.endUpdate();

            if (acData[CH_detailTarget] != undefined){
                CH_updateAcDetail();
            }
  		}
  	}

  	function CH_makeChart(acData) {
  		var i = 0;
        var newRows = new Array();
  		for (var name in acData){
        	var tmpAC = acData[name];
        	newRows[i] = {
        		id:tmpAC.ADDR,
        		flight:tmpAC.FLIGHT,
        		squawk:tmpAC.SQUAWK,
        		altitude:tmpAC.ALT,
        		speed:tmpAC.SPEED,
        		heading:tmpAC.HEAD,
        		msg:tmpAC.PACKTCNT
        	};
            CH_chartData[i] = newRows[i];
        	i++;
        }
        CH_dataView.setItems(newRows);
  	}

    function CH_chartAddRow(acData) {
        var newDatas = new Array();
        for (var name in acData){
            var item = CH_dataView.getItemById(name);
            if (item == undefined){
                var tmpAC = acData[name];
                item = {
                    id:tmpAC.ADDR,
                    flight:tmpAC.FLIGHT,
                    squawk:tmpAC.SQUAWK,
                    altitude:tmpAC.ALT,
                    speed:tmpAC.SPEED,
                    heading:tmpAC.HEAD,
                    msg:tmpAC.PACKTCNT
                }
                CH_dataView.addItem(item);
                CH_chartData.push(item);
            }
        }
    }

    function CH_updateRow(acData){
        for (var name in acData) {
            var editTarget = CH_dataView.getItemById(name);
            var editIndex = CH_dataView.getIdxById(name);
            editTarget.id = name;
            editTarget.flight = acData[name].FLIGHT;
            editTarget.squawk = acData[name].SQUAWK;
            editTarget.altitude = acData[name].ALT;
            editTarget.speed = acData[name].SPEED;
            editTarget.heading = acData[name].HEAD;
            editTarget.msg = acData[name].PACKTCNT;
            CH_chartData[editIndex] = editTarget;
            CH_dataView.updateItem(name,editTarget);
        }
    }

   function CH_removeChartRows(delArray) {
        CH_dataView.beginUpdate(); 
        for (var delNum in delArray) {
            var delName = delArray[delNum];
            var delIndex = CH_dataView.getIdxById(delName);
            if (delIndex != undefined){
                CH_chartData.splice(delIndex,1);                
            }
            if ( CH_dataView.getItemById(delName) != undefined) {
                CH_dataView.deleteItem(delName);
            }
        }
        CH_dataView.endUpdate();
    }

    function CH_updateAcDetail(){
        var tmpAC = AJ_aircrafts[CH_detailTarget];
        var rows = $("#acDetailTable")[0].rows;
        var lat = tmpAC.LAT;
        var lng = tmpAC.LNG;
        var heading = tmpAC.HEAD;
        var alt = tmpAC.ALT;
        var speed = tmpAC.SPEED;
        var msg = tmpAC.PACKTCNT;
        var flight = tmpAC.FLIGHT;
        var squawk = tmpAC.SQUAWK;
        lat *= 10000;
        lat = Math.floor(lat);
        lat /= 10000;
        lng *= 10000;
        lng = Math.floor(lng);
        lng /= 10000;

        $(rows[0].cells[0]).html("Flight:<strong>"+flight+"</strong>");
        $(rows[0].cells[1]).html("ICAO:<strong>"+CH_detailTarget+"</strong>");
        $(rows[0].cells[2]).html("Squawk:<strong>"+squawk+"</strong>");
        $(rows[1].cells[0]).html("Lat:<strong>"+lat.toString()+"</strong>");
        $(rows[1].cells[1]).html("Lng:<strong>"+lng.toString())+"</strong>";
        $(rows[1].cells[2]).html("Alt:<strong>"+alt.toString()+"</strong>");
        $(rows[2].cells[0]).html("Heading:<strong>"+heading.toString()+"</strong>");
        $(rows[2].cells[1]).html("Speed:<strong>"+speed.toString()+"</strong>");
        $(rows[2].cells[2]).html("Msg:<strong>"+msg.toString()+"</strong>");

        var fr24link = CH_generateLinkTag('FlightRadar','http://www.flightradar24.com/'+CH_detailTarget);
        var flightStatslink = CH_generateLinkTag('FlightStats','http://www.flightstats.com/'+CH_detailTarget);
        var flightAwarelink = CH_generateLinkTag('FlightAware','https://flightaware.com/'+CH_detailTarget);
        $(rows[5].cells[0]).html(fr24link);
        $(rows[5].cells[1]).html(flightStatslink);
        $(rows[5].cells[2]).html(flightAwarelink);
    }

    function CH_createAcDetailTable() {
        var tableHTML = '<table style="html-align: left; width: 370px;" border="0"cellpadding="2" cellspacing="2" id="acDetailTable"><tbody><tr><td style="vertical-align: top;">Flight:<br></td><td style="vertical-align: top;">ICAO:<br></td><td style="vertical-align: top;">Squawk:<br></td></tr>';
            tableHTML += '<tr><td style="vertical-align: top;">Lat:<br></td><td style="vertical-align: top;">Lng:<br></td><td style="vertical-align: top;">Alt:<br></td></tr>';
            tableHTML += '<tr><td style="vertical-align: top;">Heading:<br></td><td style="vertical-align: top;">Speed:<br></td><td style="vertical-align: top;">Msg:<br></td></tr>';
            tableHTML += '<tr><td></br></td><td> </td> <td> </td></tr>';
            tableHTML += '<tr><td style="vertical-align: top;">Search with..<br></td><td style="vertical-align: top;"><br></td><td style="vertical-align: top;"><br></td></tr>';
            tableHTML += '<tr><td style="vertical-align: top;">FR24<br></td><td style="vertical-align: top;">FlightStats<br></td><td style="vertical-align: top;">FlightAware<br></td></tr>';
            tableHTML += '</tbody></table>';
        
        $('#acDetail').html(tableHTML);
    };

    function CH_generateLinkTag(html,url){
        return '<a href="'+url+'" target="_blank">'+html+'</a>';
    }

