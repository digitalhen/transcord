$(document).ready(function(){
  // table sorting
  $('table.table').tablesorter();



  // time tracker for audio
  /*
  $('audio.transcriptAudioPlayer').bind('timeupdate', function() {
    var currentTime = this.currentTime;
    var found = null;

    // dim everything first
    $('.messageContainer').addClass('dimmed');

    // search for the last message that has been passed by the audio
    $('.messageContainer').each(function(index) {
      var time = parseFloat($(this).attr('time'));
      if (time < currentTime) {
        found = $(this);
      } else if (found !== null) {
        // We've gone too far, so let's set the previous one to be highlighted, and then quit
        found.removeClass('dimmed');
        return false;
      }
    });




  }); */
});
