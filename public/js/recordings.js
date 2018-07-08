$(document).ready(function(){
  $('.waveform').each(function() {
    var id = $(this).attr('id');
    var progressId = $(this).children('.progress').attr('id');


    var wavesurfer = WaveSurfer.create({
      container: '#' + id,
      barWidth: 3,
    });

    wavesurfer.load($(this).attr('data-recordingUrl'));

    wavesurfer.on('loading', function (percents) {
      document.getElementById(progressId).value = percents;
    });

    wavesurfer.on('ready', function (percents) {
      document.getElementById(progressId).style.display = 'none';
    });
  });
});
