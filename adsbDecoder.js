var net = require('net');
var ac = require('./aircraft');
var oldTotalPackets = 0;
var socket;
var geolib = require('geolib');

exports.aircrafts = new Array();
exports.eventEmitter;
exports.totalPackets = 0;
exports.pps = 0;
exports.totalAircraft = 0;
exports.PacketCaputre = false;
exports.decode = false;
exports.connect = false;
var isConnectWait = false;
var rawHost;
var rawPort;
var timerID;
var packetCountTimerID;
var rawServerConnectTimerID;
var portMap = require('./portMap');
portMap.init();

exports.startDecode = function(host, port) {
	rawHost = host;
	rawPort = port;
	console.log("start decode called");
	console.log("Host:"+host);
	console.log("Port:"+port);
	if (isConnectWait == true){
		console.log("Conenction command ignored. Now waiting for other connection.");
		return;
	}
	if ( packetCountTimerID != undefined && packetCountTimerID != null) clearTimeout(packetCountTimerID);
	packetCount();

	tryRawConnect();
	isConnectWait = true;
	timerID = setTimeout(function(){
		console.log('Raw connection timeup.');
		if (socket != null) socket.destroy();
		isConnectWait = false;
	},10000);

}
	
function tryRawConnect(){
	rawServerConnectTimerID = settimeout(function(){
		if ( exports.connect == false ){
			exports.connectRawServer(rawPort, rawHost);
		}
		tryRawConnect(); 
	},5000);
}

exports.connectRawServer = function(port,host){
	socket = net.createConnection(port, host, function(stream) {
		console.log("Create Raw message Connection");
	});

	socket.on('connect', function(data) {
		console.log("Connect Raw message server");
		exports.connect = true;
		isConnectWait = false;
		clearTimeout(timerID);
	});

	socket.on('error', function(data) {
		console.log("Raw message server connection error"+data);
		console.log("Host:" + host);
		console.log("Port:" + port);
		exports.connect = false;
		isConnectWait = false;
		clearTimeout(timerID);
	});

	socket.on('data', function(data) {
		exports.connect = true;
		if (exports.decode == false) return;
		if (exports.PacketCaputre == true ) {
			exports.eventEmitter.emit('RAWDATARECEIVE',data.toString());
		}
		exports.decodePackets(data.toString());
		isConnectWait = false;
		clearTimeout(timerID);
	});

	socket.on('close', function() {
		exports.connect = false;
	});
}


exports.terminateRawConnection = function(){
	console.log('raw connection terminated.');
	if (exports.connect == false) return;
	socket.destroy();
	exports.connect = false;
}

exports.decodePackets = function(data){
	var packets = data.split('\n');
	var i = 0;
	for ( var pc in packets){	
		var rcvString = packets[i++].toString().replace(/[\n\r]/g,"");
		if (rcvString.length == 0 ) continue;
		var firstChar = rcvString.substring(0,1);
		var lastChar = rcvString.substring(rcvString.length - 1, rcvString.length );
		if ( firstChar != '*' || lastChar != ';'){
			console.log("invalid packet");
			continue;
		}
		else {
			exports.totalPackets++;
			analyzeString(rcvString);		
		}
	}
}

function packetCount() {
	var tmpPPS = exports.totalPackets - oldTotalPackets;
	oldTotalPackets = exports.totalPackets;
	if ( tmpPPS < 0 ) tmpPPS = 0;
	exports.pps = tmpPPS;
	exports.eventEmitter.emit('PACKETCOUNTUPDATE',tmpPPS);

	packetCountTimerID = setTimeout(function(){
		packetCount();
	},1000);
}

function analyzeString(packets) {
	var packet = packets.substring(1,packets.length-1);
	var downlinkFormat = Number('0x' + packet.substr(0,2));
	var CACACF = downlinkFormat & 0x07;
	var df = downlinkFormat >> 3;

	if ( df == 5){
		analyzeDF5(packet);
	}
	else if ( df == 17 || 
   			( df == 18 && (CACACF == 0 || CACACF == 2 || CACACF == 3 || CACACF == 6)) ||
			( df == 19 && CACACF == 0 )) {
		analyzePositionMessage(packet,df);
	}
}

