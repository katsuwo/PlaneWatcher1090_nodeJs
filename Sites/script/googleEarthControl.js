	var GE_Marker = new Array();
	var GE_modelScale = 1.0;
	var GE_LabelScale = 1.5;
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

		var navcontrol = ge.getNavigationControl();
		navcontrol.setStreetViewEnabled(true);
		set3DBuildings(true);
		AJ_main();
	}

	function failureCB(errorCode) {
	}

	function GE_Aircraft(ac) {
    	var heading = ac.HEAD;
    	var lat = ac.LAT;
	   	var lng = ac.LNG;
       	var alt = ac.ALT * 0.3048;
       	var speed = ac.SPEED;
       	var flight = ac.FLIGHT;
       	var squawk = ac.SQUAWK;
       	var roll = ac.ROLL;
       	var pitch = -ac.PITCH;
       	var ground  = ac.GROUND;

		var model = ge.createModel('');
		var placemark = ge.createPlacemark('');

		placemark.setName(name);
		this.placemark = placemark;
		ge.getFeatures().appendChild(placemark);

		var loc = ge.createLocation('');
		var la = ge.getView().copyAsLookAt(ge.ALTITUDE_RELATIVE_TO_GROUND);
		loc.setLatitude(la.getLatitude());
		loc.setLongitude(la.getLongitude());
		model.setLocation(loc);

		var link = ge.createLink('');
//		link.setHref('http://sonic-labo.com/adsb_track/models/B777/B777.dae');
		link.setHref('http://sonic-labo.com/adsb_track/models/B777/simple_model.dae');
		model.setLink(link);
		this.model = model;
		this.placemark.setGeometry(model);

		if (ground == true){
			alt = 0;
			roll = 0;
			pitch = 0;
		}

		this.model.getLocation().setLatLngAlt( lat, lng, alt);
		var scale = this.model.getScale();
		scale.set(GE_modelScale,GE_modelScale,GE_modelScale);
//		this.orientation = this.model.getOrientation();
//		this.location = this.model.getLocation();
		this.model.setAltitudeMode(ge.ALTITUDE_ABSOLUTE);
		this.model.getOrientation().setHeading(0);

		this.lineStringPlacemark = ge.createPlacemark('');
		this.lineStringPlacemark.setStyleSelector(ge.createStyle(''));
		this.lineString = ge.createLineString('');
		this.lineString.setExtrude(false);
		if (ground == true){
			this.model.setAltitudeMode(ge.ALTITUDE_RELATIVE_TO_GROUND);
			this.lineString.setAltitudeMode(ge.ALTITUDE_RELATIVE_TO_GROUND);	
		}
		else {
			this.model.setAltitudeMode(ge.ALTITUDE_ABSOLUTE);
			this.lineString.setAltitudeMode(ge.ALTITUDE_ABSOLUTE);			
		}
		this.lineStringPlacemark.setGeometry(this.lineString);
			
		var lineStyle = this.lineStringPlacemark.getStyleSelector().getLineStyle();
		lineStyle.setWidth(3);
		lineStyle.getColor().set('8000ff00');
		ge.getFeatures().appendChild(this.lineStringPlacemark);

	 	//Create Placemark for Label
	  	var labelPlacemark = ge.createPlacemark('');
	  	labelPlacemark.setName(this.makeLabelContent(ac));
	  	var icon = ge.createIcon('');

	  	icon.setHref('http://sonic-labo.com/adsb_track/icon/clear.png');
	  	var style = ge.createStyle(''); //create a new style
	  	style.getIconStyle().setIcon(icon); //apply the icon to the style
	  	style.getLabelStyle().setScale(GE_LabelScale);	  	
	  	labelPlacemark.setStyleSelector(style); //apply the style to the placemark
		
	  	var point = ge.createPoint('');
		point.setLatitude(lat);
		point.setLongitude(lng);
		point.setAltitude(alt+ 10 * GE_LabelScale);
		point.setAltitudeMode(ge.ALTITUDE_ABSOLUTE);
	  	labelPlacemark.setGeometry(point);

	  	this.label = labelPlacemark;
	  	ge.getFeatures().appendChild(this.label);

	  	//Event Handler for label
	  	google.earth.addEventListener(labelPlacemark, 'click', function(event) {
	  		var tgt = event.getTarget();
	  		for ( var i in GE_labelMarker) {
	  			if (GE_labelMarker[i].icao == tgt.icao ){
	  				AJ_trackTarget = i;
	  				break;
	  			}
	  		}
	  	});

	  	//Event Handler for Model
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

    GE_Aircraft.prototype = {

    	makeLabelContent:function(ac) {
        	var heading = ac.HEAD;
        	var alt = ac.ALT.toString()+"ft";
        	var speed = ac.SPEED;
        	var flight = ac.FLIGHT;
        	var squawk = ac.SQUAWK;
        	if (ac.ALT ==0) alt ='GND';
        	if (flight == undefined || flight == "") flight = ac.ADDR;
 //       	return flight + ":"+squawk;
   	    	return flight + ":"+alt;
        },
        upDate:function(ac){
        	var heading = ac.HEAD;
    		var lat = ac.LAT;
	   		var lng = ac.LNG;
       		var alt = ac.ALT * 0.3048;
       		var speed = ac.SPEED;
       		var flight = ac.FLIGHT;
       		var squawk = ac.SQUAWK;
       		var roll = ac.ROLL;
       		var pitch = -ac.PITCH;
       		var ground = ac.GROUND;

			if (heading == null) {
				heading = 0;
			}
			heading-=180;
			if (ground == true){
				this.model.setAltitudeMode(ge.ALTITUDE_RELATIVE_TO_GROUND);
				this.lineString.setAltitudeMode(ge.ALTITUDE_RELATIVE_TO_GROUND);
				alt = 0;
				roll = 0;
				pitch = 0;	
			}
			else {
				this.model.setAltitudeMode(ge.ALTITUDE_ABSOLUTE);
				this.lineString.setAltitudeMode(ge.ALTITUDE_ABSOLUTE);			
			}
			this.model.getLocation().setLatLngAlt( lat, lng, alt );
			this.model.getOrientation().setHeading(heading);
			this.model.getOrientation().setRoll(roll);
			this.model.getOrientation().setTilt(pitch);

			this.label.setName(this.makeLabelContent(ac));
			var point = ge.createPoint('');
			point.setLatitude(lat);
			point.setLongitude(lng);
			point.setAltitude(alt+ 10 * GE_LabelScale);
			point.setAltitudeMode(ge.ALTITUDE_ABSOLUTE);
			this.label.setGeometry(point);
			this.lineString.getCoordinates().pushLatLngAlt(lat, lng, alt);

        },
        cameraCut:function(){
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
        },
        erase:function(){
			ge.getFeatures().removeChild(this.placemark);
    		ge.getFeatures().removeChild(this.lineStringPlacemark);
    		ge.getFeatures().removeChild(this.label);
        }
	}
	
	function GE_MarkerUpdate(ac){
		if (GE_Marker[ac.ADDR] == undefined) {
			GE_Marker[ac.ADDR] = new GE_Aircraft(ac);
		}
		else {
			var tmpAC = GE_Marker[ac.ADDR];
			tmpAC.upDate(ac);
		}
	}

	function GE_trackTarget(name){
		if ( GE_Marker[name] != undefined ) {
			GE_Marker[name].cameraCut();
		}
	}

	function GE_markerErase(delArray){
		for (var i in delArray){
			var name = delArray[i];
			if (GE_Marker[name] != undefined ) {
				GE_Marker[name].erase();
				delete GE_Marker[name];
			}
		}
	}
	
	function GE_setLabelScale(lScaleVal){
		GE_LabelScale = Number(lScaleVal)*1.5;
		for ( var i in GE_Marker ){
  			GE_Marker[i].label.getStyleSelector().getLabelStyle().setScale(GE_LabelScale);
  		}
  		console.log(GE_LabelScale.toString());
  	}

	function GE_setModelScale(scaleVal){
		GE_modelScale = scaleVal;
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


