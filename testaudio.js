// Imports the Google Cloud client library
const speech = require('@google-cloud/speech');

// Creates a client

const client = new speech.SpeechClient({projectId: 'transcord-213501',
        keyFilename: 'credentials/transcord-213501-f594bac26d83.json'});

/**
 * TODO(developer): Uncomment the following lines before running the sample.
 */
// const gcsUri = 'gs://my-bucket/audio.raw';
// const encoding = 'Encoding of the audio file, e.g. LINEAR16';
// const sampleRateHertz = 16000;
// const languageCode = 'BCP-47 language code, e.g. en-US';

const encoding = 'LINEAR16';
const gcsUri = 'gs://transcord/RE950c38ce3a8ebb6c4716a5d2e3b0bd62-right.wav';
const sampleRateHertz = 8000;
const languageCode = 'en-US';

const config = {
  encoding: encoding,
  sampleRateHertz: sampleRateHertz,
  languageCode: languageCode,
};

const audio = {
  uri: gcsUri,
};

const request = {
  config: config,
  audio: audio,
};

function EmptyAudio(message) { 
	this.message = message;
	this.name = 'EmptyAudio';
};


client
    .longRunningRecognize(request)
    .then(data => {
      const response = data[0];
      const operation = response;

	operation.on('complete', function(metadata, apiResponse) {
		console.log('complete');
const response = data[0];
      const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');
      console.log(`Transcription: ${transcription}`);
	});



      operation.on('progress', function(metadata, apiResponse) {
        if (apiResponse.done && !apiResponse.response) {
          // progress with `done: true` means request completion
		console.log('could do something here');
		//return operation.abort();		
		throw new Error('blah');
          //throw new EmptyAudio('No text included in this audio');
	  //return operation.promise().reject();
        }
      }).catch(function(err) { console.log("is this the right place"); })


      // Get a Promise representation of the final result of the job
      return operation.promise();
    })
    .catch((err) => {
      console.error('Handler:', err);
    });