function analyzeDF5(DF5Packet) {
	var CRC = getCRC56Bits(DF5Packet);
	var apVal = Number('0x' + DF5Packet.substr(8,6));
	var aircraftAddress = (CRC ^ apVal).toString(16).toUpperCase();
	if (exports.aircrafts[aircraftAddress] == undefined ) return;
	var targetAC = exports.aircrafts[aircraftAddress];
	var idVal = Number('0x' + DF5Packet.substr(4,4));
	targetAC.updateSquawk(int2OctStr(sortOldCodeBit(idVal),4).toString()); 
}

function analyzePositionMessage(DF17Packet,df) {
	//CRC check
	var CRC = getCRC112Bits(DF17Packet);
	var rcvCRC = Number('0x' + DF17Packet.substr(22,6));
	if ( CRC != rcvCRC ) {
		console.log('Invalid CRC. CRC'+CRC.toString(16) + " RCVCRC:" +rcvCRC.toString(16));
		return ;
	}
	
	var tc = Number('0x' + DF17Packet.substr(8,2));
	var tcval = tc >> 3;
	var subType = tc & 0x07;
	var positionDecodeExec = false;
	var headingDecodeExec = false;
	var aircraftAddress = DF17Packet.substr(2,6);

	if (exports.aircrafts[aircraftAddress] == undefined ){
		exports.aircrafts[aircraftAddress] = new ac.Aircract();
		exports.aircrafts[aircraftAddress].icao = aircraftAddress;
		exports.totalAircraft++;
	}
	var targetAC = exports.aircrafts[aircraftAddress];

	//decode flight name
	if (tcval == 1 || tcval == 2 || tcval == 3 || tcval == 4) {
		var tempVal5 = Number('0x' + DF17Packet.substr(10,2));
		var tempVal6 = Number('0x' + DF17Packet.substr(12,2));
		var tempVal7 = Number('0x' + DF17Packet.substr(14,2));
		var tempVal8 = Number('0x' + DF17Packet.substr(16,2));
		var tempVal9 = Number('0x' + DF17Packet.substr(18,2));
		var tempVal10 = Number('0x' + DF17Packet.substr(20,2));
		var src1 = (tempVal5 & 0xfc) >> 2;
		var src2 = ((tempVal5 & 0x03) << 4) | (tempVal6 >> 4);
		var src3 = ((tempVal6 & 0x0f) << 2) | (tempVal7 >> 6);
		var src4 = tempVal7 & 0x3f;
		var src5 = (tempVal8 & 0xfc) >> 2;
		var src6 = ((tempVal8 & 0x03) << 4) | (tempVal9 >> 4);
		var src7 = ((tempVal9 & 0x0f) << 2) | (tempVal10 >> 6);
		var src8 = tempVal10 & 0x3f;
		var flight = convIdentChar(src1) + convIdentChar(src2) + convIdentChar(src3) + convIdentChar(src4) +
					convIdentChar(src5) + convIdentChar(src6) + convIdentChar(src7) + convIdentChar(src8);
		if (flight != '@@@@@@@@') targetAC.updateFlight(flight.trim());
	}

	//Surface Position
	else if (tcval == 5 || tcval == 6 || tcval == 7 || tcval == 8) {
		positionDecodeExec = true;
		targetAC.updateOnGround(true);
		var track = Number('0x' + DF17Packet.substr(11,2)) & 0x7f;
		targetAC.groundHeading = track * 360 / 128;

		var movement = Number('0x' + DF17Packet.substr(9,2)) & 0x7f;
        if (movement == 1) targetAC.groundSpeed = 0;
		else if (movement >= 2 && movement <= 8) targetAC.groundSpeed = 0.125 + (movement - 2) * 0.125;
		else if (movement >= 9 && movement <= 12) targetAC.groundSpeed = 1 + (movement - 9) * 0.25;
		else if (movement >= 13 && movement <= 38) targetAC.groundSpeed = 2 + (movement - 13) * 0.5;
		else if (movement >= 39 && movement <= 93) targetAC.groundSpeed = 15 + (movement - 39);
		else if (movement >= 94 && movement <= 108) targetAC.groundSpeed = 70 + (movement - 94) * 2;
		else if (movement >= 109 && movement <= 123) targetAC.groundSpeed = 100 + (movement - 109) * 5;
		else if (movement == 124 ) targetAC.groundSpeed = 124;

		console.log("surfaceHeading:"+targetAC.groundHeading.toString());
    }
  
	// AirBorne Position
	else if (tcval == 9 || tcval == 10 || tcval == 11 || tcval == 12 || tcval == 13 || tcval == 14 || tcval == 15 || tcval == 16 || tcval == 17 || tcval == 18 ||
        tcval == 20 || tcval == 21 || tcval == 22) {
		positionDecodeExec = true;
		targetAC.updateOnGround(false);
	}
  
  	else if (tcval == 19) {
		headingDecodeExec = true;
 	}
  
	if ( headingDecodeExec == true ){
		//subType 0 -
		//subType 1 groundspeed subsonic
		//subType 2 groundspeed supersonic
		if (subType == 1 || subType == 2) {
			var westVal =  Number('0x' + DF17Packet.substr(10,4));
			var directionWest = ((westVal & 0x0400) != 0 ) ? true : false;
 			var speedWest = westVal & 0x03ff;
			if ( subType == 2 && speedWest != 0 ){
				speedWest = (( speedWest - 1.0 ) * 4.0 ) + 1.0;
			}
			var southVal = Number('0x' + DF17Packet.substr(14,4));
			var directionSouth = ((southVal & 0x8000) != 0 ) ? true : false;
            var speedSouth = (southVal & 0x7fe0) >> 5;
			if ( speedWest + speedSouth > 0 ) {
				if ( directionWest ==  true ) {
					speedWest = -(speedWest -1);
				}
				else {
					speedWest = (speedWest - 1);
				}
			
				if ( directionSouth == true ) {
					speedSouth = -(speedSouth -1);
				}
				else {
					speedSouth = speedSouth -1;
				}
				var vect_A = speedSouth * speedSouth;
				var vect_B = speedWest * speedWest;
				var heading = Math.floor(Math.atan2(speedWest,speedSouth) / ( Math.PI / 180.0 ));
				if ( heading < 0) heading += 360;
				targetAC.updateSpeed(Math.floor(Math.sqrt(vect_A + vect_B)));
				targetAC.updateHeading(heading);
			}
		}
		var sign = (Number('0x' + DF17Packet.substr(16,2)) & 0x08) ? true : false ;
		var vSpeed = (Number('0x' + DF17Packet.substr(16,2)) & 0x07) << 6 | 
					 (Number('0x' + DF17Packet.substr(18,2)) & 0xfc) >> 2;
		if (vSpeed){
			if (sign == true){
				targetAC.updateVerticalSpeed((vSpeed-1)*64);
			}
			else {
				targetAC.updateVerticalSpeed((vSpeed-1)*-64);			
			}
		}
	}
	
	if ( positionDecodeExec == true ) {
		var altVal = Number('0x' + DF17Packet.substr(10,3));
		var altFt = decodeAltitude(altVal);
		var TF = Number('0x' + DF17Packet.substr(13,1));
		var fFlag = (( TF & 0x04 ) == 0x04 ) ? true : false;
		var lat = ((Number('0x' + DF17Packet.substr(13,5))) & 0x3ffff) >> 1;
		var lng = (Number('0x' + DF17Packet.substr(17,5))) & 0x1ffff;
		if ( fFlag == false ){
			targetAC.lat_0 = lat;
			targetAC.lng_0 = lng;
			targetAC.time_0 = new Date().getTime();
		}
		else {
			targetAC.lat_1 = lat;
			targetAC.lng_1 = lng;
			targetAC.time_1 = new Date().getTime();			
		}
		if ( targetAC.time_0 != 0 && targetAC.time_1 != 0){
			var intval = Math.abs( targetAC.time_0 - targetAC.time_1);
			if ( intval < 10000 ) {
				if ( targetAC.onGround == targetAC.oldOnGround ) {
					if ( targetAC.lat_0 != 0.0 && targetAC.lat_1 != 0.0 && 
						targetAC.lng_0 != 0.0 & targetAC.lng_1 != 0.0 ) {
						updatePosition(targetAC,altFt);
					}
				}
			}
		}
	}
}

