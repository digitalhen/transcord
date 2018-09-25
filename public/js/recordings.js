$(document).ready(function(){


  // load initial
  $.post("/dashboard/ajaxSearchRecordings", function(data) {
    console.log(data);

    // TODO: check page count here
    // TODO: don't get transcripts here

    for (var i=0; i < data.length; i++) {
      var clone = $('#recording-card-template').clone().prop('id', 'recording-card-' + i).attr('data-iteration', i).show();

      // Capture the recordingSid for programmatic button presses
      clone.attr('data-recordingSid', data[i].recordingSid);
      
      // Show number and call direction
      if(!data[i].callDirection || data[i].callDirection==0) {
        clone.find('.call-made-button').show().before(data[i].numberCalledFormatted);
      } else if(data[i].callDirection==1) {
        clone.find('.call-received-button').show().before(data[i].numberFromFormatted);
      }

      // Tag the buttons
      clone.find('.delete-button').attr('data-recordingSid', data[i].recordingSid);
      clone.find('.transcript-button').attr('data-recordingSid', data[i].recordingSid);
      clone.find('.download-button').attr('data-recordingSid', data[i].recordingSid);

      // Load the audio tag in
      clone.find('audio').children('source').attr('src', data[i].recordingUrl);

      // Show the processing button
      if(!data[i].processingStatus || data[i].processingStatus==2) {
        clone.find('.still-processing').remove();
      } else {
        clone.find('.done-processing').remove();
      }

      // Save start time
      clone.find('.call-start-date').text(data[i].startTime);

      // Set up audio time
      clone.find('.audio').attr('id', 'audio-' + i);

      // Add in the recording card to the container
      $('#recording-card-container').append(clone);

      // create audio player 
      const player = new Plyr('#audio-' + i, {
        'controls': ['play', 'progress', 'current-time', 'mute', 'settings']
      });
    }
  });
  
  // handle the download button
  $('#recording-card-container').on('click', '.recording-card .download-button', function() {
    var recordingSid = $(this).attr('data-recordingSid');

    window.location.href = window.location.protocol + "//" + window.location.host + "/dashboard/downloadRecording/" + recordingSid;
  });


  // handle the transcript button
  $('#recording-card-container').on('click', '.recording-card .transcript-button', function() {
    var recordingSid = $(this).attr('data-recordingSid');

    window.location.href = window.location.protocol + "//" + window.location.host + "/dashboard/transcript/" + recordingSid;
  });

  // handle the deletes here but only on the dashboard
  $('#recording-card-container').on('click', '.recording-card .delete-button', function() {
    var recordingSid = $(this).attr('data-recordingSid');

    $(this).children('i.material-icons').text('autorenew').addClass('rotate');

    $.post( "/dashboard/ajaxDeleteRecording", { 'recordingSid':recordingSid }, function( data ) {
      console.log(data);
      
      if(data.status==="Success") {
        $('.recording-card[data-recordingSid="' + data.recordingSid + '"]').fadeOut('slow', function() {
          $(this).remove();
        });
      } else if (data.status==="Error") {
        console.log(data.status.message);
      }
    });

  });


  


  
});
