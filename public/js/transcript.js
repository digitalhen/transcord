$(document).ready(function() {

  // throttle & handle appear and disappear of control card (only applies on narrow screens)
  $('main').on('scroll', _.debounce(function() {
    if($(this).scrollTop() > $('.transcript-control-card')[0].scrollHeight) {
      $('.transcript-control-card').addClass('sticky');
    } else {
      $('.transcript-control-card').removeClass('sticky');
    }
    
    $(window).trigger('resize');
  }, 100));

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
      //responsive: true,
      height: 100
    });

    // force hide process bar
    document.getElementById(progressId).style.display = 'none';

    // if the backend has passed forward peaks, let's use them to display things quickly.
    if(peaks.length>0)
      wavesurfer.load($(this).attr('data-recordingUrl'), peaks);
    else
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

    // this is exactly the same code as audio process
    wavesurfer.on('seek', function(percents) {
      var currentTime = wavesurfer.getCurrentTime();
      processAudioPosition(currentTime);
    });

    wavesurfer.on('audioprocess', function (percents) { 
      var currentTime = wavesurfer.getCurrentTime();
      processAudioPosition(currentTime);
    });

    // force a redraw on resize
    $(window).resize(function() {
      wavesurfer.drawBuffer();
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

function processAudioPosition(currentTime) {
  var found = null;
      
  // dim everything first
  $('.word').removeClass('highlight');

  // update playback time
  $('.position').text(moment.utc(currentTime*1000).format('mm:ss'));

  // search for the last message that has been passed by the audio
  
  $('.word').filter(function() {
    return parseFloat($(this).attr('data-startTime')) < currentTime;
  }).filter(function() {
    return parseFloat($(this).attr('data-endTime')) > currentTime;
  })
  .addClass('highlight');

}