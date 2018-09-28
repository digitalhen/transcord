$(document).ready(function(){

  // load the default view
  refreshView(); // TODO: this needs to read the query string if it exists
  
  // TODO: handle pagination button click

  // TODO: handle search field changes
  $('#sample6').on('input',function(e){
      $.bbq.pushState({'page': 1, 'search': $(this).val()}); // go back to page 1
      refreshView();
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

  

  // reload container without actually going anywhere
  //console.log($.deparam.fragment);
  $('#pagination-container').on('click', '.page', function(event) {
    event.preventDefault();

    // capture the state
    $.bbq.pushState({'page': $(this).attr('data-page')});

    // load the data
    refreshView();

    // refresh the pagination
    //buildPagination(pages, $(this).attr('data-page'));
  }); 


  


  
});

function refreshView() {
  var page = $.bbq.getState('page');
  var search = $.bbq.getState('search');

  var searchObject = {};
  if(search) searchObject.search = search;
  if(page) searchObject.page = page;

  // load initial
  $.post("/dashboard/ajaxSearchRecordings", searchObject, function(data) {
    console.log(data);

    // save call count
    $('#call-count .count').text(data.metadata.calls);

    // TODO: save meta data here?

    // erase existing recording cards
    $('#recording-card-container .recording-card').remove();

    for (var i=0; i < data.recordings.length; i++) {
      var recording = data.recordings[i];

      var clone = $('#recording-card-template')
        .clone()
        .prop('id', 'recording-card-' + i)
        .attr('data-iteration', i)
        .addClass('recording-card')
        .show();

      // Capture the recordingSid for programmatic button presses
      clone.attr('data-recordingSid', recording.recordingSid);
      
      // Show number and call direction
      if(!recording.callDirection || recording.callDirection==0) {
        clone.find('.call-made-button').show().before(recording.numberCalledFormatted);
      } else if(recording.callDirection==1) {
        clone.find('.call-received-button').show().before(recording.numberFromFormatted);
      }

      // Tag the buttons
      clone.find('.delete-button').attr('data-recordingSid', recording.recordingSid);
      clone.find('.transcript-button').attr('data-recordingSid', recording.recordingSid);
      clone.find('.download-button').attr('data-recordingSid', recording.recordingSid);

      // Load the audio tag in
      clone.find('audio').children('source').attr('src', recording.recordingUrl);

      // Show the processing button
      if(!recording.processingStatus || recording.processingStatus==2) {
        clone.find('.still-processing').remove();
      } else {
        clone.find('.done-processing').remove();
      }

      // Save start time
      clone.find('.call-start-date').text(moment(recording.startTime).format("MMM DD, YYYY h:mm a"));

      // Set up audio time
      clone.find('.audio').attr('id', 'audio-' + i);

      // Add in the recording card to the container
      $('#recording-card-container').append(clone);

      // create audio player 
      const player = new Plyr('#audio-' + i, {
        'controls': ['play', 'progress', 'current-time', 'mute', 'settings']
      });
    }

    buildPagination(data.metadata.pages, data.metadata.page);

  });
}

function buildPagination(pages, page) {
  console.log('Building pagination:');
  console.log(pages);
  console.log(page);

  // build pagination here
  if(pages>1) {
    // show the page container
    $('#pagination-container').show();

    // clear the pages
    $('#pagination-container .pagination .paginator .page').remove();

    // add new pages
    for(var i=0; i<pages; i++) {
      var number = $('<div>', {'data-page':(i+1), 'text':(i+1), 'class':(i+1)===page ? 'page active' : 'page'})
      $('#pagination-container .pagination .paginator').append(number);
    }   

    // decide if arrows should work and add links if so     
    if(pages==page) { // last page
      $('#pagination-container .pagination .right-pagination').addClass('disabled');
    } else {
      $('#pagination-container .pagination .right-pagination').removeClass('disabled');
      $('#pagination-container .pagination .right-pagination .page').attr('data-page',page+1);
    }

    if(page==1) { // first page
      $('#pagination-container .pagination .left-pagination').addClass('disabled');
    } else {
      $('#pagination-container .pagination .left-pagination').removeClass('disabled');
      $('#pagination-container .pagination .left-pagination .page').attr('data-page',(page-1));
    }

  } else {
    $('#pagination-container').hide();
  }
}
