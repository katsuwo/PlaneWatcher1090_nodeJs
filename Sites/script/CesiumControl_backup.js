	var CE_aircrafts = new Array();
	var CE_polylines;
	var CE_scene;
	var CE_primitives;
    var CE_polyline = new Array();
    var CE_initDone = false;
    var maximumLineLength = (1000 * 3);
    var clientType = "CE_"; //Cesium
    var C_trackTarget;
    var CE_modelScale = 1.0;
    var CE_labelScale = 1.0;
    const CE_modelURL = 'model/simple.gltf';

    function CE_init() {
		CE_polylines = new Cesium.PolylineCollection(); 
		CE_scene = viewer.scene;
		CE_primitives = CE_scene.primitives;
		CE_initDone = true;
 		CE_primitives.add(CE_polylines);
   }

	function CE_createMarker(name,flight,lng,lat,alt,heading,roll,pitch) {
		if (CE_initDone == false) CE_init();
		if (CE_aircrafts[name] != undefined) return;

	    var position = Cesium.Cartesian3.fromDegrees(lng,lat, alt);
	    var heading = Cesium.Math.toRadians(heading);
	    var pitch = 0;
	    var roll = 0;
	    var orientation = Cesium.Transforms.headingPitchRollQuaternion(position, heading, pitch, roll);
	    var labelPosition = Cesium.Cartesian3.fromDegrees(lng,lat, alt + 200);
	    var labelContents;
	    if (flight == undefined){
	        labelContents = name;
	    }
	    else {
	    	labelContents = name + ':'+flight;
	    }

	    var entity = viewer.entities.add({
	        name : name,
	        position : position,
	        orientation : orientation,
	        label:{
	        	text : labelContents,
	        	position: labelPosition,
	        	font : '12px Helvetica',
	        	verticalOrigin: Cesium.VerticalOrigin.TOP,
		        scale:CE_labelScale
	        },
	        model : {
	            uri : CE_modelURL,
	            minimumPixelSize : 1,
		        scale:CE_modelScale
	        }
	    });
	    track = viewer.trackedEntity;
//	    viewer.trackedEntity = entity;
	    CE_aircrafts[name] = entity;

	    //make a contrail(polyline)
	    CE_makeLine(name);
	    CE_extendLine(name, lng, lat, alt);
	}

	function CE_moveMarker(name, flight, lng, lat, alt, heading, roll, pitch) {
		if (CE_aircrafts[name] == undefined) CE_createMarker(name,flight,lng,lat,alt,heading,roll,pitch);
	    var position = Cesium.Cartesian3.fromDegrees(lng,lat, alt);
	    var heading = Cesium.Math.toRadians(convertHeading(heading));
	    var roll = Cesium.Math.toRadians(roll);
	    var pitch = Cesium.Math.toRadians(pitch);
	    var ac = CE_aircrafts[name];
	    
	    if ( ac == undefined ) return;
	    var orientation = Cesium.Transforms.headingPitchRollQuaternion(position, heading, pitch, roll);
	    ac.position = position;
	    ac.orientation = orientation;

	    //extend contrail
	    CE_extendLine(name, lng, lat, alt);
	}

	function CE_destroyAircraft(delArray) {

		for (var i in delArray) {
			var name = delArray[i];
			if (CE_aircrafts[name] == undefined) return;

			//delete label 
			viewer.entities.remove(CE_aircrafts[name].label);

			//Delete Aircraft
			viewer.entities.remove(CE_aircrafts[name]);
			delete CE_aircrafts[name];		

			//delete Contrail
			if (CE_polyline[name] == undefined) return;
			CE_polylines.remove(CE_polyline[name]);			
		}
	}

	function CE_makeLine(name) {
		var pts = new Array();
		var material = Cesium.Material.fromType('Color');
		material.uniforms.color = new Cesium.Color(0.0,1.0,0.0,0.4);
		CE_polyline[name] = CE_polylines.add({
			id : name,
			show : true,
			material:material,
		 	positions : pts,
		  	width : 2
		});
		CE_polyline[name].pointsSource = pts;
//		CE_primitives.add(CE_polylines);
	}
	//参考
	//https://groups.google.com/forum/#!topic/cesium-dev/CclK7a5cLmI
	function CE_extendLine(name, lng, lat, alt) {
		var pt = CE_polyline[name].pointsSource;

		//length of Contrail limitaion
		if (pt.length >= maximumLineLength) pt.splice(0,3);

		pt.push(lng, lat, alt);
		CE_polyline[name].pointsSource = pt;
		CE_polyline[name].positions=Cesium.Cartesian3.fromDegreesArrayHeights(pt);
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
		for ( var name in CE_aircrafts){
			CE_aircrafts[name].model.scale = scale; 
		}
		CE_modelScale = scale;
	}

	function CE_setLabelScale(scale) {
		for ( var name in CE_aircrafts){
			CE_aircrafts[name].label.scale = scale; 
		}
		CE_labelScale = scale;
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

