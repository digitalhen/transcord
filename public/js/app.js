$(document).ready(function(){
  // Autoformatting on phone numbers
  $('input[name="phoneNumber"]').mask('(000) 000-0000');

  // add a method to check passwordField
  $.validator.addMethod("pwcheck", function(value) {
     return /^[A-Za-z0-9\d=!\-@._*]*$/.test(value) // consists of only these
         && /[A-Z]/.test(value) // has a lowercase letter
         && /[a-z]/.test(value) // has a lowercase letter
         && /\d/.test(value) // has a digit
         && value.length > 7 // is 8 char or longer
  });

  var loginValidator = $('#form-login').validate({
    rules: {
      username: "required",
      password: "required"
    },
    messages: {
      username: "Required",
      password: "Please enter a password."
    }
  });

  var registerValidator = $('#form-register').validate({
    rules: {
      name: "required",
      username: {
        required: true,
        remote: {
          url: '/validate',
          type: 'post',
          data: {
            username: function() {
              //console.log($('#form-register input[name="username"]').val());
              return $('#form-register input[name="username"]').val();
            }
          }
        }
      },
      password: {
          required: true,
          pwcheck: true
      },
      email: {
        email: true,
        remote: {
          url: '/validate',
          type: 'post',
          data: {
            email: function() {
              //console.log($('#form-register input[name="username"]').val());
              return $('#form-register input[name="email"]').val();
            }
          }
        }
      },
      phoneNumber: {
        phoneUS: true,
        remote: {
          url: '/validate',
          type: 'post',
          data: {
            phoneNumber: function() {
              //console.log($('#form-register input[name="username"]').val());
              return $('#form-register input[name="phoneNumber"]').val();
            }
          }
        }
      }
    },
    messages: {
      name: "Required",
      password: "Please enter a valid password.",
      username: "User exists already.",
      email: "An account with this email address exists.",
      phoneNumber: "An account with this phone number exists."
    }
  });

  // disable submit if not valid
  $('#form-login input').on('blur keyup', function() {
      if ($("#form-login").valid()) {
          $('#form-login button[type="submit"]').prop('disabled', false);
      } else {
          $('#form-login button[type="submit"]').prop('disabled', 'disabled');
      }
  });

  $('#form-register input').on('blur keyup', function() {
      if ($("#form-register").valid()) {
          $('#form-register button[type="submit"]').prop('disabled', false);
      } else {
          $('#form-register button[type="submit"]').prop('disabled', 'disabled');
      }
  });
});
