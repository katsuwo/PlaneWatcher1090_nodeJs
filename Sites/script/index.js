	const REQUESTFILELIST = 1;	
	const REQUESTSTATUS = 2;	
	var ID_queryState = REQUESTFILELIST;
	var ID_waTable;
	var ID_recButtonState = false;
	var ID_recRequest = false;
    var ID_recStopRequest = false;
	var ID_reqMemo ='';
    var ID_rawListenStart;
    var ID_rawListenRequest;
    var ID_initialStateRcvDone = false;
    var ID_lastQueryDateTime;
    var ID_selectedFile;
    var ID_isPlaying;
    var ID_playStopRequest = false;
    var ID_delRequestID;
    var ID_hostAddr;
    var ID_hostPort;
    var ID_recieverLatitude;
    var ID_recieverLongitue;
    var ID_socket;  

	function ID_init() {
		$('#playButton').prop('disabled', true);
		$('#deleteButton').prop('disabled', true);
		$('#stopButton').prop('disabled', true);
        $('#rcvButton').prop('disabled', true);
//		ID_ajax();
        ID_socket = io.connect();
        ID_socketCom();
        ID_socket.on('FILELIST',function(result){
            console.log(result);
            ID_createWATable(ID_generateData(result),false);

        });
        ID_socket.on('RCVSTATUS',function(result){
            ID_analyzeStatus(result);
        });
        ID_socket.on('RAWHOST',function(result){
            $('#serverAddr').val(result.ADDR);
            $('#port').val(result.PORT.toString());
        });
        ID_socket.emit('REQ_FILELIST',null);
        ID_socket.emit('REQ_HOSTINFO',null);
	}

    function ID_socketCom(){
        ID_socket.emit('REQ_RCVSTATUS',null);

        setTimeout(function(){
            ID_socketCom();
        },500);
    }

