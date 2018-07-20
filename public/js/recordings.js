$(document).ready(function(){
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
        var time = parseFloat($(this).attr('time'));
        if (time < currentTime) {
          found = $(this);
        } else if (found !== null) {
          // We've gone too far, so let's set the previous one to be highlighted, scroll to it and then quit
          //console.log(found.offset().top);

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