function updatePosition(targetAC,alt) {
	var cprlat_even = targetAC.lat_0 / 131072.0;
	var cprlat_odd = targetAC.lat_1 / 131072.0;
	var cprlng_even = targetAC.lng_0 / 131072.0;
	var cprlng_odd = targetAC.lng_1 / 131072.0;
	var cpr_world = 360.0;
	if ( targetAC.onGround == true ) {
		cpr_world = 90.0;
	}
	var air_d_lat_even = cpr_world / 60.0;
	var air_d_lat_odd = cpr_world / 59.0;
	var j = Math.floor(59.0 * cprlat_even  - 60.0 * cprlat_odd + 0.5);
	var lat_even = correctLat(air_d_lat_even * ((j % 60) + cprlat_even));
	var lat_odd = correctLat(air_d_lat_odd * ((j % 59) + cprlat_odd));
	if (( Math.abs(lat_even) > 90.0 || Math.abs(lat_odd) > 90.0 ) && targetAC.onGround ) return;
	if (getNL(lat_even) != getNL(lat_odd)) return;
	
	var lon = 0;
	var lat = 0;
	var dlon = 0;
	
	if ( targetAC.time_0 > targetAC.time_1 ) {
		
		// even Frame
		var ni = cprN( lat_even, 0 );
		if ( targetAC.onGround == true ){
			dlon = 90.0 / ni;
		}
		else {
			dlon = 360.0 / ni;
		}
		var m = Math.floor(cprlng_even * (getNL(lat_even) - 1) -
							cprlng_odd * getNL(lat_even) + 0.5 );
		lon = dlon * (pMod( m, ni ) + cprlng_even);
		lat = lat_even;
	}
	else {
	
		//odd Frame	
		var ni = cprN( lat_odd, 1 );
		if ( targetAC.onGround == true ){
			dlon = 90.0 / ni;
		}
		else {
			dlon = 360.0 / ni;
		}
		var m = Math.floor(cprlng_even * (getNL(lat_odd) - 1) -
							cprlng_odd * getNL(lat_odd) + 0.5 );
		lon = dlon * (pMod( m, ni ) + cprlng_odd);
		lat = lat_odd;
	}
	
	if ( targetAC.onGround == true) {
		console.log("-------------GROUND------------");
		var result = portMap.test(lat,lon);
		switch (result) {
			case 0xfe: break;
			case 0xfd: lon += 90.0; break;
			case 0xfb: lon += 180.0; break;
			case 0xf7: lon += 270.0; break;
			case 0xef: lat -= 90.0; break;
			case 0xdf: lat -= 90.0; lon += 90.0; break;
			case 0xbf: lat -= 90.0; lon += 180.0; break;
			case 0x7f: lat -= 90.0; lon += 270.0; break;
			default: break;
		}
		console.log(result.toString(16) +":  " + lat.toString() +" "+ lon.toString()); 
	}

	var distKM = geolib.getDistance({latitude:lat,longitude:lon},
								  {latitude:targetAC.latitude,longitude:targetAC.longitude}) / 1000;
	if (distKM >= 300 && targetAC.latitude != 0.0 && targetAC.longitude != 0.0) return;
	targetAC.updatePosition( lat, lon, alt);
	exports.eventEmitter.emit('AIRCRAFTPOSITIONUPDATE',targetAC);
}

