	var GE_Marker = new Array();
	var GE_PolyLine = new Array();
	var plane = new Array();
	var GE_lineString = new Array();
	var GE_lineStringPlacemark = new Array();
	var GE_labelMarker = new Array();
	var GE_modelScale = 30.0;
	var map;
	var clientType = "GE_"; //googleEarth
	var ge;

	google.load("earth", "1");
	google.setOnLoadCallback(init);

	function init(){
		google.earth.createInstance('map_canvas', initCB, failureCB);
	}

	function set3DBuildings( flag ){
		ge.getLayerRoot().enableLayerById(ge.LAYER_BUILDINGS, flag );
	}

	function initCB(instance) {
		ge = instance;
		ge.getWindow().setVisibility(true);
		ge.getNavigationControl().setVisibility(ge.VISIBILITY_SHOW);
		ge.getOptions().setFlyToSpeed(ge.SPEED_TELEPORT);

		lookAt = ge.getView().copyAsCamera(ge.ALTITUDE_ABSOLUTE);

		google.earth.addEventListener(ge.getView(), 'viewchangeend', function(){
			lookAt = ge.getView().copyAsCamera(ge.ALTITUDE_ABSOLUTE);
		});

/*
		google.earth.addEventListener(ge.getView(), 'viewchangebegin', function(){
			document.getElementById('status2').innerHTML = dummycnt++;
			mouseDown = 1;
		});

		google.earth.addEventListener(ge.getGlobe(), 'mousedown', function(){
			mouseDown = 1;
		});

		google.earth.addEventListener(ge.getGlobe(), 'mouseup', function(){
			mouseDown = 0;
		});
*/
//		var navcontrol = ge.getNavigationControl();
//		navcontrol.setStreetViewEnabled(true);
		set3DBuildings(true);
		AJ_main();
	}

	function failureCB(errorCode) {
	}

	function Plane(name) {
		var me = this;
		var model = ge.createModel('');
		var placemark = ge.createPlacemark('');

		placemark.setName(name);
		this.placemark = placemark;
		ge.getFeatures().appendChild(placemark);

		var loc = ge.createLocation('');
		model.setLocation(loc);

		var link = ge.createLink('');
//		link.setHref('http://sonic-labo.com/adsb_track/models/B777/B777.dae');
		link.setHref('http://sonic-labo.com/adsb_track/models/B777/simple_model.dae');
		model.setLink(link);

		var la = ge.getView().copyAsLookAt(ge.ALTITUDE_RELATIVE_TO_GROUND);
		loc.setLatitude(la.getLatitude());
		loc.setLongitude(la.getLongitude());

		this.model = model;
		this.placemark.setGeometry(model);

		this.model.getLocation().setLatLngAlt( 0,10,-1000);
		var scale = this.model.getScale();
		scale.set(GE_modelScale,GE_modelScale,GE_modelScale);
		this.orientation = this.model.getOrientation();
		this.location = this.model.getLocation();
		this.model.setAltitudeMode(ge.ALTITUDE_ABSOLUTE);
		this.orientation.setHeading(0);
	}

	function GE_createMarker(name, flight, lat, lng, alt, heading , roll , pitch ) {
		if (GE_Marker[name] == null ) {

			//機体作成
			GE_Marker[name] = new Plane(name);
			GE_Marker[name].name = name;
			console.log("CREATE:"+name);
		}

		if (GE_lineString[name] == null ) {
			GE_lineStringPlacemark[name] = ge.createPlacemark('');
			GE_lineStringPlacemark[name].setStyleSelector(ge.createStyle(''));
			GE_lineString[name] = ge.createLineString('');
			GE_lineStringPlacemark[name].setGeometry(GE_lineString[name]);
			GE_lineString[name].setExtrude(false);
			GE_lineString[name].setAltitudeMode(ge.ALTITUDE_ABSOLUTE);
			
			var lineStyle = GE_lineStringPlacemark[name].getStyleSelector().getLineStyle();
			lineStyle.setWidth(3);
			lineStyle.getColor().set('8000ff00');
			ge.getFeatures().appendChild(GE_lineStringPlacemark[name]);
		}
		GE_Marker[name].teleportTo( name, lng, lat, alt, heading , roll , pitch );
//		GE_Marker[name].cameraCut();

	 	//ラベル表示の為、カスタムアイコン表示のPlaceMarkを作る
	  	var placemark = ge.createPlacemark('');
		var content;
		if ( flight == undefined){
			content = name;
		}
		else {
			content =  flight+':'+name;
		}

	  	placemark.setName(content);
	  	var icon = ge.createIcon('');

	  	icon.setHref('http://sonic-labo.com/adsb_track/icon/clear.png');
	  	var style = ge.createStyle(''); //create a new style
	  	style.getIconStyle().setIcon(icon); //apply the icon to the style
	  	//			style.getIconStyle().setScale(10.0);
	  	style.getLabelStyle().setScale(0.5);
	  	
	  	placemark.setStyleSelector(style); //apply the style to the placemark
	  	var point = ge.createPoint('');
	  	placemark.setGeometry(point);
	  	placemark.icao = name;
	  	GE_labelMarker[name] = placemark;
	  	ge.getFeatures().appendChild(GE_labelMarker[name]);

	  	google.earth.addEventListener(placemark, 'click', function(event) {
	  		var tgt = event.getTarget();
	  		for ( var i in GE_labelMarker) {
	  			if (GE_labelMarker[i].icao == tgt.icao ){
	  				AJ_trackTarget = i;
	  				break;
	  			}
	  		}
	  	});
	}

