$(document).ready(function(){
  // handle the email sharing of transcripts
  $('.transcript-control-card .email-button').click(function() {
    var dialog = $('#sharetranscript-dialog')[0];

    if (! dialog.showModal) {
      dialogPolyfill.registerDialog(dialog);
    }

    dialog.showModal();
  });

  $('#sharetranscript-dialog .cancel-button').click(function() {
    var dialog = $('#sharetranscript-dialog')[0];

    dialog.close();
  });

  $('#sharetranscript-dialog #form-sharetranscript').submit(function() {
    var form = $(this);

    if(form.find('.is-invalid').length > 0) {
      // do nothing, because form is invalid
    } else {
      var recordingSid = $(this).attr('data-recordingSid');
      var email = $(this).find('input[name="email"]').val();

      $.post("/dashboard/ajaxSendTranscript", { 'email': email, 'recordingSid': recordingSid }, function( data ) {
        console.log(data);

        if(data.status==="Success") {
          var dialog = $('#sharetranscript-dialog')[0];

          dialog.close();

          // TODO: pop up somehow?
        } else if (data.status==="Error") {
          console.log(data.status.message);
        }
      });

    }
    
    return false;

    /*  */
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


  // waveforms go on the transcript page
  $('.waveform').each(function() {
    var idNumber = $(this).attr('data-id');
    var waveformId = '#waveform-' + idNumber;
    var progressId = 'progress-' + idNumber;
    var buttonId = '#button-' + idNumber;
    var buttonTextId = '#button-text-' + idNumber;

    var wavesurfer = WaveSurfer.create({
      container: waveformId,
      barWidth: 3,
    });

    wavesurfer.load($(this).attr('data-recordingUrl'));

    wavesurfer.on('loading', function (percents) {
      document.getElementById(progressId).value = percents;
    });

    wavesurfer.on('ready', function (percents) {
      document.getElementById(progressId).style.display = 'none';
    });

    wavesurfer.on('finish', function (percents) {
      $(buttonTextId).text('play_arrow').removeClass('pause').addClass('play');
      wavesurfer.seekTo(0);
      $('.messageContainer').removeClass('dimmed');
    });

    wavesurfer.on('audioprocess', function (percents) { 
      var currentTime = wavesurfer.getCurrentTime();
      var found = null;

      //console.log("currentTime:" +  currentTime);
      
      // dim everything first
      $('.word').removeClass('highlight');

      // search for the last message that has been passed by the audio
      
      $('.word').filter(function() {
        return parseFloat($(this).attr('data-startTime')) < currentTime;
      }).filter(function() {
        return parseFloat($(this).attr('data-endTime')) > currentTime;
      })
      .addClass('highlight');

      /*$('.messageContainer').each(function(index) {

        var time = parseFloat($(this).attr('data-time'));
        console.log(currentTime + " vs " + time + ": " + (time<currentTime));
        if (time < currentTime) {
          // we've found a match but keep checking
          found = $(this);

          if(found[0] === $('.messageContainer').last()[0]) {
            // special handling for the last one
            found.removeClass('dimmed');
            return false;
          }
        } else if (found !== null) {
          // we've gone beyond where the audio is, so let's stop and mark the last good one as where we are
          found.removeClass('dimmed');
          return false;
        }
      }); */


    });

    $('.word').click(function() {
      var duration = wavesurfer.getDuration();
      var percentage = parseFloat($(this).attr('data-startTime')) / duration;

      wavesurfer.seekTo(percentage);
    });

    $(buttonId).click(function() {
      wavesurfer.playPause();


      // change icon
      if($(buttonTextId).hasClass('play'))
        $(buttonTextId).text('pause').removeClass('play').addClass('pause');
      else { // we're pausing. undim everything
        $('.messageContainer').removeClass('dimmed');
        $(buttonTextId).text('play_arrow').removeClass('pause').addClass('play');
      }
        
    });
  });
});
