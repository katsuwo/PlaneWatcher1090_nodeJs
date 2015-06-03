
//start ADS-B Decode
var eventEmitter = require('events').EventEmitter;
var emitter = new eventEmitter();
var playEventEmitter = new eventEmitter();

//var rawHost = "localhost";
//decoder.startDecode("sdrsharp.com",47806);
var rawHost = "192.168.10.5";
var rawPort = 30002;
var decoder = require('./adsbDecoder');
decoder.eventEmitter = emitter;
decoder.PacketCaputre = false;
decoder.decode = true;
decoder.startDecode(rawHost,rawPort);

var logLevel = 2;
var socketio = require('socket.io');
var io;
var sock;
var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var cache = {};
var db;
var recordNum = 0;
var recMemo;
var recStartTime = 0;
var recEndTime = 0;
var dateformat = require('dateformat');
var rePlayPacketList;
var oldTime = 0;
var isPlayPacket = false;
var geolib = require('geolib');
var packetCountHistory = new Array(24 * 6);
var trackCountHistory = new Array(24 * 6);

var receiverLocation = {
	latitude:35.7978189,
	longitude:139.2972058
};

var directionAndDinstance = new Array(36*10);

var maxRangeLocation = new Array(360);

init();
function init(){
	for( var i = 0 ; i < packetCountHistory.length;i++){
		packetCountHistory[i] = 0;
		trackCountHistory[i] = 0;
	}

	for( var i = 0 ; i < directionAndDinstance.length;i++){
		directionAndDinstance[i] = 0;
	}

	for( var i = 0 ; i < maxRangeLocation.length;i++){
		maxRangeLocation[i] = receiverLocation;
	}
	initDb();	
}

function initDb(){
	var sqlite3 = require("sqlite3").verbose();
	db = new sqlite3.Database("./packetCapture.sqlite");
	db.serialize(function(){
		db.all("select count(*) from sqlite_master where type='table' and name='capture'", function(err, rows){
			var rslt =rows[0]; 
			if ( rslt['count(*)'] == 0 ){
				db.run("CREATE TABLE capture (id INTEGER PRIMARY KEY AUTOINCREMENT, recordnum INTEGER, packet TEXT, time INTEGER)");
				db.run("CREATE TABLE list ( id INTEGER PRIMARY KEY AUTOINCREMENT, recordnum INTEGER, start INTEGER, end INTEGER, memo TEXT)");
				console.log("create capture & list tables. ");
			}
			else {
				console.log("Tables already exists.");
			}

			//get Next Record Num
			db.all("select max(recordnum) from capture", function(err, rows){
				if (rows != undefined){
					console.log(rows);
					recordNum  = rows[0]['max(recordnum)']+1;
					console.log("NextRecordNum:"+recordNum.toString());
				}
				else {
					recordNum = 1;
				}
/*
	var json = require('./arraydata.json');
	var total = json.length;
	for (var i in json){
		var data = json[i].packet;
		var time = json[i].time;
		var num = json[i].recordID;
		db.run("INSERT INTO capture (recordnum, packet,time) VALUES(?,?,?)",num,data,time);
		console.log(i.toString()+"/"+total.toString());
	}
	var recStartTime = dateformat(new Date(), "yyyy/mm/dd HH:MM:ss");
	var recEndTime = dateformat(new Date(), "yyyy/mm/dd HH:MM:ss");
	db.run("INSERT INTO list (recordnum,start, end, memo) VALUES(?,?,?,?)",1,recStartTime,recEndTime,"袖ヶ浦テストデータ1");
	db.run("INSERT INTO list (recordnum,start, end, memo) VALUES(?,?,?,?)",2,recStartTime,recEndTime,"袖ヶ浦テストデータ2");
	db.run("INSERT INTO list (recordnum,start, end, memo) VALUES(?,?,?,?)",3,recStartTime,recEndTime,"京浜島テストデータ1");
	db.run("INSERT INTO list (recordnum,start, end, memo) VALUES(?,?,?,?)",4,recStartTime,recEndTime,"京浜島テストデータ2");
	db.run("INSERT INTO list (recordnum,start, end, memo) VALUES(?,?,?,?)",8,recStartTime,recEndTime,"京浜島テストデータ3");
*/
				//start Http(Socket)Server					
				startHttpServer();
			});
		});
	})
}


var server = http.createServer(function(request,response){
	var filePath = false;
	if ( request.url == '/') {
		filePath = 'Sites/index.html';
	}
	else {
		filePath = 'Sites' + request.url;
	}
	var absPath = './' + filePath;
	serveStatic(response, cache, absPath);
	console.log("Request Page:"+request.url);
});