function int2OctStr(param,len) {
	var mask = 0;
	var result = '';
	if ( param < 0 ) return '';
	while(1){
		mask = param & 7;
		param = param >> 3;
		result = mask.toString() + result;
		len--;
		if ( len < 1 && param == 0) break;
	}
	return result;
}

function cprN(lat,isOdd) {
	var nl = getNL(lat) - isOdd;
	if ( nl > 1) return nl;
	return 1;
}

function pMod(a,b) {
	var ret = ( a % b);
	if ( a < 0){
		ret += b;
	}
	return ret;
}

function correctLat(lat) {
	var ret = lat;
	if (lat > 90.0) ret = lat - 360.0;
	if (lat < -90.0) ret = lat + 360.0;
	return ret;
}

function getNL(rlat) {
	var lat = Math.abs(rlat);
	var NLlat = 0;
	  if (lat < 10.47047130) NLlat = 59;
    else if (lat < 14.82817437) NLlat = 58;
    else if (lat < 18.18626357) NLlat = 57;
    else if (lat < 21.02939493) NLlat = 56;
    else if (lat < 23.54504487) NLlat = 55;
    else if (lat < 25.82924707) NLlat = 54;
    else if (lat < 27.93898710) NLlat = 53;
    else if (lat < 29.91135686) NLlat = 52;
    else if (lat < 31.77209708) NLlat = 51;
    else if (lat < 33.53993436) NLlat = 50;
    else if (lat < 35.22899598) NLlat = 49;
    else if (lat < 36.85025108) NLlat = 48;
    else if (lat < 38.41241892) NLlat = 47;
    else if (lat < 39.92256684) NLlat = 46;
    else if (lat < 41.38651832) NLlat = 45;
    else if (lat < 42.80914012) NLlat = 44;
    else if (lat < 44.19454951) NLlat = 43;
    else if (lat < 45.54626723) NLlat = 42;
    else if (lat < 46.86733252) NLlat = 41;
    else if (lat < 48.16039128) NLlat = 40;
    else if (lat < 49.42776439) NLlat = 39;
    else if (lat < 50.67150166) NLlat = 38;
    else if (lat < 51.89342469) NLlat = 37;
    else if (lat < 53.09516153) NLlat = 36;
    else if (lat < 54.27817472) NLlat = 35;
    else if (lat < 55.44378444) NLlat = 34;
    else if (lat < 56.59318756) NLlat = 33;
    else if (lat < 57.72747354) NLlat = 32;
    else if (lat < 58.84763776) NLlat = 31;
    else if (lat < 59.95459277) NLlat = 30;
    else if (lat < 61.04917774) NLlat = 29;
    else if (lat < 62.13216659) NLlat = 28;
    else if (lat < 63.20427479) NLlat = 27;
    else if (lat < 64.26616523) NLlat = 26;
    else if (lat < 65.31845310) NLlat = 25;
    else if (lat < 66.36171008) NLlat = 24;
    else if (lat < 67.39646774) NLlat = 23;
    else if (lat < 68.42322022) NLlat = 22;
    else if (lat < 69.44242631) NLlat = 21;
    else if (lat < 70.45451075) NLlat = 20;
    else if (lat < 71.45986473) NLlat = 19;
    else if (lat < 72.45884545) NLlat = 18;
    else if (lat < 73.45177442) NLlat = 17;
    else if (lat < 74.43893416) NLlat = 16;
    else if (lat < 75.42056257) NLlat = 15;
    else if (lat < 76.39684391) NLlat = 14;
    else if (lat < 77.36789461) NLlat = 13;
    else if (lat < 78.33374083) NLlat = 12;
    else if (lat < 79.29428225) NLlat = 11;
    else if (lat < 80.24923213) NLlat = 10;
    else if (lat < 81.19801349) NLlat = 9;
    else if (lat < 82.13956981) NLlat = 8;
    else if (lat < 83.07199445) NLlat = 7;
    else if (lat < 83.99173563) NLlat = 6;
    else if (lat < 84.89166191) NLlat = 5;
    else if (lat < 85.75541621) NLlat = 4;
    else if (lat < 86.53536998) NLlat = 3;
    else if (lat < 87.00000000) NLlat = 2;
    else NLlat = 1;

    return NLlat;
}

