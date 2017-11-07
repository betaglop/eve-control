/**********************************************************************************
*
*     This file is part of eve-control.
*
*    eve-control is free software; you can redistribute it and/or modify
*    it under the terms of the GNU General Public License as published by
*    the Free Software Foundation; either version 2 of the License.
*
*    eve-control is distributed in the hope that it will be useful,
*    but WITHOUT ANY WARRANTY; without even the implied warranty of
*    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
*    GNU General Public License for more details.
*
*    You should have received a copy of the GNU General Public License
*    along with eve-control; if not, write to the Free Software
*    Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
*
*    Copyright (c) 2017 Romain SANCHEZ <romain.sanchez AT libre-informatique.fr>
*    Copyright (c) 2017 Libre Informatique [http://www.libre-informatique.fr/]
*
***********************************************************************************/

var app = {
    loggedIn: false,
    drawerOpened: false,
    settings: {},
    token: '',
    controlToken: '',
    history: [],
    lastId: '',
    urls: {
      login: '/default.php/login',
      control: '/tck.php/ticket/control',
      CSRF: '/default.php/guard/csrf',
      controlCSRF: '/tck.php/ticket/getControlCSRF',
      checkpoints: '/tck.php/ticket/jsonCheckpoints'
    },
    // Application Constructor
    initialize: function() {
      $(document)
        .on('deviceready', this.onDeviceReady.bind(this))
        
        .on('settings:ready', app.authenticate)

        .on('signin:success', app.getCheckpoints)

        .on('checkpoints:ready', app.utils.hideLoader)

        // Intercept keyboard input (scan)
        .keydown(function(e) {
          if(app.drawerOpened) {
            return;
          }

          if($('a[href="#history-tab"]').hasClass('active')) {
            $('ul.tabs').tabs('select_tab', 'main-tab');
          }

          // Force focus on input
          $('#ticket-id').focus();
          // Prevent softkeyboard from opening when focusing input
          Keyboard.hide();

          // Submit on line break 
          if(e.keyCode == 13) {
            app.control.doControl();
          }
        })
      ;

      // Compile handlebars templates
      app.templates = {
        controlResult: Handlebars.compile($('#control-result-template').html()),
        history: Handlebars.compile($('#history-template').html())
      };
    },
    // deviceready Event Handler
    //
    // Bind any cordova events here. Common events are:
    // 'pause', 'resume', etc.
    onDeviceReady: function() {
      app.utils.checkNetwork();
      app.getSettings();
      app.history.get();
      app.media.init();

      // Initialize tabs
      $('ul.tabs').tabs({
        // https://github.com/Dogfalo/materialize/issues/5121
        //swipeable: true,
      });

      // Save settings when drawer closes
      $('.button-collapse').sideNav({
        onOpen: function() {
          app.drawerOpened = true;
          app.utils.resetSelect();
          setTimeout(function() {
            mdc.slider.MDCSlider.attachTo($('#volume').get(0));
          }, '500');
        },
        onClose: function() {
          app.drawerOpened = false;
          app.saveSettings();

          app.utils.resetSelect();
        }
      });

      $('#sound').change(app.utils.toggleVolumeSlider);
    },
    media: {
      init: function() {
        // Get device app path
        var path = window.location.pathname;

        path = path.split('/');
        path.pop();
        path = path.join('/');

        app.media.controlError = new Media(path + '/media/triplebeep.mp3', app.media.success, app.utils.error);
        app.media.controlSuccess = new Media(path + '/media/beep.mp3', app.media.success, app.utils.error);
      },
      play: function(success) {
        if(success) {
          console.log(success);
          app.media.controlSuccess.play();

          return;
        }

        app.media.controlError.play();
      },
      success: function() {
        console.log('sound success'); 
      }
    },
    authenticate: function() {
      if(!app.loggedIn) {
        app.utils.showLoader();

        // Clear cookies
        window.cookies.clear(function(){});
    
        // Retrieve CSRF token then signin
        $.when(app.getCSRF())
         .then(function() {
            var data = {
              signin: app.settings.signin
            };

            data.signin['_csrf_token'] = app.token;

            $.ajax({
              method: 'POST',
              url: app.settings.server + app.urls.login,
              data: data, 
              success: function(response, status, xhr) {
                if($(response).find('#signin_username').length > 0) {
                  app.utils.signinFailure();

                  return ;
                }

                app.loggedIn = true;

                Materialize.toast('Connexion réussie', 1000);

                $(document).trigger('signin:success');
              },
              error: app.utils.signinFailure
            });
         });
      }
    },
    control: {
      doControl: function() {
        var ticketId = $('#ticket-id').val();
        // Clear ticket id
        $('#ticket-id').val('');

        if(ticketId == app.lastId) {
          setTimeout(function() {
            app.lastId = null;
          }, app.settings.redondancy * 1000);

          return;
        }

        app.utils.showLoader();
        $('#result').empty();

        // Retrieve CSRF token then send control request
        $.when(app.control.getCSRF())
         .then(function() {
          if(!app.controlToken) {
            app.loggedIn = false;
            app.authenticate();
          }

          var controlUrl = app.settings.server + app.urls.control;
          var checkpointId = $('#checkpoint-id').val();

          if(!checkpointId) {
            app.utils.hideLoader();

            Materialize.toast('Veuillez selectionner un point de contrôle', 2000);

            return;
          }

          var postData = {
            control: {
              _csrf_token: app.controlToken,
              ticket_id: ticketId,
              checkpoint_id: checkpointId 
            }
          };

          app.lastId = ticketId;

          $.post(controlUrl, postData, app.control.handleResponse);
        });
      },
      // Handle control result
      handleResponse: function(response) {
        var warningCodes = [1002, 1003, 1005, 1006];

        if(!response.success) {
          console.error(response);
          response.error = response.details.control.errors.join(', ');
        }

        app.utils.hideLoader();

        if(app.settings.sound) {
          app.media.play(response.success);
        }

        if(warningCodes.indexOf(response.code) != -1) {
          response.warning = true;
        }

        app.history.save(response);

        $('#result').html(app.templates.controlResult(response));
      },
      getCSRF: function() {
        var url = app.settings.server + app.urls.controlCSRF;

        return $.get(url, function(token) {
          app.controlToken = token;
        });
      }
    },
    getCSRF: function() {
      var csrfUrl = app.settings.server + app.urls.CSRF;

      return $.ajax({
        url: csrfUrl,
        success: function(token) {
          app.token = token;
        },
        error: app.utils.signinFailure
      });
    },
    getCheckpoints: function() {
      return $.get(app.settings.server + app.urls.checkpoints, function(data) {
        if(typeof data == 'string') {
          data = JSON.parse(data);
        }

        if(data.length < 1) {
          Materialize.toast('Pas de point de contrôle disponible, veuillez contacter votre administrateur', 10000);

          app.utils.hideLoader();

          app.exit();

          return;
        }

        var select = $('#checkpoint-id');

        select
          .find('option')
          .not('.default')
          .remove()
        ;

        $.each(data, function(key, checkpoint) {
          $('<option>')
            .val(checkpoint.id)
            .text(checkpoint.name + '@' + checkpoint.Event.Translation.fr.name)
            .appendTo(select);

            return;
        });

        // Reset input
        app.utils.resetSelect();

        $(document).trigger('checkpoints:ready');
      });
    },
    // Retrieve settings from SharedPreferences
    getSettings: function(e) {
      NativeStorage.getItem('settings', app.utils.applySettings, function() {
        Materialize.toast('Veuillez renseigner vos informations de connexion', 3000);

        $('.button-collapse').trigger('click');
      });
    },
    // Persist settings in SharedPreferences
    saveSettings: function() {
      var settings = {
        signin: {
          username: $('#user').val(),
          password: $('#password').val()
        },
        server: $('#server').val(),
        sound: $('#sound').prop('checked'),
        volume: $('#volume').attr('aria-valuenow'),
        screen: $('#screen').prop('checked'),
        history: $('#history').prop('checked'),
        public: $('#public').prop('checked'),
        redondancy: $('#redondancy').val()
      }

      NativeStorage.setItem('settings', settings, app.utils.applySettings, app.utils.error);
    },
    history: {
      items: [],
      add: function(control) {
        var history = $('#history-list');
        var date = app.utils.getDate(control.timestamp);

        var currentDate = app.utils.getDate(
          history
            .find('.day')
            .last()
            .find('h5')
            .text()
        );

        if(date > currentDate || history.find('.day').length == 0) {
          date = control.timestamp.split(' ');

          history.prepend(
            $('<li>')
              .addClass('day center')
              .html($('<h4>').text(date[0]))
          );
        }

        $(app.templates.history(control)).insertAfter(
          history.find('.day').last()
        );
      },
      get: function() {
        NativeStorage.getItem('history', function(items) {
          $('#history-list').empty();

          $.each(items, function(key, item) {
            app.history.add(item);
          });
        }, app.utils.error);
      },
      save: function(item) {
        if(app.settings.history) {
          app.history.items.push(item);
        }

        NativeStorage.setItem('history', app.history.items, function() {
          app.history.add(item);
        }, app.utils.error);
      }
    },
    exit: function() {
      setTimeout(function() {
        navigator.app.exitApp();
      }, 7000);
    },
    utils: {
      signinFailure: function() {
        Materialize.toast('Erreur d\'authentification: veuillez vérifier vos informations de connexion', 3000);

        app.utils.hideLoader();
        app.loggedIn = false;

        $('.button-collapse').trigger('click');
      },
      applySettings: function(settings) {
        if(app.settings.server != settings.server || 
          app.settings.signin.username != settings.signin.username ||
          app.settings.signin.password != settings.signin.password
        ){
          app.loggedIn = false;
        }

        app.settings = settings;

        $('#user').val(app.settings.signin.username);
        $('#password').val(app.settings.signin.password);
        $('#server').val(app.settings.server);
        $('#sound').prop('checked', app.settings.sound);
        $('#volume').attr('aria-valuenow', app.settings.volume);
        $('#screen').prop('checked', app.settings.screen);
        $('#history').prop('checked', app.settings.history);
        $('#redondancy').val(app.settings.redondancy);

        Materialize.updateTextFields();

        app.utils.toggleVolumeSlider();

        if(app.settings.sound) {
          window.androidVolume.set(
            $('#volume').attr('aria-valuenow'),
            false,
            function(){console.log($(document.activeElement))},
            app.utils.error
          );
        }

        // Keep screen on
        app.settings.screen ? window.plugins.insomnia.keepAwake() : window.plugins.insomnia.allowSleepAgain();

        // Public mode
        var adminElements = $('.button-collapse, #tabs, .select-dropdown');

        app.settings.public ? adminElements.hide() : adminElements.show();

        // Clear history
        if(!app.settings.history) {
          NativeStorage.remove('history', function() {}, app.utils.error);
        }

        $(document).trigger('settings:ready');
      },
      // Check for network connection
      checkNetwork: function() {
        if(navigator.connection.type == Connection.NONE) {
          Materialize.toast('Veuillez vérifier votre connexion internet et redémarrer l\'application', 10000);
          
          app.exit();
        }
      },
      error: function(error) {
        console.error(error);
      },
      showLoader: function() {
        $('#loader').addClass('active');
      },
      hideLoader: function() {
        $('#loader').removeClass('active');
      },
      toggleVolumeSlider: function() {
        if($('#sound').prop('checked')) {
          $('#volume').removeClass('mdc-slider--disabled');
          $('.mdc-slider__thumb circle').css({
            fill: '#26A69A',
            stroke: '#26A69A'
          });
        } else {
          $('#volume').addClass('mdc-slider--disabled');  
          $('.mdc-slider__thumb circle').css({
            fill: 'grey',
            stroke: 'grey'
          });
        }
      },
      resetSelect: function() {
        var checkpointSelect = $('#checkpoint-id');

        checkpointSelect.material_select('destroy');
        checkpointSelect.material_select();
      },
      getDate: function(date) {
        date = date.split(' ')[0];
        date = date.split('/');
        
        var year = date.pop();
        var month = date.pop();

        date = [month, date[0], year];
        date = date.join('/');
        
        return new Date(date);
      }
    }
};

app.initialize();