function startHttpServer(){
	server.listen(3000,function(){
		console.log("Http Server Listen Start on Port 3000");
	});
	io=require('socket.io').listen(server);
	io.set('log level',1);
	io.sockets.on('connection',function(socket){

		//send all aircraft data when client connect to server
		socket.join('CLIENT');
		sock = socket;
		console.log("client connect.");
		console.log("send all aircraft data.");
		for ( var name in decoder.aircrafts) {
			var dat = buildData(decoder.aircrafts[name]);
			if (dat.LAT == 0.0 && dat.LNG == 0.0) continue;
			if (logLevel == 1 )console.log(dat);
			socket.emit('AIRCRAFTDATA',dat);
		}
		checkAircraftErase();

		socket.on('REQ_RCVSTATUS',function(data){
			var rcvStatus = {
				TOTAL:decoder.totalPackets,
				PPS:decoder.pps,
				TRACKINGAC:Object.keys(decoder.aircrafts).length,
				TOTALAC:decoder.totalAircraft,
				REC:decoder.PacketCaputre,
				PLAYING:isPlayPacket
			};
			socket.emit('RCVSTATUS',rcvStatus);
		});

		socket.on('REQ_FILELIST',function(){
			console.log("FILESET REQ");
			getRecordFileList(socket);
		});

		socket.on('REQ_HOSTINFO',function(){
			var result = {
				ADDR:rawHost,
				PORT:rawPort
			};
			socket.emit('RAWHOST',result);			
		});

		socket.on('REQ_RECSTART',function(memo){
			recMemo = memo.memo;
			console.log("RecStart MEMO:",recMemo);
			recStartTime = dateformat(new Date(), "yyyy/mm/dd HH:MM:ss");
			console.log(recStartTime);
			decoder.PacketCaputre = true;
		});
		socket.on('REQ_RECEND',function(){
			console.log("RecEnd");
			recEndTime = dateformat(new Date(), "yyyy/mm/dd HH:MM:ss");
			db.run("INSERT INTO list (recordnum,start, end, memo) VALUES(?,?,?,?)",recordNum,recStartTime,recEndTime,recMemo);
			decoder.PacketCaputre = false;
			getRecordFileList(socket);
			recordNum++;
		});

		socket.on('REQ_PLAYSTART',function(playID){
			console.log("Play Request Recieved:"+playID.toString());
			db.all("select * from capture where recordNum = " + playID.id.toString(), function(err, rows){
				if (rows.length) {
					decoder.decode = false;
					decoder.aircrafts = new Array();
					console.log("Total Packets:"+rows.length.toString());
					rePlayPacketList = rows;
					isPlayPacket = true;
					playEventEmitter.emit("PLAY",0);
				}
			});
		});
		socket.on('REQ_PLAYSTOP',function(){
			decoder.decode = true;
			isPlayPacket = false;
		});
		socket.on('REQ_RECORDDELETE',function(delID){
			db.all("DELETE from capture where recordNum = " + delID.id.toString(), function(err, rows){
				db.all("DELETE from list where recordNum = " + delID.id.toString(), function(err, rows){
					getRecordFileList(socket);
				});
			});
		});
		socket.on('REQ_ANA_HISTORY',function(){
			var result = {
				HISTORY:packetCountHistory,
				TRACK:trackCountHistory,
				DANDD:directionAndDinstance,
				MAXRANGELOC:maxRangeLocation
			};
			socket.emit('ANA_HISTORY',result);			
		});

	});	
}

playEventEmitter.on("PLAY",function(i){
	if ( i == rePlayPacketList.length ) {
		decoder.decode = true;
		isPlayPacket = false;
		return;
	}
	var packet = rePlayPacketList[i].packet;
	var time = rePlayPacketList[i].time;
	var intval = ( i == 0 ) ? 0 : time - oldTime;
	oldTime = time;
	if (logLevel <= 2 ) console.log(i.toString() + "/" + rePlayPacketList.length.toString() +": " +packet);
	if (isPlayPacket == true) {
		setTimeout(function(){
			decoder.decodePackets(packet);
			playEventEmitter.emit("PLAY",++i);
		},intval);								
	}
});

emitter.on('AIRCRAFTPOSITIONUPDATE',function(tempAC){
	if (logLevel == 1 )console.log(tempAC);
	if (tempAC.latitude == 0.0 && tempAC.longitude == 0.0) return;
	if(tempAC.onGround == true){
		tempAC.heading = tempAC.groundHeading;
		tempAC.speed = tempAC.groundSpeed;
		tempAC.altitude = 0;	
	}
	var dat = buildData(tempAC);
	if (io != undefined){
		io.emit('AIRCRAFTDATA',dat);
	}

	//for Analytics
	var dir = calcAngle(receiverLocation.latitude,receiverLocation.longitude,dat.LAT,dat.LNG);
	var direction = Math.floor(dir / 10);
 	var newLoc = {latitude:dat.LAT, longitude:dat.LNG};
	var dist = geolib.getDistance(
			{	
				latitude:receiverLocation.latitude,
				longitude:receiverLocation.longitude
			},newLoc ) / 1000;
	if (dist > 200 ) dist = 200;
    var distance = Math.floor(dist / 20);
    if ( distance > 9) distance = 9;
    var arrayPos = (distance * 36) + direction;
 	directionAndDinstance[arrayPos] += 1; 

 	arrayPos = Math.floor(dir);
 	var oldLoc = maxRangeLocation[arrayPos];
 	var oldRange = geolib.getDistance(receiverLocation,oldLoc);
 	var newRange = geolib.getDistance(receiverLocation,newLoc);
	if ( oldRange < newRange) {
		maxRangeLocation[arrayPos] = newLoc;
	} 	
});

