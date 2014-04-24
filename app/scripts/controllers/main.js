'use strict';

angular.module('uberLocationApp')
  .controller('MainCtrl', function ($scope, $http, $resource, $log) {
    //Resource call should be meteor like? show changes first, if error, undo and notify user.
    var ResourceLocation = $resource('api/locations');
    var ResourceLocationId = $resource('api/locations/:id', {
      id: '@id'
    },{
      update: {
        method:'PUT',
        params: {}
      }
    });

    $scope.locationCreate = {
      params: {},
      status: {}
    };

    $http.get('/api/awesomeThings').success(function(awesomeThings) {
      $scope.awesomeThings = awesomeThings;
    });
    google.maps.visualRefresh = true;

    $scope.map = {
      center: {
        latitude: 49.25,
        longitude: -123.1
      },
      zoom: 12,
      dragging: false,
      bounds: {},
      options: {
        streetViewControl: false,
        panControl: false,
        maxZoom: 20,
        minZoom: 3
      },
      control: {},
      dynamicMarkers: [
        {
          latitude: 49.26175546590094,
          longitude: -123.04447174072266,
          showWindow: false
        }
      ],
      events: {
        click: function (mapModel, eventName, originalEventArgs) {
          // 'this' is the directive's scope
          $log.log('user defined event: ' + eventName, mapModel, originalEventArgs);

          var e = originalEventArgs[0];

          if (!$scope.map.clickedMarker) {
            $scope.map.clickedMarker = {
              title: 'You clicked here',
              latitude: e.latLng.lat(),
              longitude: e.latLng.lng()
            };
          }
          else {
            $scope.map.clickedMarker.latitude = e.latLng.lat();
            $scope.map.clickedMarker.longitude = e.latLng.lng();
          }

          //not sure if angular-google maps needs clickedMarker lat long internally or not,
          // so leave as is for now
          $scope.locationCreate.params.latitude = $scope.map.clickedMarker.latitude;
          $scope.locationCreate.params.longitude = $scope.map.clickedMarker.longitude;

          //reverse geocode into google to grab human readable address
          var RevGeocodeResource = $resource('https://maps.googleapis.com/maps/api/geocode/json?latlng='
            + $scope.locationCreate.params.latitude
            +','
            + $scope.locationCreate.params.longitude
            + '&sensor=false');

          $scope.locationCreate.params.address = RevGeocodeResource.get();
          $scope.locationCreate.params.address.$promise.then(function(result) {
            console.log(result.results[0].formatted_address);
            $scope.locationCreate.params.address = result.results[0].formatted_address;
          });

          $scope.$apply();
          clearObject($scope.locationCreate.status);
          console.log($scope.map.clickedMarker);
        }
      }
    };

    $scope.locationCreate.submit = function(form) {
      if (!$scope.locationCreate.params.address) {
        //display warning in red
        console.log('Need to click on map to select address first');
        $scope.locationCreate.status.needAddress = true;
        return;
      }

      var toPush = clone($scope.locationCreate.params);

      ResourceLocation.save($scope.locationCreate.params, function() {
        console.log('Post success');
        //inject it into model so user sees it right away (as opposed to AJAXing the server)
        $scope.existingLocations.push(toPush);
        //TODO: make scroll effect so user sees newly created location?
      }, function() {
        console.log('Post error');
        // TODO: tell user there was error. TODO: way to generalize this for all resource requests?
      });

      // upon submit: clear all fields & have a area that says Saved!
      $scope.locationCreate.params = {};
      $scope.locationCreate.status.saveSuccess = true; // need to reset after more clicks
      // maybe after save, scroll down to google picture of created location?
    };
    // ------ END: $scope.locationCreate.submit() ---------

    $scope.locationDelete = function(event, location) {
      //maybe add a blocking dialog to confirm deletion.
        //then even do a check, ensure 200 from delete.

      // http://jsfiddle.net/ricardohbin/5z5Qz/

      event.toElement.parentElement.parentElement.style.display = 'none';
      //TODO: remove map markers as well. this means we need to find elements in model to remove.
      //add smooth transitions later
      //TODO: add unit test here to ensure this hierachal relationship isnt messed

      ResourceLocationId.remove({id: location._id});
    };

    $scope.locationNameEdit = function(event, location) {
      var elInput = event.toElement.parentElement.firstElementChild;

      //placed on model. so we can utilize isolated scope
      location.hasLocationNameEditClicked = true;
      elInput.removeAttribute('readonly');

      // upon keypress enter or clicking a new save glyph, perform rest call.
      // keypress: ould use directive-->emit event to update. 
      // http://stackoverflow.com/questions/17470790/how-to-use-a-keypress-event-in-angularjs
    };

    $scope.locationNameEditSubmit = function(event, location) {
      //make box readonly again. OR just reload all locations
      location.hasLocationNameEditClicked = false;

      console.log(location.assignedName);
      ResourceLocationId.update({id: location._id}, {updatedName: location.assignedName});
    };

    /////////// on page load, query DB to get existing locations.

    $scope.existingLocations = ResourceLocation.query();
    $scope.existingLocations.$promise.then(function(result) {
      var currentItr;
      var i;
      
      // this inits the edit/submit glyph
      for (i in result) {
        currentItr = result[i];
        currentItr.hasLocationNameEditClicked = false; // works as we take reference to object
      }

      $scope.existingLocations = result; // existingLocations is our main model
      $scope.map.dynamicMarkers = $scope.existingLocations; // TODO: TEST this. gives us ability to put anything in markers now
      console.log($scope.map.dynamicMarkers);
    });

    ///////////// helper functions

    function clearObject(statusObj) {
      console.log('status cleared');
      for (var prop in statusObj) {
        if (statusObj.hasOwnProperty(prop)) {
          delete statusObj[prop];
        }
      }
    }

    function clone(obj) {
      if (null == obj || 'object' != typeof obj) {
        return obj;
      }
      var copy = obj.constructor();

      for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) {
          copy[attr] = obj[attr];
        }
      }

      return copy;
    }
  });
