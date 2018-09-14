
var transcriptionHelper = {};

transcriptionHelper.buildTranscription = function(leftTranscription,rightTranscription) { // as objects, not JSON
    console.log("Building transcription...");

    var combinedTranscript = [];

    

    // go through the two seperate transcripts and combined them together
    leftTranscription.forEach(function (result) {
        console.log(result);
        
        // if it has words.... let's process it
        combinedTranscript = combinedTranscript.concat(processWords('left', result));

    });

    // go through the two seperate transcripts and combined them together
    rightTranscription.forEach(function (result) {
        console.log(result);
        
        // if it has words.... let's process it
        combinedTranscript = combinedTranscript.concat(processWords('right', result));
    });

    // sort the array so the two cominbed transcripts are in order
    combinedTranscript.sort(function(a,b) { return a.startTime - b.startTime; }); // sorts by startTime;s

    return combinedTranscript;
}


module.exports = transcriptionHelper;


/**
 * Function to help process each word
 */
function processWords(side, result) {
    var words = [];

    if(typeof result.alternatives !== 'undefined' && result.alternatives.length > 0 && result.alternatives[0].words.length > 0) {
            
        result.alternatives[0].words.forEach(function (word, idx, array) {
            var newWord = {};

            // capture side
            newWord.side = side;

            // figure out the time of the word
            var startTimeSecond, startTimeNano = "0";

            if(typeof word.startTime.seconds !== 'undefined')
                startTimeSecond = word.startTime.seconds;

            if(typeof word.startTime.nanos !== 'undefined')
                startTimeNano = word.startTime.nanos;

            newWord.startTime = parseFloat(startTimeSecond + '.' + startTimeNano);

            
            // figure out the end time of the word
            var endTimeSecond, endTimeNano = "0";

            if(typeof word.endTime.seconds !== 'undefined')
                endTimeSecond = word.endTime.seconds;

            if(typeof word.endTime.nanos !== 'undefined')
                endTimeNano = word.endTime.nanos;

            newWord.endTime = parseFloat(endTimeSecond + '.' + endTimeNano);

            // check if it is last
            if(idx === array.length - 1)
                newWord.lineBreak = true; // make sure we force a line break
            else
                newWord.lineBreak = false;

            // capture the actual word
            newWord.characters = word.word;

            words.push(newWord);
        });
    }

    return words;
}

/**
 * 
 * function buildTranscription(leftResults, rightResults) {
    // this builds the objects to contains the transcriptions
  console.log("Building transcription...");

  var combinedTranscript = [];

  // go through the two seperate transcripts and combined them together
  leftResults.forEach(function (result) {
    var newLine = {};

    console.log(JSON.stringify(result.alternatives));

    // if there are any words, lets grab them
    if(result.alternatives.length > 0 && result.alternatives[0].words.length > 0) {
      newLine.side = 'left';

      // compute the float start time
      var startTimeSecond, startTimeNano = "0";

      if(typeof result.alternatives[0].words[0].startTime.seconds !== 'undefined')
        startTimeSecond = result.alternatives[0].words[0].startTime.seconds;

      if(typeof result.alternatives[0].words[0].startTime.nanos !== 'undefined')
        startTimeNano = result.alternatives[0].words[0].startTime.nanos;

      newLine.startTime = parseFloat(startTimeSecond + '.' + startTimeNano);


      newLine.transcript = result.alternatives[0].transcript;

      combinedTranscript.push(newLine);
    }

  });

  rightResults.forEach(function (result) {
    var newLine = {};

    // if there are any words, lets grab them
    if(result.alternatives.length > 0 && result.alternatives[0].words.length > 0) {
      newLine.side = 'right';

      // compute the float start time
      var startTimeSecond, startTimeNano = "0";

      if(typeof result.alternatives[0].words[0].startTime.seconds !== 'undefined')
        startTimeSecond = result.alternatives[0].words[0].startTime.seconds;

      if(typeof result.alternatives[0].words[0].startTime.nanos !== 'undefined')
        startTimeNano = result.alternatives[0].words[0].startTime.nanos;

      newLine.startTime = parseFloat(startTimeSecond + '.' + startTimeNano);

      newLine.transcript = result.alternatives[0].transcript;

      combinedTranscript.push(newLine);
    }
  });

  // sort the array so the two cominbed transcripts are in order
  combinedTranscript.sort(function(a,b) { return a.startTime - b.startTime; }); // sorts by startTime;

  return combinedTranscript;

}
 */