
    const ALLAIRCRAFTQUERY = 1;
    const TIMEAIRCRAFTQUERY = 2;
    const MODELURL = "../model/simple.gltf";
    const REFTIME = '1/1/1990';
    var AJ_lastQueryDateTime;
    var AJ_queryState = ALLAIRCRAFTQUERY;
    var AJ_ajaxHandle;
    var AJ_comInterval = 300;
    var AJ_timerVal = 0;
    var AJ_rcvCount = 0;
    var AJ_aircrafts = new Array();
    var AJ_CenterCoord;
    var AJ_clientID;
    var AJ_trackTarget;
    var AJ_socket;  

    //ajax procedure start at here.
    function AJ_main() {
        AJ_socket = io.connect();
        AJ_clientID = clientType + new Date().getTime().toString();
    
        AJ_socket.on('AIRCRAFTDATA',function(result){
            console.log(result);
            AJ_analyzeData(result);
        });
        
        AJ_socket.on('AIRCRAFTERASE',function(result){
            console.log(result);
            AJ_erase(result);
        });
    }

    function AJ_cancelAjax(){
        clearTimeout(AJ_ajaxHandle);
    }


    function AJ_analyzeJson( data ){
        var error = data.ERROR;
        if ( error != undefined) return;

        if (data.DATA != undefined){
            AJ_analyzeData(data.DATA);
        }
        if (data.CMD != undefined){
            AJ_analyzeCmd(data.CMD);
        }
        if (data.ERASE != undefined){
            AJ_erase(data.ERASE);
        }
    }

    function AJ_analyzeData( tmpAC ) {
        var name = tmpAC.ADDR;
        AJ_aircrafts[name] = tmpAC;        
        if (clientType == "GM_") {
            GM_MarkerUpdate(tmpAC);
        }
        else if (clientType == "GE_") {
            GE_MarkerUpdate(tmpAC);
        }
        else if (clientType =="CE_"){
            CE_MarkerUpdate(tmpAC);
        }
        else if (clientType == "CH_") {
            var acData = new Array();
            acData[name] = tmpAC;
            CH_updateChart(acData);
        }
    }

    function AJ_analyzeCmd(cmd) {
        var sender = cmd.senderID;
        if (sender != AJ_clientID){
//            var lat = cmd.coord_lat;
//            var lng = cmd.coord_lng;
            var target = cmd.target;
            if (target != undefined){
                if (clientType == "GM_"){
                    GM_trackMarker(target);
                }
                if (clientType == "CE_"){
                   CE_trackMarker(target);

                }
                if (clientType == "GE_"){
                    GE_trackTarget(target);
                }
                if (clientType =="CH_"){
                    CH_detailTarget = target;
                    CH_updateAcDetail(CH_detailTarget);
                }
            }
            if (cmd.allClear == true){
                var delArray = Object.keys(AJ_aircrafts);
                AJ_erase(delArray);
            }
        }
    }

    function AJ_erase(delArray) {
        if (delArray.length != 0) {
            if (clientType == "GM_") {
                GM_markerErase(delArray);
            }
            else if (clientType == "CE_"){
                CE_destroyAircraft(delArray);
            }
            else if (clientType == "GE_"){
                GE_markerErase(delArray);
            }
            else if (clientType == "CH_"){
                CH_removeChartRows(delArray);
            }
            for (var i in delArray){
                if ( AJ_aircrafts[i] != undefined ){
                    delete AJ_aircrafts[i];
                }
            }
        }
    }

