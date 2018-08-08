$(document).ready(function() {
    var cardNonce;
    var paymentForm = new SqPaymentForm({
      applicationId: '#{square_application_id}',
      locationId: '#{square_location_id}',
      inputClass: 'sq-input',
      inputStyles: [
          {
            fontSize: '14px',
            padding: '7px 12px',
            backgroundColor: "transparent"
          }
        ],
      cardNumber: {
        elementId: 'sq-card-number',
        placeholder: '0000 0000 0000 0000'    
      },
      cvv: {
        elementId: 'sq-cvv',
        placeholder: 'CVV'
      },
      expirationDate: {
        elementId: 'sq-expiration-date',
        placeholder: 'MM/YY'
      },
      postalCode: {
        elementId: 'sq-postal-code',
        placeholder: '94110'
      },

      // Initialize Apple Pay placeholder ID
      applePay: {
        elementId: 'sq-apple-pay'
      },

      // Initialize Masterpass placeholder ID
      masterpass: {
        elementId: 'sq-masterpass'
      },

      callbacks: {
        methodsSupported: function (methods) {

          var applePayBtn = document.getElementById('sq-apple-pay');
          var applePayLabel = document.getElementById('sq-apple-pay-label');
          var masterpassBtn = document.getElementById('sq-masterpass');
          var masterpassLabel = document.getElementById('sq-masterpass-label');

          // Only show the button if Apple Pay for Web is enabled
          // Otherwise, display the wallet not enabled message.
          if (methods.applePay === true) {
            applePayBtn.style.display = 'inline-block';
            applePayLabel.style.display = 'none' ;
          }
          // Only show the button if Masterpass is enabled
          // Otherwise, display the wallet not enabled message.
          if (methods.masterpass === true) {
            masterpassBtn.style.display = 'inline-block';
            masterpassLabel.style.display = 'none';
          }
        },
        cardNonceResponseReceived: function(errors, nonce, cardData) {
          if (errors){
            var error_html = ""
            for (var i =0; i < errors.length; i++){
              error_html += "<li> " + errors[i].message + " </li>";
            }
            document.getElementById("card-errors").innerHTML = error_html;
            document.getElementById('submit').disabled = false;
          }else{
            document.getElementById("card-errors").innerHTML = "";
            chargeCardWithNonce(nonce);
          }
          
          
        },
        unsupportedBrowserDetected: function() {
          // Alert the buyer
        },
        createPaymentRequest: function () {
          return {
            requestShippingAddress: false,
            currencyCode: "USD",
            countryCode: "US",

            total: {
              label: "#{square_location_name}",
              amount: "1.01",
              pending: false,
            },

            lineItems: [
              {
                label: "Subtotal",
                amount: "1.00",
                pending: false,
              },
              {
                label: "Tax",
                amount: "0.01",
                pending: false,
              }
            ]
          };
        },
      }
    });

});