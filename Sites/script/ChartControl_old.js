
	var CH_waTable;
    var CH_waTableRemake = false;
    var CH_detailTarget;
	var clientType = "CH_"; //Chart
    var AJ_comInterval = 1000;
	//Config component setup
	$(function() {
		$('#ui-tab').tabs({
			fx: {
				opacity: 'toggle',
				duration: 'fast'
			}
		});

    	$( "#slider" ).slider({
    		min:500,
    		max:60000,
    		step:500,
    		value:500,
    		change: function(e,ui){
    			$("#sliderString").val('ui.val');
                var slVal = ui.value;
                CH_sliderHandler(slVal);
    		},
    		create: function(e,ui){
    			var slVal = $(this).slider('option', 'value');
                CH_sliderHandler(slVal);
      		}
    	});
        
        $("#DCUSwitch").toggleSwitch();
        $("#DCUSwitch").change(function(){
            var chk = $(this).prop('checked');
            var dat = CH_waTable.getData(false);
            CH_waTableRemake = true;
            $('#dataChart').html("");
            CH_createWATable(dat,chk);
            CH_waTableRemake = false;
        });
        
        $("#resetBtn").click(function(){
            $(this).blur();
        });
        
        CH_createAcDetailTable();
        AJ_main();
  	});

    function CH_sliderHandler(slVal) {
        return;
/*
        if (slVal < 1000){
            $("#sliderString").html("Update interval: "+slVal.toString()+"mSec");  
        }
        else {
            $("#sliderString").html("Update interval: "+(slVal/1000.0).toString()+"Sec");                   
        }
        AJ_comInterval = slVal;                 
*/
    }

  	function CH_updateChart(acData){
  		if (acData == undefined){
  			return;
  		}
  		if (CH_waTable == undefined){
  			CH_makeChart(acData);
  		}
  		else {
  			CH_updateRows(acData);
  			if (CH_detailTarget != undefined){
  				CH_updateAcDetail();
  			}
  		}
  	}

	function CH_updateRows(acData){
		var rows = new Array();
		var newRows = new Array();
		var count = 0;
		for (var count in acData){
            var tmpAC = acData[count];
			var result = CH_waTable.getRow(count);
			if (result == undefined){
				newRows.push(acData[count]);
				continue;
			}
			var row = result.row;
            row.icao = tmpAC.ADDR;
            row.flight = tmpAC.FLIGHT;
            row.squak = "";
            row.altitude = tmpAC.ALT;
            row.speed = tmpAC.SPEED;
            row.heading = tmpAC.HEAD;
            row.msg = tmpAC.PACKTCNT;
            row.squawk = tmpAC.SQUAWK;
//            rows.push(row);
            count++;
    	}
        if (newRows.length != 0) {
            var newData = CH_generateData(newRows).rows;
            var allRows = CH_waTable.getData(false);
//            allRows.rows.concat(newData);
            Array.prototype.push.apply(allRows.rows,newData);
/*
            for (var i = 0; i < newData.length; i++ ){
                allRows.rows.push(newData[i]);                
            }
*/

            CH_waTable.setData(allRows);
        }
    	Platform.performMicrotaskCheckpoint();
	}

	function CH_makeChart(acData){
        if (CH_waTableRemake == true) return;
        CH_createWATable(CH_generateData(acData),true);
    }

    function CH_createWATable(data,bind){
        CH_waTable = $('#dataChart').WATable({
            data: data,
            dataBind: bind,
            rowClicked: function(data) {
                CH_detailTarget = data.row.icao;
                CH_updateAcDetail();
                AJ_trackTarget = data.row.icao;
            }
        }).data('WATable');        
	}

	function CH_generateData(acData) {
    	var cols={
    		icao:{
    			index:2,
    			type:"string",
    			friendry:"ICAO",
    			unique:true,
    			sortOrder:"asc",
    		},
    		flight:{
    			index:1,
    			type:"string",
    			friendry:"Flight"
    		},
    		squawk:{
    			index:3,
    			type:"string",
    			friendry:"Squawk"
    		},
    		altitude:{
    			index:4,
    			type:"number",
    			friendry:"Altitude"
    		},
    		speed:{
    			index:5,
    			type:"number",
    			friendry:"Speed"
    		},
    		heading:{
    			index:6,
    			type:"number",
    			friendry:"Heading"
    		},
    		msg:{
    			index:7,
    			type:"number",
    			friendry:"Msg"
    		}
    	};
    	var rows= new Array();

    	for (var count in acData){
            var row={};
            var tmpAC = acData[count];
            row.icao = tmpAC.ADDR;
            row.flight = tmpAC.FLIGHT;
            row.squawk = tmpAC.SQUAWK;
            row.altitude = tmpAC.ALT;
            row.speed = tmpAC.SPEED;
            row.heading = tmpAC.HEAD;
            row.msg = tmpAC.PACKTCNT;
            rows.push(row);
    	}

    	var data = {
    		cols:cols,
    		rows:rows,
		     otherStuff: {
                thatIMight: 1,
                needLater: true
            }   
    	};
    	return data;
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

    function CH_removeChartRows(delArray) {
        var delCount = 0;
        var d = CH_waTable.getData(false);
        for (var delIndex in delArray) {
            for (var i in d.rows) {
                var tmpRow = d.rows[i];
                if (tmpRow.icao == delArray[delIndex]) {
                    d.rows.splice(i,1);
                    delCount++;
                    break;
                }
            }
            if (delCount == delArray.length) break;
        }
        CH_waTable.setData(d);
        Platform.performMicrotaskCheckpoint();
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

