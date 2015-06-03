exports.Aircract = function () {
	this.icao = '';
	this.latitude = 0.0;
	this.longitude = 0.0;
	this.altitude = 0;
	this.flight = '';
	this.squawk = '';
	this.onGround = undefined;
	this.oldOnGround = undefined;
	this.speed = 0;
	this.heading = 0;
	this.groundHeading = 0;
	this.groundSpeed = 0;
	this.verticalSpeed = 0;
	this.lat_0 = 0;
	this.lat_1 = 0;
	this.lng_0 = 0;
	this.lng_1 = 0;
	this.time_0 = 0;
	this.time_1 = 0;
	this.roll = 0;
	this.pitch = 0;
	this.setUpdateTime();	
};

exports.Aircract.prototype = {
	updatePosition:function( lat, lng, alt ) {
		this.latitude = lat;
		this.longitude = lng;
		this.altitude = alt;
		this.setUpdateTime();
	},

	updateHeading:function( heading ) {
		this.heading = heading;
		this.setUpdateTime();
	},

	updateFlight:function( flight ) {
		this.flight = flight;
		this.setUpdateTime();
	},

	updateSquawk:function( squawk ) {
		this.squawk = squawk;
		this.setUpdateTime();
	},
	
	updateSpeed:function( speed ) {
		this.speed = speed;
		this.setUpdateTime();
	},
	
	updateVerticalSpeed:function( vs ) {
		this.verticalSpeed = vs;
		if (this.onGround == true){
			this.pitch = 0;
		}
		else {
			this.pitch = vs / 300;
			if (this.pitch < -10.0) this.pitch = -10.0;
			if (this.pitch > 10.0) this.pitch = 10.0;
		}
		this.setUpdateTime();		
	},

	updateOnGround:function( onGround ) {
		if (onGround != this.onGround){
			this.lat_0 = 0.0;
			this.lat_1 = 0.0;
			this.lng_0 = 0.0;
			this.lng_1 = 0.0;
		}
		this.oldOnGround = this.onGround;
		this.onGround = onGround;
		this.setUpdateTime();
	},

	setUpdateTime:function() {
		this.lastUpdate = new Date().getTime();
	},


	checkNeedErase:function() {
		var intval = new Date().getTime() - this.lastUpdate;
		if ( intval >= 60 * 1000 ) return 'ERASEFROMARRAY';
		if ( intval >= 50 * 1000 ) return 'ERASENOTIFY';
		return false;
	}
}