function decodeAltitude(alt) {
	var altCode = 0;
	var altFt = 0;
	if (( alt & 0x10 ) == 0 ) {
		altCode = sortCodeBit(alt);
		altFt = decodeGrayCode(altCode);
	}
	else {
		var tmpAlt = (( alt & 0xfe0 ) >> 1 ) | ( alt & 0x00f);
		altFt = tmpAlt * 25 - 1000;
	}
	return altFt;
}

function getCRC56Bits(pckt) {
	var poly = 0xFFFA0480;
	var cdata = Number('0x' + pckt.substr(0,8));
	for (var i = 0; i < 32; i++) {
		if ((cdata & 0x80000000) != 0) cdata = cdata ^ poly;
		cdata = cdata << 1;
	}
	return (cdata >>> 8);
}

function getCRC112Bits(pckt) {
	var poly = 0xFFFA0480;
	var cdata,cdata1,cdata2;
	cdata = Number('0x' + pckt.substr(0,8));
	cdata1 = Number('0x' + pckt.substr(8,8));
	cdata2 = (Number('0x' + pckt.substr(16,6))) << 8;
	for (var i = 0; i < 88; i++) { 
		if ((cdata & 0x80000000) != 0) cdata = cdata ^ poly;
		cdata = cdata << 1;
		if ((cdata1 & 0x80000000) != 0) cdata |= 0x01;
		cdata1 = cdata1 << 1;
		if ((cdata2 & 0x80000000) != 0) cdata1 |= 0x01;
		cdata2 = cdata2 << 1;
	}
	return (cdata >>> 8);
}

