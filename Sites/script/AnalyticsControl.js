	const REQUEST_DANDD = 1;
	const REQUEST_RCVHISTORY = 2;
	const QUERY_INTERVAL = 5000;
	var reqState = REQUEST_DANDD;
	var AN_charMakeDone=false;
	var historyChart;
	var xLabel = new Array();
	var color = d3.scale.linear().domain([0.04, 1]).range(["white", "red"]);
	var chart;
	var map;
	var polygon;
	var AN_socket;  

	$(function(){
		initializeMap();
		AN_socket = io.connect();
		AN_emit();
     	AN_socket.on('ANA_HISTORY',function(result){
			AN_PacketRcvHistory(result);
			AN_DirectionAndDistance(result.DANDD);
			AN_MaxrangeDraw(result.MAXRANGELOC);
			AN_charMakeDone = true;
     	});
	});

	function AN_emit(){
        AN_socket.emit('REQ_ANA_HISTORY',null);
		setTimeout(AN_emit,QUERY_INTERVAL);
	}

	function AN_AnalyticsInit() {
		$.ajax({
			url: "AnalyticsDataAll.html",
    	    type:'GET',
			dataType: "json",
			cache: false,
			success: function(data, textStatus){
        	    AN_analyzeJson(data);
 			},
			error: function(xhr, textStatus, errorThrown){
			}
		});			
	}

	function AN_analyzeJson(data){
		
		if (data.DANDD != undefined){
			AN_DirectionAndDistance(data.DANDD);
		}		
		if (data.HISTORY != undefined && data.TRACK != undefined){
			AN_PacketRcvHistory(data);
		}
		if (data.MAXRANGELOC != undefined){
			AN_MaxrangeDraw(data.MAXRANGELOC);
		}
    	AN_charMakeDone = true;
		setTimeout(AN_AnalyticsInit,QUERY_INTERVAL);
	}

	function AN_DirectionAndDistance(data) {
		if (AN_charMakeDone==true) {
			chart = circularHeatChart()
				.segmentHeight(14)
				.innerRadius(10)
				.numSegments(36)
				.radialLabels(["20km", "40km", "60km", "80km", "100km", "120km", "140km", "160km", "180km", "200km<"])
				.margin({top: 10, right: 0, bottom: 0, left: 20});
			
			d3.select('#danddChart')
    		.selectAll('svg')
    		.data([data])
     		.call(chart);
       		return;
		}
		chart = circularHeatChart()
			.segmentHeight(14)
			.innerRadius(10)
			.numSegments(36)
			.radialLabels(["20km", "40km", "60km", "80km", "100km", "120km", "140km", "160km", "180km", "200km<"])
			.segmentLabels(["North", "10", "20", "30", "40", "50", "60", "70", "80", 
							"East",  "100", "110", "120", "130", "140", "150", "160", "170",
							"South", "190", "200", "210", "220", "230", "240", "250", "260",
							"West", "280", "290", "300", "310", "320", "330", "340", "350"])
			.margin({top: 10, right: 0, bottom: 0, left: 20});
		d3.select('#danddChart')
    	.selectAll('svg')
    	.data([data])
    	.enter()
    	.append('svg')
		.call(chart);
	}

	//Map initialize
	function initializeMap() {
		var initLatLng = new google.maps.LatLng(35.797925, 139.298087);					//初期表示位置
		var initZoom = 5;
	
		var myOptions = {
			zoom: initZoom,
			center: initLatLng,
			mapTypeId: google.maps.MapTypeId.ROADMAP 
		};
		map = new google.maps.Map(document.getElementById("gmap"), myOptions );
	}

	function AN_MaxrangeDraw(data) {
		var coords = new Array();
		var rdP = 0;
		var maxLat = -9999;
		var minLat = 9999;
		var maxLng = -9999;
		var minLng = 9999;
		for ( i = 0 ; i < data.length; i++ ){
			var lat = data[rdP].latitude;
			var lng = data[rdP++].longitude;

			if (lat > maxLat) maxLat = lat;
			if (lat < minLat) minLat = lat;
			if (lng > maxLng) maxLng = lng;
			if (lng < minLng) minLng = lng;

			var pos = new google.maps.LatLng(lat,lng);
			coords.push(pos);
		}
		
		if ( polygon == undefined ) {
			polygon = new google.maps.Polygon({
				path:coords,
				strokeColor:"#FF0000",
				strokeOpacity:0.5,
				strokeWeight:1,
				fillColor:"#FF0000",
				fillOpacity:0.5
			});
			polygon.setMap(map);
			var pt1 = new google.maps.LatLng(minLat,minLng);		
			var pt2 = new google.maps.LatLng(maxLat,maxLng);
			var bounds = new google.maps.LatLngBounds(pt1,pt2);
			map.fitBounds(bounds);
		}
		else {
			polygon.setPath(coords);
		}
	}

	function AN_PacketTrackHistory(data) {
		data.unshift("TrackedAircraft");
			historyChart.load({
				columns:[xLabel, data]
			});
	}

	function AN_PacketRcvHistory(data) {
		data.HISTORY.unshift("Packets");
		data.TRACK.unshift("TrackedAircraft");

		if (AN_charMakeDone==true) {
			historyChart.load({
				columns:[xLabel, data.HISTORY,data.TRACK]
			});
			return;
		}

		var hour = 0;
		var min = 0;
		xLabel[0] = 'x';
		for ( i = 0 ; i < ( 24 * 6 ); i++  ){
			var hourStr =hour.toString();
			var minStr = min.toString();
			if (hourStr.length == 1) hourStr = '0'+hourStr.toString();
			if (minStr.length == 1) minStr = '0'+minStr.toString();
			xLabel.push(hourStr + ':' + minStr);
			min += 10;
			if ( min == 60 ) {
				min = 0;
				hour++;
			}
		}

		historyChart = c3.generate({
			bindto:"#historyChart",

			padding:{
				top:5
			},
			data:{
				x:'x',
				columns:[xLabel,data],
				colors:{
					Packets:'#f07070',
					TrackedAircraft:'#7070f0'
				},
				types:{
					Packets:'bar',
					TrackedAircraft:'line'
				},
				axes:{
					Packets:'y',
					TrackedAircraft:'y2'					
				}
			},
			axis: {
				x:{
					tick:{
						count:1
					},
					type:'category'
				},
				y2:{
					show:true
				}
			}
		});
  	}

