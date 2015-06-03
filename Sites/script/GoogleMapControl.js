	var GM_Marker = new Array();
	var GM_PolyLine = new Array();
	var blueIcon = new google.maps.MarkerImage('../model/blue-dot.png');
	var greenIcon = new google.maps.MarkerImage('../model/green-dot.png');
	var redIcon = new google.maps.MarkerImage('../model/red-dot.png');
	var GM_trackTarget;
	var map;
	var clientType = 'GM_'; //googlemap
	var markerSVG ='m9.827504,4.902883l0.008903,2.143433l-2.407839,1.813563l-0.000368,-0.870898l-0.80433,-0.000302l0.000637,1.502622l-2.464905,1.921432l0.002307,-0.733557l-0.733522,-0.000275l0.000552,1.302803l-3.033427,2.413773l-0.270511,1.155363l6.663925,-3.364048l3.03415,-0.752722l0.056542,4.974106l0.596362,2.361605l-3.165209,2.214918l0.000396,0.949608l3.63279,-0.714149l3.622501,0.714806l-0.000411,-0.949621l-3.167105,-2.217236l0.594353,-2.361183l0.052281,-4.974053l3.034786,0.754946l6.6668,3.368963l-0.271503,-1.155574l-3.035492,-2.415997l-0.000553,-1.303814l-0.699938,-0.000257l0.002337,0.767072l-2.499537,-1.95576l-0.000651,-1.502608l-0.804316,-0.000302l0.000367,0.870892l-2.471302,-1.815348l-0.000666,-2.14342c-0.000367,-0.87236 0.032991,-3.59172 -1.026621,-4.776662c-1.023268,1.351705 -1.056952,3.13168 -1.111782,4.777883z';

	function GM_Aircraft(ac) {
		this.name = ac.ADDR;
        var heading = ac.HEAD;
        var alt = ac.ALT;
        var speed = ac.SPEED;
        var flight = ac.FLIGHT;
        var squawk = ac.SQUAWK;
		this.pos = new google.maps.LatLng(ac.LAT,ac.LNG);
		if (squawk == undefined) squawk ='';
		if (flight == undefined || flight =='') flight = name;
		this.content = flight+':'+squawk+'<br />'+'Alt:'+alt.toString()+'<br />Speed:'+speed.toString();
		var lineColor = (ac.LINECOLOR == undefined) ? '#0000ff' : ac.LINECOLOR; 
		var iconColor = 'dimgray';
	
		this.marker = new google.maps.Marker({
			position: this.pos,
			map: map,
			name:this.name,
			icon: {
				path:markerSVG,
				scale:1.0,
				fillColor:iconColor,
				strokeColor:iconColor,
				fillOpacity:1.0,
				anchor: new google.maps.Point(11, 11),
				rotation:heading
			},
		});
		google.maps.event.addListener(this.marker,'click',function(event){
			GM_setTrackTarget(this.name);
			var icon = this.getIcon();
		});	

		this.polyLine = new google.maps.Polyline({
			path: [this.pos,this.pos],
			strokeColor: lineColor,
			strokeOpacity: 1.0,
			strokeWeight: 2,
			map :map
		});

		this.label = new RichMarker({
	        position: this.pos,
    	    map: map,
            anchor: RichMarkerPosition.MIDDLE,
        	draggable: false,
        	position:this.pos,
        	flat:true,
 			anchor: new google.maps.Size(-42, 10),
       		content:this.makeLabelContent(ac)
	    });	
	}

	GM_Aircraft.prototype = {
		makeLabelContent:function(ac) {
        	var heading = ac.HEAD;
        	var alt = ac.ALT;
        	var speed = ac.SPEED;
        	var flight = ac.FLIGHT;
        	var squawk = ac.SQUAWK;
        	if (flight == undefined || flight == "") flight = ac.ADDR;
			return ('<div class = "labels">'+flight+':'+squawk+'<br />'+'Alt:'+alt.toString()+'<br />Speed:'+speed.toString()+'</div>');
		},
		upDate:function(ac) {
			var heading = ac.HEAD;
        	var alt = ac.ALT;
        	var speed = ac.SPEED;
        	var flight = ac.FLIGHT;
        	var squawk = ac.SQUAWK;

			this.pos = new google.maps.LatLng(ac.LAT,ac.LNG);
			if (squawk == undefined) squawk ='';
			if (flight == undefined || flight =='') flight = name;
			this.label.setContent(this.makeLabelContent(ac));
			this.marker.setPosition(this.pos);
			var icon = this.marker.getIcon();
			icon.rotation = heading;
			this.marker.setIcon(icon);
			this.label.setPosition(this.pos);
			if (ac.LINEEXTEND != false){
				var pt = this.polyLine.getPath();
				pt.push(this.pos);			
			}
		},
		selectMarker:function(sel) {
			var color = (sel == true) ? "yellow" : "dimgray";
			var icon  = this.marker.getIcon();
			icon.fillColor = color;
			this.marker.setIcon(icon);
		},
		erase:function(){
			this.marker.setMap(null);
			this.label.setMap(null);
			this.polyLine.setMap(null);
		}
	}

	function GM_setTrackTarget(name){
		if (GM_trackTarget != undefined){
			GM_Marker[GM_trackTarget].selectMarker(false);
		}
		GM_Marker[name].selectMarker(true);
		GM_trackTarget = name;
		AJ_trackTarget = name;			
	}

	function GM_trackMarker(target){
		var mk = GM_Marker[target];
		if (mk == undefined) return;
		var pos = mk.getPosition();
		map.setCenter(pos);
		GM_setTrackTarget(target);
	}

	function GM_markerErase(delArray){
		for (var i in delArray){
			var name = delArray[i];
			if (GM_Marker[name] != undefined ) {
				GM_Marker[name].erase();
				delete GM_Marker[name];
				console.log("Delete:"+name);
			}
		}
	}

	//Map initialize
	function initializeMap() 
	{
		var initLatLng = new google.maps.LatLng(35.797925, 139.298087);					//初期表示位置
		var initZoom = 5;
	
		var myOptions = {
			zoom: initZoom,
			center: initLatLng,
			mapTypeId: google.maps.MapTypeId.ROADMAP 
		};
		map = new google.maps.Map(document.getElementById('map_canvas'), myOptions );
//		google.maps.event.addListener(map, 'click', positionAlert);
		google.maps.event.addListener(map, 'center_changed', function() {
			AJ_CenterCoord = map.getCenter();
	 	});
		AJ_main();
	}
	
	function positionAlert(event){
		alert('Lat:'+event.latLng.lat()+'\nLng:'+event.latLng.lng());
	}

	function GM_MarkerUpdate(ac){
		if (GM_Marker[ac.ADDR] == undefined) {
			GM_Marker[ac.ADDR] = new GM_Aircraft(ac);
		}
		else {
			var tmpAC = GM_Marker[ac.ADDR];
			tmpAC.upDate(ac);
		}
	}

	function GM_setCenterCoord(lat,lng){
		var pos = new google.maps.LatLng(lat,lng);
		map.setCenter(pos);
	}


