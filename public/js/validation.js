$(document).ready(function() {
  // relay to send login button to form
  $('#form-login-button').click(function() {
      $('#form-login').submit();
  });

  $('#form-register-button').click(function() {
      $('#form-register').submit();
  });

  $('#form-settings-button').click(function() {
      $('#form-settings').submit();
  });

  $('#form-reset-button').click(function() {
    $('#form-reset').submit();
  });

  $('#form-sharetranscript-button').click(function() {
    $('#form-sharetranscript').submit();
  });

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

  // add a metod to check zipcode
  $.validator.addMethod("zipcode", function(value, element) {
    return this.optional(element) || /^\d{5}(?:-\d{4})?$/.test(value);
  }, "Please provide a valid zip code.");

  // lets me check if they haven't changed the value
  $.validator.addMethod("notEqual", function(value, element, param) {
    return this.optional(element) || value != $(param).val();
    // TODO: the form still needs to be valid 
  });

  var resetValidator = $('#form-reset').validate({
    errorPlacement: function(error, element) {
      $(element).parent('.mdl-textfield').addClass('is-invalid');
      $(element).siblings('.error').text(error.text());
    },
    rules: {
      email: {
        required: true,
        email: true,
        //notEqual: $('#form-profile input[name="email"]').attr('original'),
      },
      password: "required"
    },
    messages: {
      email: {
        required: "Please enter an email address.",
      },
    }
});

var shareTranscriptValidator = $('#form-sharetranscript').validate({
  errorPlacement: function(error, element) {
    $(element).parent('.mdl-textfield').addClass('is-invalid');
    $(element).siblings('.error').text(error.text());
  },
  rules: {
    email: {
      required: true,
      email: true,
    }
  },
  messages: {
    email: "Please enter an email address."
  }
});

  var loginValidator = $('#form-login').validate({
    errorPlacement: function(error, element) {
      $(element).parent('.mdl-textfield').addClass('is-invalid');
      $(element).siblings('.error').text(error.text());
    },
    rules: {
      username: "required",
      password: "required"
    },
    messages: {
      username: "Please enter a username.",
      password: "Please enter a password."
    }
});

  var settingsValidator = $('#form-settings').validate({
    errorPlacement: function(error, element) {
      $(element).parent('.mdl-textfield').addClass('is-invalid');
      $(element).siblings('.error').text(error.text());
    },
    rules: {
      name: "required",
      username: {
        required: true,
        //notEqual: $('#form-profile input[name="username"]').attr('original'),
        remote: {
          param: {
            url: '/validate',
            type: 'post',
            data: {
              username: function() {
                //console.log($('#form-register input[name="username"]').val());
                return $('#form-settings input[name="username"]').val();
              }
            }
          },
          depends: function() {
            return ($('#form-settings input[name="username"]').val() !== $('#form-settings input[name="username"]').attr('original'));
          },
          /*
          depends: function(element) {
              // compare email address in form to hidden field
              return ($(element).val() !== $('#form-profile input[name="username"]').attr('original'));
          }*/
        }
      },
      password: {
          pwcheck: {
            depends: function(element) {
              return ($(element).val().length > 0);
            }
          },
      },
      email: {
        required: true,
        email: true,
        //notEqual: $('#form-settings input[name="email"]').attr('original'),
        remote: {
          param: {
            url: '/validate',
            type: 'post',
            data: {
              email: function() {
                //console.log($('#form-register input[name="username"]').val());
                return $('#form-settings input[name="email"]').val();
              }
            },
          },
          depends: function(element) {
              // compare email address in form to hidden field
              return ($(element).val() !== $('#form-settings input[name="email"]').attr('original'));
          }
        }
      },
      zip: {
        required: true,
        zipcode: true
      },
      phoneNumber: {
        required: true,
        phoneUS: true,
        //notEqual: $('#form-profile input[name="phoneNumber"]').attr('original'),
        remote: {
          param: {
            url: '/validate',
            type: 'post',
            data: {
              phoneNumber: function() {
                //console.log($('#form-register input[name="username"]').val());
                return $('#form-settings input[name="phoneNumber"]').val();
              }
            },
          },
          depends: function(element) {
              // compare email address in form to hidden field
              return ($(element).val().replace(/\D/g,'') !== $('#form-settings input[name="phoneNumber"]').attr('original'));
          }
        }
      }
    },
    messages: {
      name: "A name is required.",
      password: {
        pwcheck: "This needs at least 8 characters, with upper- and lowercase letters and a digit."
      },
      username: {
        required: "Please enter a username.",
        notEqual: "This is you!",
        remote: "This user exists already.",
      },
      //username: "User exists already.",
      email: {
        required: "Please enter an email address.",
        notEqual: "This is you!",
        remote: "Someone else has registered this email.",
      },
      phoneNumber: {
        required: "Please enter a phone number.",
        notEqual: "This is you!",
        remote: "This phone number is registered in another account.",
      },
    }
  });

  var registerValidator = $('#form-register').validate({
    errorPlacement: function(error, element) {
      $(element).parent('.mdl-textfield').addClass('is-invalid');
      $(element).siblings('.error').text(error.text());
    },
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
        required: true,
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
      zip: {
        required: true,
        zipcode: true
      },
      phoneNumber: {
        required: true,
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
      name: "Please enter your name.",
      password: {
        required: "Please enter a valid password.",
        pwcheck: "This needs at least 8 characters, with upper- and lowercase letters and a digit."
      },
      username: {
        required: "Please enter a username.",
        remote: "User exists already.",
      },
      email: {
        required: "Please enter an email address.",
        email: "Not a valid email address.",
        remote: "An account with this email address exists.",
      },
      phoneNumber: {
        required: "Please enter a phone number.",
        phoneUS: "Not a valid US phone number.",
        remote: "An account with this phone number exists."
      }
    }
  });

  /*
  // disable submit if not valid
  $('#form-profile input').on('blur keyup', function() {
      if ($("#form-profile").valid()) {
          $('#form-profile button[type="submit"]').prop('disabled', false);
      } else {
          $('#form-profile button[type="submit"]').prop('disabled', 'disabled');
      }
  });

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
  }); */
});
