$(document).ready(function(){
  $('.waveform').each(function() {
    var idNumber = $(this).attr('data-id');
    var warmformId = '#waveform-' + idNumber;
    var progressId = 'progress-' + idNumber;
    var buttonId = '#button-' + idNumber;
    var buttonTextId = '#button-text-' + idNumber;


    var wavesurfer = WaveSurfer.create({
      container: warmformId,
      barWidth: 3,
    });

    wavesurfer.load($(this).attr('data-recordingUrl'));

    wavesurfer.on('loading', function (percents) {
      document.getElementById(progressId).value = percents;
    });

    wavesurfer.on('ready', function (percents) {
      document.getElementById(progressId).style.display = 'none';
    });

    $(buttonId).click(function() {
      wavesurfer.playPause();


      // change icon
      if($(buttonTextId).hasClass('play'))
        $(buttonTextId).text('pause').removeClass('play').addClass('pause');
      else
        $(buttonTextId).text('play_arrow').removeClass('pause').addClass('play');
    });
  });
});