//	function GE_moveMarker( name, lat, lng, alt, heading, roll, pitch, lineFlag ) {
	function GE_moveMarker( name, flight, lng, lat, alt, heading, roll, pitch, lineFlag ) {
		if (GE_Marker[name] == null ) {

			//build a aircraft 
			GE_createMarker(name,flight, lat, lng, alt, heading , roll , pitch );
		}

		else {

			//機体移動
			GE_Marker[name].teleportTo( name, lng, lat, alt, heading , roll , pitch );
			if ( GE_lineString[name] != null ) {
				if ( lineFlag == true ){
					GE_lineString[name].getCoordinates().pushLatLngAlt(lat, lng, alt);
				}
			}

			if ( GE_labelMarker[name] != undefined ) {
				var point = ge.createPoint('');
				var content;
				if ( flight == undefined){
					content = name;
				}
				else {
					content =  flight+':'+name;
				}
				GE_labelMarker[name].setName(content);
				point.setLatitude(lat);
				point.setLongitude(lng);
				point.setAltitude(parseInt(alt)+200);
				point.setAltitudeMode(ge.ALTITUDE_ABSOLUTE);
				GE_labelMarker[name].setGeometry(point);
			}
		}

		//更新時間設定
		now = new Date();
		GE_Marker[name].time = now.getTime();
	}
	
	function GE_trackTarget(name){
		if ( GE_Marker[name] != undefined ) {
			GE_Marker[name].cameraCut();
		}
	}

	Plane.prototype.teleportTo = function(name, lng, lat, alt, heading, roll, pitch) {
		if (heading == null) {
			heading = 0;
		}
		heading-=180;

		this.model.getLocation().setLatLngAlt( lat, lng, alt );
		this.orientation.setHeading(heading);
		this.orientation.setRoll(roll);
		this.orientation.setTilt(pitch);
	};

	Plane.prototype.cameraCut = function() {
		var lo = this.model.getLocation();
		var lat = lo.getLatitude();
		var lng = lo.getLongitude();
		var alt = lo.getAltitude() + 1500;
		var head = lookAt.getHeading();
		var tilt = lookAt.getTilt();
		var roll = lookAt.getRoll();

		lookAt.set( lat ,
					lng ,
					alt ,
					ge.ALTITUDE_ABSOLUTE ,
					head,
					tilt,
					roll );

		ge.getView().setAbstractView(lookAt);
	};

	function GE_markerErase(delArray){
		for (var i in delArray){
			var name = delArray[i];
			if (GE_Marker[name] != undefined ) {
				ge.getFeatures().removeChild(GE_Marker[name].placemark);
				delete GE_Marker[name];
			}
            if (GE_labelMarker[name] != undefined){
                ge.getFeatures().removeChild(GE_labelMarker[name]);
            }
			if (GE_lineString[name] != undefined ){
				delete GE_lineString[name];
			}
			if (GE_lineStringPlacemark[name] != undefined ){
				ge.getFeatures().removeChild(GE_lineStringPlacemark[name]);
				delete GE_lineStringPlacemark[name];
			}
		}
	}
	
	function GE_setLabelScale(scale){
		for ( var i in GE_labelMarker ){
  			GE_labelMarker[i].getStyleSelector().getLabelStyle().setScale(scale);
  		}
  	}

	function setModelScale(scaleVal){
		for ( var i in GE_Marker ){
			var scale = GE_Marker[i].model.getScale();
			scale.set(scaleVal,scaleVal,scaleVal);
		}
	}

	function dispPlane(){
		GE_moveMarker("AAAA", 35.797893,139.298014,1700,360,0,0,true);
	}

	function dispPlane2(){
		GE_moveMarker("AAAA", 35.897893,139.298014,10700,360,0,0,true);
	}


