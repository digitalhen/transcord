
// Square handling below...

// Set the application ID
var applicationId = document.getElementById('form-payment').getAttribute('data-square_application_id');

// Set the location ID
var locationId = document.getElementById('form-payment').getAttribute('data-location');

/*
 * function: requestCardNonce
 *
 * requestCardNonce is triggered when the "Pay with credit card" button is
 * clicked
 *
 * Modifying this function is not required, but can be customized if you
 * wish to take additional action when the form button is clicked.
 */
function requestCardNonce(event) {

  // Don't submit the form until SqPaymentForm returns with a nonce
  //event.preventDefault();

  // Reset error messages
  $('span.error').parent('.mdl-textfield').removeClass('is-invalid');

  // Request a nonce from the SqPaymentForm object
  paymentForm.requestCardNonce();
}

// Create and initialize a payment form object
var paymentForm = new SqPaymentForm({

  // Initialize the payment form elements
  applicationId: applicationId,
  locationId: locationId,
  inputClass: 'sq-input',

  // Customize the CSS for SqPaymentForm iframe elements
  inputStyles: [{
      fontSize: '.9em'
  }],

  // Initialize the credit card placeholders
  cardNumber: {
    elementId: 'sq-card-number'
  },
  cvv: {
    elementId: 'sq-cvv'
  },
  expirationDate: {
    elementId: 'sq-expiration-date'
  },
  postalCode: {
    elementId: 'sq-postal-code'
  },

  // SqPaymentForm callback functions
  callbacks: {

    /*
     * callback function: createPaymentRequest
     * Triggered when: a digital wallet payment button is clicked.
     */
    createPaymentRequest: function () {

      var paymentRequestJson ;
      /* ADD CODE TO SET/CREATE paymentRequestJson */
      return paymentRequestJson ;
    },

    /*
     * callback function: validateShippingContact
     * Triggered when: a shipping address is selected/changed in a digital
     *                 wallet UI that supports address selection.
     */
    validateShippingContact: function (contact) {

      var validationErrorObj ;
      /* ADD CODE TO SET validationErrorObj IF ERRORS ARE FOUND */
      return validationErrorObj ;
    },

    /*
     * callback function: cardNonceResponseReceived
     * Triggered when: SqPaymentForm completes a card nonce request
     */
    cardNonceResponseReceived: function(errors, nonce, cardData, billingContact, shippingContact) {
      if (errors) {
        // Log errors from nonce generation to the Javascript console
        console.log("Encountered errors:");
        errors.forEach(function(error) {
          console.log(error);

          var fieldWithError = eval('paymentForm.options.' + error.field + '.elementId');

          jQuery('span.error[for="' + fieldWithError + '"]').text(error.message).parent('.mdl-textfield').addClass('is-invalid');

          console.log();

        });

        return;
      }

      //alert('Nonce received: ' + nonce); /* FOR TESTING ONLY */

      // Assign the nonce value to the hidden form field
      document.getElementById('card-nonce').value = nonce;

      // POST the nonce form to the payment processing page
      document.getElementById('form-payment').submit();

    },

    /*
     * callback function: unsupportedBrowserDetected
     * Triggered when: the page loads and an unsupported browser is detected
     */
    unsupportedBrowserDetected: function() {
      /* PROVIDE FEEDBACK TO SITE VISITORS */
    },

    /*
     * callback function: inputEventReceived
     * Triggered when: visitors interact with SqPaymentForm iframe elements.
     * This mimicks all the behavior of MDL
     */
    inputEventReceived: function(inputEvent) {
      switch (inputEvent.eventType) {
        case 'focusClassAdded':
          // Mimics a click on the text field in MDL
          console.log(inputEvent);
          jQuery('#' + inputEvent.elementId).parent('.mdl-textfield').removeClass('is-invalid').addClass('is-focused');
          document.getElementById(inputEvent.elementId).focus();
          /* HANDLE AS DESIRED */
          break;
        case 'focusClassRemoved':
          // Mimics a click off the text field in MDL
          jQuery('#' + inputEvent.elementId).parent('.mdl-textfield').removeClass('is-focused').addClass('is-dirty');
          /* HANDLE AS DESIRED */
          break;
        case 'errorClassAdded':
          /* HANDLE AS DESIRED */
          jQuery('#' + inputEvent.elementId).parent('.mdl-textfield').addClass('is-invalid');
          break;
        case 'errorClassRemoved':
          jQuery('#' + inputEvent.elementId).parent('.mdl-textfield').removeClass('is-invalid');
          /* HANDLE AS DESIRED */
          break;
        case 'cardBrandChanged':
          /* HANDLE AS DESIRED */
          break;
        case 'postalCodeChanged':
          /* HANDLE AS DESIRED */
          break;
      }
    },

    /*
     * callback function: paymentFormLoaded
     * Triggered when: SqPaymentForm is fully loaded
     */
    paymentFormLoaded: function() {
      /* HANDLE AS DESIRED */
    }
  }
}); 