$(document).ready(function(){
  // Autoformatting on phone numbers
  $('input[name="phoneNumber"]').mask('(000) 000-0000');

  // table sorting
  $('table.table').tablesorter();

  // add a method to check passwordField
  $.validator.addMethod("pwcheck", function(value) {
     return /^[A-Za-z0-9\d=!\-@._*]*$/.test(value) // consists of only these
         && /[A-Z]/.test(value) // has a lowercase letter
         && /[a-z]/.test(value) // has a lowercase letter
         && /\d/.test(value) // has a digit
         && value.length > 7 // is 8 char or longer
  });

  // lets me check if they haven't changed the value
  $.validator.addMethod("notEqual", function(value, element, param) {
    return this.optional(element) || value != param;
    // TODO: the form still needs to be valid
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

  var profileValidator = $('#form-profile').validate({
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
                return $('#form-profile input[name="username"]').val();
              }
            }
          },
          depends: function() {
            return ($('#form-profile input[name="username"]').val() !== $('#form-profile input[name="username"]').attr('original'));
          }
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
        email: true,
        //notEqual: $('#form-profile input[name="email"]').attr('original'),
        remote: {
          param: {
            url: '/validate',
            type: 'post',
            data: {
              email: function() {
                //console.log($('#form-register input[name="username"]').val());
                return $('#form-profile input[name="email"]').val();
              }
            },
          },
          depends: function(element) {
              // compare email address in form to hidden field
              return ($(element).val() !== $('#form-profile input[name="email"]').attr('original'));
          }
        }
      },
      phoneNumber: {
        phoneUS: true,
        //notEqual: $('#form-profile input[name="phoneNumber"]').attr('original'),
        remote: {
          param: {
            url: '/validate',
            type: 'post',
            data: {
              phoneNumber: function() {
                //console.log($('#form-register input[name="username"]').val());
                return $('#form-profile input[name="phoneNumber"]').val();
              }
            },
          },
          depends: function(element) {
              // compare email address in form to hidden field
              return ($(element).val() !== $('#form-profile input[name="phoneNumber"]').attr('original'));
          }
        }
      }
    },
    messages: {
      name: "A name is required.",
      password: "Please enter a valid password.",
      username: {
        notEqual: "This is you!",
        remote: "This username is taken.",
      },
      //username: "User exists already.",
      email: {
        notEqual: "This is you!",
        remote: "Someone else has registered this email.",
      },
      phoneNumber: {
        notEqual: "This is you!",
        remote: "This phone number is registered in another account.",
      },
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
  });
});
