$(document).ready(function(){
  $('.audio').each(function() {
    var idNumber = $(this).attr('data-id');
    var audioId = '#audio-' + idNumber;

    const player = new Plyr(audioId, {
      'controls': ['play', 'progress', 'current-time', 'mute', 'settings']
    });
  });

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
      
      // dim everything first
      $('.messageContainer').addClass('dimmed');

      // search for the last message that has been passed by the audio
      $('.messageContainer').each(function(index) {

        var time = parseFloat($(this).attr('data-time'));
        console.log(currentTime + " vs " + time + ": " + (time<currentTime));
        if (time < currentTime) {
          found = $(this);

          // special handling for the last one, or the only one, so let's highlight that and quit.
          if($(this) === $('.messageContainer').last()) {
            found.removeClass('dimmed');
            return false;
          }
        } else if (found !== null) {

          //$('main').scrollTop(found.offset().top - 50);

          /*
          $('main').stop().animate({
              scrollTop: found.offset().top - 50
          }, 200); */
          found.removeClass('dimmed');
          return false;
        }
      });
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