/*    
	function ID_ajax(){
		var url;
		var data = {};

    	if ( ID_queryState == REQUESTFILELIST ){
    		url = 'requestFileList.html';
    	}
    	else if (ID_queryState == REQUESTSTATUS ){
    		url = 'requestStatus.html';
	        var data = {
                time:ID_lastQueryDateTime,
                memo:$('#memoField').val()
            };
    	}
        
        if (ID_rawListenRequest == true) {
            data.hostAddr = ID_hostAddr;
            data.hostPort = ID_hostPort;
            data.receiverLatitude = ID_recieverLatitude;
            data.recieverLongitude = ID_recieverLongitue; 
            data.rawListenRequest = ID_rawListenRequest;
        }
        else {
            data.rawListenRequest = ID_rawListenRequest;            
        }
        ID_rawListenRequest = undefined;        
        if (ID_recRequest == true){
            data.recRequest = true;
        }
        ID_recRequest = false;

        if (ID_recStopRequest == true){
            data.recStopRequest = true;
        }
        ID_recStopRequest = false;

        if (ID_PlayRequestID != undefined){
            data.PlayID = ID_PlayRequestID;
        }
        ID_PlayRequestID = undefined;

        if (ID_playStopRequest == true){
            data.playStopRequest = true;
        }
        ID_playStopRequest = false;

        if (ID_delRequestID != undefined){
            data.deleteRequest = ID_delRequestID;
        }
        ID_delRequestID = undefined;

		$.ajax({
			url: url,
	        type:'GET',
			dataType: 'json',
			cache: false,
			data: data,
			success: function(data, textStatus){
	            ID_analyzeJson(data);
	 		},
			error: function(xhr, textStatus, errorThrown){
                setTimeout(ID_ajax,500);
			}
		});
    }
*/
    function ID_analyzeJson(json) {
        if (json.DATA == undefined) return;
        var data = json.DATA;

    	if (data.FILELIST != undefined) {
    		ID_createWATable(ID_generateData(data.FILELIST),false);
    		ID_queryState = REQUESTSTATUS;
    	}
    	if (data.STATUS != undefined) {
    		ID_analyzeStatus(data.STATUS);
            if ( ID_initialStateRcvDone == false ){
                $('#rcvButton').prop('disabled', false);
                ID_initialStateRcvDone = true;
            }
    	}
    	setTimeout(ID_ajax,500);
    }
	
    function ID_analyzeStatus(data) {
    	if (data.TOTAL != undefined){
    		$('#RecievedPacket').html('Packets Received</br><b>'+data.TOTAL.toString()+'</b>');
    	}

    	if (data.PPS != undefined){
    		$('#pps').html('Packets/Sec</br><b>'+data.PPS.toString()+'</b>');
    	}

    	if (data.TRACKINGAC != undefined){
    		$('#trakingAC').html('Traking Aircrafts</br><b>'+data.TRACKINGAC.toString()+'</b>');
    	}

    	if (data.TOTALAC != undefined){
    		$('#totalAC').html('Total Aircrafts</br><b>'+data.TOTALAC.toString()+'</b>');
    	}

        if (data.RAWLISTEN != undefined){
            if (ID_rawListenStart != data.RAWLISTEN){
                if (data.RAWLISTEN == true){
                    $('#rcvButton').text('ADS-B Recieve Stop');
                    $('#rcvButton').attr('class','btn btn-warning xs');
                }
                else {
                    $('#rcvButton').text('ADS-B Recieve Start');
                    $('#rcvButton').attr('class','btn btn-primary xs');
                }             
            }
            if (ID_isPlaying == true) {
                $('#rcvButton').prop('disabled', true);
            }
            else {
                $('#rcvButton').prop('disabled', false);                    
            } 
            ID_rawListenStart = data.RAWLISTEN;
        }

    	if (data.REC != undefined){
    		if (data.REC == true) {
				$('#recButton').prop('disabled', true);
				$('#stopButton').prop('disabled', false);
				ID_toggleColorRecButton('#recButton');
                ID_recButtonState = !ID_recButtonState;
    		}
    		else {
				$('#recButton').prop('disabled', false);
				$('#stopButton').prop('disabled', true);    			
                $('#recButton').attr('class','btn btn-primary xs');
    		}
    	}

        if (data.QUERYDATE != undefined){
            ID_lastQueryDateTime = data.QUERYDATE;
        }

        if (data.PLAYING != undefined){
            if (data.PLAYING == true){
                $('#deleteButton').prop('disabled', true);
                $('#recButton').prop('disabled', true);
                $('#playButton').text('STOP');

                ID_toggleColorRecButton('#playButton');
                ID_recButtonState = !ID_recButtonState;
            }
            else {
                $('#deleteButton').prop('disabled', false);
                $('#playButton').prop('disabled', false);
                $('#playButton').attr('class','btn btn-primary xs');
                $('#playButton').text('PLAY');
            }
            ID_isPlaying = data.PLAYING;
        }
        else {
            ID_isPlaying = false;
            $('#playButton').text('PLAY');
            $('#rcvButton').prop('disabled', false);
        }
    }

    function ID_toggleColorRecButton(trgt){
    	if ( ID_recButtonState == false){
    		$(trgt).attr('class','btn btn-primary xs');
    	}
    	else {
    		$(trgt).attr('class','btn btn-danger xs');
    	}
    }

    function ID_recPushed() {
        ID_socket.emit('REQ_RECSTART',{memo:$('#memoField').val()});
    }

    function ID_stopPushed(){
        ID_socket.emit('REQ_RECEND',null);
    }

    function ID_rcvPushed(){
        ID_hostAddr = $('#serverAddr').val();
        ID_hostPort = $('#port').val();
        ID_recieverLatitude = $('#lat').val();
        ID_recieverLongitue = $('#lng').val(); 
        ID_rawListenRequest = !ID_rawListenStart;
    }

    function ID_delPushed(){
        ID_socket.emit('REQ_RECORDDELETE',{id:ID_selectedFile.RecordID});
    }

    function ID_playPushed() {
        $('#playButton').blur();
        if (ID_isPlaying == true ){
           ID_socket.emit('REQ_PLAYSTOP',null);
        }
        else {
            if (ID_selectedFile == undefined || ID_selectedFile == null) return;
            ID_socket.emit('REQ_PLAYSTART',{id:ID_selectedFile.RecordID});
        }
    }

	function ID_createWATable(data,bind){
        ID_waTable = null;
        $('#fileListChart').html('');
        ID_waTable = $('#fileListChart').WATable({
            data: data,
            pageSize: 5,
            pageFill:true, 
           	pageSizes:[],
           	checkAllToggle:false,
   			hidePagerOnEmpty: true,
    		checkboxes:true,

            rowClicked: function(data) {
                if ( ID_isPlaying == true) return;
            	var allData = ID_waTable.getData(false);
            	var selectedRow;
            	for (i = 0 ; i < allData.rows.length; i++){
            		var tmpRow = allData.rows[i];
            		if (data.index != i) {
	            		tmpRow['row-checked'] = false;           			
            		}
            		else {
	            		tmpRow['row-checked'] = !tmpRow['row-checked'];
	            		fileSelected(tmpRow);            			
            		}
            	}
            	ID_waTable.setData(allData);
            }
        }).data('WATable');        
	}

	function fileSelected(row) {
		if (row['row-checked'] == true){
			ID_updateSelectedFile(row);
		}
		else {
			ID_updateSelectedFile(null);
		}
	}

	function ID_updateSelectedFile(row) {
		if ( row == null){
			$('#selFileTime').html('');
			$('#playButton').prop('disabled', true);
			$('#deleteButton').prop('disabled', true);
		}
		else {
			$('#selFileTime').html('From:'+row.Start+'</BR>To:'+row.End);
			$('#playButton').prop('disabled', false);
			$('#deleteButton').prop('disabled', false);
		}
        ID_selectedFile = row;
	}

    function ID_generateData(data){
		var cols = {
			Start:{
				index:1,
				type:'string',
				friendry:'Start',
				sortOrder: 'dsc'
			},
			End:{
				index:2,
				type:'string',
				friendry:'End'
			},
			Memo:{
				index:3,
				type:'string',
				friendry:'Memo',
				cls:'memoColumn'
			},
            RecordID:{
                index:4,
                type:'number',
                friendry:'RecordID',
                unique:true,
//                hidden:true
            }
		};

    	var rows = new Array();
    	for (var i in data) {
    		var row = {};
    		var tmpDat = data[i];
    		row.Start = tmpDat.START;
    		row.End = tmpDat.END;
    		row.Memo = tmpDat.MEMO;
            row.RecordID = tmpDat.RECORDID;
    		rows.push(row); 
    	}

    	var ret = {
    		cols:cols,
    		rows:rows,
    	};
    	return ret;
    }