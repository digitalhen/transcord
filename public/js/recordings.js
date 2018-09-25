$(document).ready(function(){


  // load initial
  $.post("/dashboard/ajaxSearchRecordings", function(data) {
    console.log(data);

    // TODO: check page count here
    // TODO: don't get transcripts here

    for (var i=0; i < data.length; i++) {
      var clone = $('#recording-card-template').clone().prop('id', 'recording-card-' + i).attr('data-iteration', i).show();

      // TODO: update values here
      clone.attr('data-recordingSid', data[i].recordingSid);
      
      if(data[i].callDirection==0)
        clone.find('.call-made-button').show();
      else if(data[i].callDirection==1)
        clone.find('.call-received-button').show();

      clone.find('audio').children('source').attr('src', data[i].recordingUrl);

      if(!data[i].processingStatus || data[i].processingStatus==2) {
        clone.find('.still-processing').remove();
      } else {
        clone.find('.done-processing').remove();
      }



      $('#recording-card-container').append(clone);
    }
  });
  

  // handle the deletes here but only on the dashboard
  $('.recording-card .delete-button').click(function() {
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


  // audios go on the dashboard
  $('.audio').each(function() {
    var idNumber = $(this).attr('data-id');
    var audioId = '#audio-' + idNumber;

    const player = new Plyr(audioId, {
      'controls': ['play', 'progress', 'current-time', 'mute', 'settings']
    });
  });


  
});