function sortCodeBit(code) {
	var result =
    (((code & 0x004) >> 8) |
     ((code & 0x001) >> 9) |
     ((code & 0x400) >> 2) |
     ((code & 0x100) >> 1) |
     ((code & 0x040)     ) |
     ((code & 0x020)     ) |
     ((code & 0x008) >> 1) |
     ((code & 0x002) >> 2) |
     ((code & 0x800) >> 9) |
     ((code & 0x200) >> 8) |
     ((code & 0x080) >> 7));
    return result;
}

function sortOldCodeBit(code) {
	var result =   
	((code & 0x080) << 4 ) |
	((code & 0x200) << 1 ) |
	((code & 0x800) >> 2 ) |
	
	((code & 0x002) << 7 ) |
	((code & 0x008) << 4 ) |
	((code & 0x020) << 1 ) |
	
	((code & 0x100) >> 3 ) |
	((code & 0x400) >> 6 ) |
	((code & 0x1000)>> 9 ) |
	
	((code & 0x001) << 2 ) |
	((code & 0x004) >> 1 ) |
	((code & 0x010) > 4 );
	
	return result;
}

function decodeGrayCode(wert) {
	var mask = 0x80;
	var copyBit = false;
	var result = 0;
	for ( var k = 1; k <= 16; k++) {
		if (( wert & mask )  != 0 ) {
			copyBit = (copyBit == true) ? false : true;
		}
		if ( copyBit == true){
			result = (result | mask);
		}
		mask = mask >> 1;
	}
	return result;
}

function convIdentChar(param) {
	var result = 0;
	if ( param <= 26) {
		result = (param - 1 + 'A'.charCodeAt(0));
	}
	else if (param == 0x20) {
        result = ' '.charCodeAt(0);
    }
  	else if (param >= 0x30 && param <= 0x39) {
        result = param;
    }
    else {
        result = ' '.charCodeAt(0);
    }
	return String.fromCharCode(result);
}