emitter.on('RAWDATARECEIVE',function(data){
	console.log(data);
	var time = new Date().getTime();
	db.run("INSERT INTO capture (recordnum, packet,time) VALUES(?,?,?)",recordNum,data,time);
});

emitter.on('PACKETCOUNTUPDATE',function(data){
	var hour = new Date().getHours().toString();
	var min = new Date().getMinutes().toString();
	var hourPos = hour * ( 60 / 10 );
	var minPos = Math.floor(min / 10);
	var readPos = hourPos + minPos;
	var tmp = packetCountHistory[readPos];
	if (tmp == undefined) tmp = 0;
	packetCountHistory[readPos] = tmp + data;
	console.log("P:"+tmp.toString());
	trackCountHistory[readPos] = decoder.totalAircraft;
});


function getRecordFileList(socket){
	db.all("select * from list", function(err, rows){
		if (err == null){
			console.log(rows.length.toString());
			var fileList = new Array();
			for (var i = 0 ; i < rows.length.toString(); i++){
				var tmpRecord = rows[i];
				fileList.push({
					RECORDID:tmpRecord.recordnum,
					START:tmpRecord.start,
					END:tmpRecord.end,
					MEMO:tmpRecord.memo
				});
			}
			console.log(fileList);
			socket.emit('FILELIST',fileList);
		}
	});
}

function checkAircraftErase() {
	var delArray = new Array();
	for (var name in decoder.aircrafts) {
	
		var tmpAC = decoder.aircrafts[name];
		if (tmpAC.checkNeedErase() == 'ERASENOTIFY') {
			delArray.push(name);
			if (logLevel <= 2 ) console.log("EraseNotify:" + name + ':' + tmpAC.flight);
		}
		if (tmpAC.checkNeedErase() == 'ERASEFROMARRAY') {
			delete decoder.aircrafts[name];
			if (logLevel <= 2 ) console.log("EraseFromArray:" + name + ':' + tmpAC.flight);
		}
	}
	if (delArray.length) {
		io.emit('AIRCRAFTERASE',delArray);		
	}
	setTimeout(function(){
		checkAircraftErase();
	},5000);
}


function buildData(tmpAC){
	var data ={
		ADDR:tmpAC.icao,
		LAT:tmpAC.latitude,
		LNG:tmpAC.longitude,
		ALT:tmpAC.altitude,
		HEAD:tmpAC.heading,
		SPEED:tmpAC.speed,
		FLIGHT:tmpAC.flight,
		SQUAWK:tmpAC.squawk,
		ROLL:tmpAC.roll,
		PITCH:tmpAC.pitch,
		GROUND:tmpAC.onGround,				
		LINEEXTEND:true
	};
	return data;
}

function send404(response) {
	response.writeHead(404,{'Content-Type':'text/plain'});
	response.write('Error 404: Resource not found.');
	response.end();
}

function sendFile(response, filePath, fileContents) {
	response.writeHead(200, {'Content-Type':mime.lookup(path.basename(filePath))});
	response.end(fileContents);
}

function serveStatic(response, cache, absPath) {
	if (cache[absPath]) {
		sendFile(response,absPath,cache[absPath]);
	}
	
	else {
		fs.exists(absPath, function(exists) {
			if (exists) {
				fs.readFile(absPath,function(err,data){
					if (err){
						send404(response);
					}
					else {
						cache[absPath] = data;
						sendFile(response,absPath,data);
					}
				});
			}
			else {
				send404(response);
			}
		});
	}
}

function calcAngle(nLat1,nLon1,nLat2,nLon2){
	var lat1 = Math.radians(nLat1);
	var lat2 = Math.radians(nLat2);
	var lng1 = Math.radians(nLon1);
	var lng2 = Math.radians(nLon2);
	var y = Math.cos(lng2) * Math.sin(lat2 - lat1);
	var x = Math.cos(lng1) * Math.sin(lng2) - Math.sin(lng1) * Math.cos(lng2) * Math.cos(lat2 - lat1);
	var e0 = Math.degrees(Math.atan2(y,x));
	if ( e0 < 0.0) e0 += 360;
    var n0 = e0 + 90;
    if (n0 > 360) n0 -= 360;
 	return n0;
}

// Converts from degrees to radians.
Math.radians = function(degrees) {
  return degrees * Math.PI / 180;
};
 
// Converts from radians to degrees.
Math.degrees = function(radians) {
  return radians * 180 / Math.PI;
}


