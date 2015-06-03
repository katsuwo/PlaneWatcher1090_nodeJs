
var map = new Array();
var MAXPORTMAP = 30 * 90;
var airport = require('./airPort');
var res = MAXPORTMAP / 90;
var L,B,Z;

exports.init = function() {
	L = 0;
	B = 0;
	Z = 0;
	for (var i = 0; i <= MAXPORTMAP+2; i++) {
		map[i] = new Array();
	}
	for (var i = 0; i <= MAXPORTMAP+2; i++) {
		for (var l = 0; l <= MAXPORTMAP+2; l++) {
			map[i][l] = 0xff;
		}
	}

	var fs = require('fs');
	fs.readFile('./GlobalAirportDatabase_dos.txt', 'utf8', function (err, txt) {
		if (err){
			console.log("Airport data file read fail.");
			return;
		}
		var rows = txt.split('\n');
		for(var i in rows){
			var comp = rows[i].split(':');
			if (comp.length < 12) continue;
			var ap = new airport.Airport();
			ap.icao = comp[0];
			ap.iata = comp[1];
			ap.name = comp[2];
			ap.town = comp[3];
			ap.countory = comp[4];
			var grad = Number(comp[5]);
			var min = Number(comp[6]);
			var sec = Number(comp[7]);
			var k = grad + (min/60)+ (sec/3600);

			if ( k != 0.0 ){
				var SorN = comp[8];
				if(SorN == 'S'){
					ap.latitude = Math.radians(-k);
				}
				else {
					ap.latitude = Math.radians(k);					
				}

				var grad = Number(comp[9]);
				var min = Number(comp[10]);
				var sec = Number(comp[11]);
				var kk = grad + (min/60)+ (sec/3600);
				var EorW = comp[12];
				if(EorW == 'E'){
					ap.longitude = Math.radians(kk);
				}
				else {
					ap.longitude = Math.radians(-kk);					
				}
				putin(Math.degrees(ap.latitude),Math.degrees(ap.longitude));
			}
		}
	});
};

function putin(b,l){
	var sector = exports.test(b,l);
	var result = (sector == 0xff) || (sector ==Z);
	map[L+1][B+1] &= Z;
	return result;
}

exports.test = function(b,l){
	var tmpResult = makeLBZ(b,l);
	var result = (tmpResult & map[L+2][B+1] & map[L][B+1] & map[L+1][B+2] & map[L+1][B] &
                         map[L+2][B+2] & map[L][B] & map[L+2][B] &map[L][B+2])
	return result;
}

function makeLBZ(b,l) {
	if (l < 0.0) l += 360.0;
	if (l >= 360.0) l -= 360.0;
	L = Math.round(l * res);

 	if (b < -90.0) b += 180.0;
 	if (b >= 90.0) b -= 180.0;
	B = Math.round(b * res);
 	
	var dived = Math.floor(L / MAXPORTMAP);
	switch (dived) {
		case 0: Z = 0xfe; break;
		case 1: Z = 0xfd; break;
		case 2: Z = 0xfb; break;
		case 3: Z = 0xf7; break;
		default: break;
    }
    if ( B < 0) Z = ((Z & 0x0f) << 4 ) | 0x0f;
    L = L % MAXPORTMAP;
    B = (B + MAXPORTMAP) % MAXPORTMAP;
    L++;
    B++;
    return map[L+1][B+1];
}

//RJTT B:1068 L:1494

// Converts from degrees to radians.
Math.radians = function(degrees) {
  return degrees * Math.PI / 180;
};
 
// Converts from radians to degrees.
Math.degrees = function(radians) {
  return radians * 180 / Math.PI;
}

