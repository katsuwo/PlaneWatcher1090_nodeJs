	var CE_Marker = new Array();
	var CE_polylines;
	var CE_scene;
	var CE_primitives;
    var CE_polyline = new Array();
    var CE_initDone = false;
    var maximumLineLength = (1000 * 3);
    var clientType = "CE_"; //Cesium
    var C_trackTarget;
    var CE_modelScale = 1.0;
    var CE_labelScale = 0.6;
    var CE_showContrail = true;
    const CE_modelURL = 'model/simple.gltf';

    function CE_init() {
		CE_polylines = new Cesium.PolylineCollection(); 
		CE_scene = viewer.scene;
		CE_primitives = CE_scene.primitives;
		CE_primitives.add(CE_polylines);
		CE_initDone = true;
    }

    function CE_Aircraft(ac){
    	this.name = ac.ADDR;
    	var lat = ac.LAT;
    	var lng = ac.LNG;
        var heading = ac.HEAD;
        var alt = ac.ALT *  0.3048;
        var speed = ac.SPEED;
        var flight = ac.FLIGHT;
        var squawk = ac.SQUAWK;
	    var pitch = ac.PITCH;
	    var roll = ac.ROLL;

	    var position = Cesium.Cartesian3.fromDegrees(lng,lat, alt);
	    var heading = Cesium.Math.toRadians(heading);
	    var orientation = Cesium.Transforms.headingPitchRollQuaternion(position, heading, pitch, roll);
	    var labelPosition = Cesium.Cartesian3.fromDegrees(lng,lat, alt +30000*CE_modelScale);

	    if (flight == undefined){
//	        labelContents = name + ":" + squawk;
	        labelContents = name + ":" + alt;
	    }
	    else {
//	    	labelContents = flight + ':'+squawk;
	    	labelContents = flight + ':'+alt;
	    }

	    this.marker = viewer.entities.add({
	        name : name,
	        position : position,
	        orientation : orientation,
	        label:{
	        	text:this.makeLabelContent(ac),
	        	position:labelPosition,
//	        	font:'12px Helvetica',
//https://developer.mozilla.org/en-US/docs/Web/CSS/font
	        	font:'normal small-caps bolder 24px/10 Arial',
	
	        	fillColor : Cesium.Color.BLUE,
            	outlineColor : Cesium.Color.WHITE,
            	outlineWidth : 4, 
            	style : Cesium.LabelStyle.FILL_AND_OUTLINE,
	        	verticalOrigin: Cesium.VerticalOrigin.TOP,
		        scale:CE_labelScale,
		        pixelOffset:new Cesium.Cartesian2(0, -6 * (CE_modelScale/10))
	        },
	        model : {
	            uri:CE_modelURL,
	            minimumPixelSize:30,
		        scale:CE_modelScale
	        }
	    });

		var pts = new Array();
		var material = Cesium.Material.fromType('Color');
//		material.uniforms.color = new Cesium.Color(0.0,1.0,0.0,0.4);
		material.uniforms.color = new Cesium.Color(0.0,1.0,0.0,0.7);
		this.polyLine = CE_polylines.add({
			id : name,
			show : CE_showContrail,
			material:material,
		 	positions : pts,
		  	width : 2
		});
		this.polyLine.pointsSource = pts;
    }

    CE_Aircraft.prototype = {
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

    	upDate:function(ac) {
    		var heading = ac.HEAD;
    		var lat = ac.LAT;
	    	var lng = ac.LNG;
        	var alt = ac.ALT * 0.3048;
        	var speed = ac.SPEED;
        	var flight = ac.FLIGHT;
        	var squawk = ac.SQUAWK;
        	var roll = ac.ROLL;
        	var pitch = ac.PITCH;
	    	var position = Cesium.Cartesian3.fromDegrees(lng,lat, alt);
	    	var heading = Cesium.Math.toRadians(convertHeading(heading));
	    	var roll = Cesium.Math.toRadians(roll);
	    	var pitch = Cesium.Math.toRadians(pitch);	    
		    var orientation = Cesium.Transforms.headingPitchRollQuaternion(position, heading, roll, pitch);
		    this.marker.position = position;
	    	this.marker.orientation = orientation;
	    	this.marker.label.text = this.makeLabelContent(ac);

	    	var pt = this.polyLine.pointsSource;
			if (pt.length >= maximumLineLength) pt.splice(0,3);
			pt.push(lng, lat, alt);
			this.polyLine.pointsSource = pt;
			this.polyLine.positions=Cesium.Cartesian3.fromDegreesArrayHeights(pt);
    	},

		erase:function() {
    		viewer.entities.remove(this.marker.label);
			viewer.entities.remove(this.marker);
			CE_polylines.remove(this.polyLine);
    	}
    }

	function CE_MarkerUpdate(ac){
		if (CE_initDone == false) CE_init();
		if (CE_Marker[ac.ADDR] == undefined) {
			CE_Marker[ac.ADDR] = new CE_Aircraft(ac);
		}
		else {
			var tmpAC = CE_Marker[ac.ADDR];
			tmpAC.upDate(ac);
		}
	}

	function CE_destroyAircraft(delArray) {
		for (var i in delArray) {
			var name = delArray[i];
			if (CE_Marker[name] != undefined) {
				CE_Marker[name].erase();				
				delete CE_Marker[name];		
			}
		}
	}

	function convertHeading(heading) {
		var ret = heading + 180.0;
		if (ret > 360.0 ) ret -= 360.0
		return ret;
	}

	function disp(name) {
		console.log(name);
	}

	var degreesToRadians = function(val) { 
		return val*Math.PI/180; 
	} 

	function CE_trackMarker(target){

		var mk = CE_aircrafts[target]
		if (mk == undefined) return;
		viewer.trackedEntity = mk;
	}

	//centralBody._surface._tileLoadQueue.head === 'undefined';
	function checkBusy() {
		return "IDLE"
		var doneLoading = viewer.scene.globe._surface._tileLoadQueue;
		if (doneLoading.length == 0) return "IDLE";
			return "BUSY";
	}

	function countAC() {
		var　i = 0;
		for ( var ac in CE_aircrafts){
			i++;
		}
		disp(i);
	}

	function CE_setModelScale(scale) {
		for ( var name in CE_Marker){
			CE_Marker[name].marker.model.scale = scale; 
			CE_Marker[name].marker.label.pixelOffset = new Cesium.Cartesian2(0, -6 * (scale/10));
		}
		CE_modelScale = scale;
	}

	function CE_setLabelScale(scale) {
		for ( var name in CE_Marker){
			CE_Marker[name].marker.label.scale = scale; 
		}
		CE_labelScale = scale;
	}

	function CE_setShowContrail(flag) {
		for ( var name in CE_Marker){
			CE_Marker[name].polyLine.show = flag; 
		}
		CE_showContrail = flag;
	}


//-------------------- For test
	function createMany(){
		var lat = 52.628841;
		var lng = 0;
		for ( var i = 0 ; i < 1000 ; i++ ){
			 createAircraft(CE_modelURL,lng,lat,38000,0,i.toString());
			 lng += 0.1;
			 lat += 0.1;
		}
	}

	function CE_moveMarkerMany(){
		for ( var i = 0 ; i < 1000 ; i++ ){
			var ac = CE_aircrafts[i.toString()];
			var position = ac.position;
			var cartographicPosition = Cesium.Ellipsoid.WGS84.cartesianToCartographic(position)
			disp(cartographicPosition.latitude);
		}
	}

