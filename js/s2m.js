'using strict';
google.load('visualization', '1', { packages: ['table', 'corechart'] });

var Geo={};
var last5Geo={};
var last10Geo={};
var appStartTime = 0;
var store_string = "";
var promo_string = "";
var jsonCurrentProduct = null;
var currentItemLiquidPrice = '34.99';
var geoLocWatchId = 0; // geoLoc wathcing
var lastProximityMessage = null;
var lastWelcomeMessage = null;
var lastDealMessage = null;
var lastDataTable = null;
var lastDataTableReadTime = null;
// Global variables for the closest store
var closestStoreDistance = 100000000000.0;
var closestStoreCatalog = null;
var closestStoreId = null;
var closestStoreName = null;
var closestStoreLat = 0;
var closestStoreLng = 0;
var closestStoreProximityMessage = null;
var closestStoreWelcomeMessage = null;
var closestStoreDealMessage = null;
var closestStorePropertyRadius = 0.0;
var closestStoreProximityRadius = 0.0;
var storeProperty={}; // id, arrivalTime, welcomeMessage, dealMessage
var watchCounter = 0;
var lat5queue = new Array();
var lng5queue = new Array();
var lat10queue = new Array();
var lng10queue = new Array();
var intervalCurrentPosition = null; // variable to track interval timer to monitor current position

document.addEventListener("deviceready", onDeviceReady, false);

function onDeviceReady() {
  registerNotificationPermission();
  cordova.plugins.backgroundMode.enable();
  intialLoad();
  // Refer to https://github.com/christocracy/cordova-plugin-background-geolocation

  <!-- notification callbacks -->
  cordova.plugins.notification.local.on('schedule', function (notification) {
    console.log('onschedule', notification.id);
    // showToast('scheduled: ' + notification.id);
  });

  cordova.plugins.notification.local.on('update', function (notification) {
    console.log('onupdate', notification.id);
    // showToast('updated: ' + notification.id);
  });
}
  
$(document).on("pagebeforeshow","#promosPage",function() {
  showPromos();
});

function showPromos(){
  //alert("Recalc Clicked!");
  $('#storeName').text(closestStoreName);
  s2mStoreItemsData(closestStoreCatalog, function() {
    $('#promos_list').html(promo_string);
  });
}

function showDisclaimer() {
  var strDisclaimer = "This is an AP Computer Science project not intended for general public use.";
  
  // Remove the comment characters ('//') below if you would like to display a legal disclaimer when
  // the application is launched:
  // 
  // alert(strDisclaimer); 
}

function intialLoad() {
  //alert('Welcome to S2M');
  showDisclaimer()
  appStartTime = new Date().getTime();
  updateStoreProperty(); // initialize closest store info

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(success, error, {timeout: 4000, enableHighAccuracy: true});
  }    

  //Get the latitude and the longitude;
  function success(position) {
    Geo.lat = position.coords.latitude;
    Geo.lng = position.coords.longitude;
    last5Geo.lat = position.coords.latitude;
    last5Geo.lng = position.coords.longitude;
    last10Geo.lat = position.coords.latitude;
    last10Geo.lng = position.coords.longitude;
    initGeoLocationQueues(Geo.lat, Geo.lng);

    console.log('Lat long is: ' + Geo.lat + ', ' + Geo.lng);
    updateLatLongTextBox(Geo.lat, Geo.lng);
    s2mReadCustomersData(function() {
      console.log('[success callback] store_string:' + store_string);
      showStores();
      // Now start checking location every 5 seconds...
      intervalCurrentPosition = setInterval(
        function() {
          navigator.geolocation.getCurrentPosition(geolocationWatchSuccess, geolocationWatchError, {timeout: 4000, enableHighAccuracy: true});
        }, 
        locationRefreshInterval);
    });
  }

  function error(){
    console.log("Geocoder failed");
  }

}

function updateLatLongTextBox(lat, lng){
  $('#Lat').val(lat.toPrecision(7));
  $('#Long').val(lng.toPrecision(8));
}

registerNotificationPermission = function () {
  cordova.plugins.notification.local.registerPermission(function (granted) {
    //alert(granted);
    console.log('Notification permission granted='+granted);
  });
};

function scheduleNotification(notId, notText) {
  var sound = device.platform == 'Android' ? 'file://sound.mp3' : 'file://beep.caf';
  cordova.plugins.notification.local.schedule({
    id:   notId,
    text: notText,
    icon: 'http://www.optimizeordie.de/wp-content/plugins/social-media-widget/images/default/64/googleplus.png',
    sound: sound,
    data: { test: 5 }
  });
};

function updateNotification(notId, notText) {
  cordova.plugins.notification.local.update({
    id:    notId,
    text:  notText,
    json:  { updated:true }
  });
};

scheduleDelayed = function () {
  var now             = new Date().getTime(),
  _5_sec_from_now = new Date(now + 5*1000);

  var sound = device.platform == 'Android' ? 'file://sound.mp3' : 'file://beep.caf';

  cordova.plugins.notification.local.schedule({
    id:    1,
    title: 'Scheduled with delay',
    text:  'Test Message 1',
    at:    _5_sec_from_now,
    sound: sound
  });
};

notificationsCallback = function () {
  cordova.plugins.notification.local.getIds(function (ids) {
    showToast('IDs: ' + ids.join(' ,'));
  });
};

showToast = function (text) {
  setTimeout(function () {
    window.plugins.toast.showShortBottom(text);
  }, 500);
};


function initGeoLocationQueues(lat, lng) {
  var i;
  for (i=0; i < 5; i++) {
    lat5queue.push(lat);
    lng5queue.push(lng);
  }
  for (i=0; i < 10; i++) {
    lat10queue.push(lat);
    lng10queue.push(lng);
  }
}

function recalcLast5Geo(lat, lng) {
  var oldLat = lat5queue.shift();
  var oldLng = lng5queue.shift();
  var sumLng = 5*last5Geo.lng;
  var sumLat = 5*last5Geo.lat;
  lat5queue.push(lat);
  lng5queue.push(lng);
  last5Geo.lat = (sumLat + lat - oldLat)/5.0;
  last5Geo.lng = (sumLng + lng - oldLng)/5.0;
}

function recalcLast10Geo(lat, lng) {
  var oldLat = lat10queue.shift();
  var oldLng = lng10queue.shift();
  var sumLat = 10*last10Geo.lat;   
  var sumLng = 10*last10Geo.lng;
  lat10queue.push(lat);
  lng10queue.push(lng);
  last10Geo.lat = (sumLat + lat - oldLat)/10.0;
  last10Geo.lng = (sumLng + lng - oldLng)/10.0;
}

function updateGeoLocations(lat, lng) {
  Geo.lat = lat;
  Geo.lng = lng;
  updateLatLongTextBox(lat, lng);
  watchCounter++;
  //console.log('Got location update count=' + watchCounter);
  recalcLast5Geo(lat, lng);
  recalcLast10Geo(lat, lng);
}

function geolocationWatchSuccess(position) {
  updateGeoLocations(position.coords.latitude, position.coords.longitude);
  geolocationWatchSuccess_helper(position.coords.latitude, position.coords.longitude);
}
function geolocationWatchSuccess_helper(lat, lng) {
  //alert('Latitude: '  + position.coords.latitude + '. ' + 'Longitude: ' + position.coords.longitude);
  var locationText = watchCounter + ': Latitude: '  + Geo.lat+ '. ' + 'Longitude: ' + Geo.lng;
  var currentTime = new Date().getTime();
  locationText += '. Diff=' + (currentTime - appStartTime) + ' current:' + currentTime +' , start: ' + appStartTime;
  
  // Ignore bogus callbacks during 30 seconds of startup.
  if ((currentTime = appStartTime) < 30000) {
    return;
  }

  console.log(locationText);
  //alert(currentTime + ' ' + lastDataTableReadTime);
  
  if (lastDataTableReadTime != null && (currentTime - lastDataTableReadTime) > 60000) {
    console.log('60 seconds since last catalog read.');
    //lastDataTable = null;
    //s2mReadCustomersData(function() {
    //  console.log('[success callback] store_string:' + store_string);
    //  showStores();
    //}
  }
  //alert(locationText);
  //scheduleNotification(1, locationText);
  gladiatorClosestStoreCatalog(function(storeCatalog) {
    var last5Distance = closestStoreDistance+50;
    var last10Distance = closestStoreDistance+50;
    // logic for proximity message
    if (closestStoreProximityMessage != null && closestStoreDistance < 300) {
      last5Distance = distEuclidean(closestStoreLat, closestStoreLng, last5Geo.lat, last5Geo.lng);
      if (lastProximityMessage != closestStoreProximityMessage) { // Show only once 
        lastProximityMessage = closestStoreProximityMessage;
        notifyOrAlert(watchCounter + ': ' + closestStoreProximityMessage + '.\nDistance=' + closestStoreDistance.toFixed(1));
      }
    }
    // logic for welcome message
    if (storeProperty.id != null) {
      if (storeProperty.arrivalDuration > 15 && storeProperty.welcomeMessageDisplayed == false) 
      {
        storeProperty.welcomeMessageDisplayed = true;
        notifyOrAlert(watchCounter + ': ' + closestStoreWelcomeMessage + '.\nDistance=' + closestStoreDistance.toFixed(1));
      }
      if (storeProperty.arrivalDuration > 30 && storeProperty.dealMessageDisplayed == false) {
        storeProperty.dealMessageDisplayed = true;
        notifyOrAlert(watchCounter + ': ' + closestStoreDealMessage + '.\nDistance=' + closestStoreDistance.toFixed(1));
      }
    }
  });
}

function geolocationWatchError(error) {
  //alert('code: '    + error.code    + '\n' + 'message: ' + error.message + '\n');
  console.log('ERROR code: '    + error.code    + '\n' + 'message: ' + error.message + '\n');
  //geoLocWatchId = navigator.geolocation.watchPosition(geolocationWatchSuccess,geolocationWatchError,{timeout: 5000, enableHighAccuracy: true});
}

function showStoreAndItems(){
  var x = $('#Lat').val();
  var y = $('#Long').val();
  var i = 0;
  $('#stores_list').html(store_string);
}

function setLatLongAndRecalc(x, y) {
  $('#Lat').val(x);
  $('#Long').val(y);
  recalc_clicked();
}

function showStores(){
  var x = $('#Lat').val();
  var y = $('#Long').val();
  var i = 0;
  $('#stores_list').html(store_string);
}

function recalc_clicked(){
  alert("Recalc Clicked!");

  gladiatorClosestStoreCatalog(function(storeCatalog) {
    gladiatorStoreItemsData(storeCatalog, function() {
      //showStoreAndItems();
    });
  });
}

function recalc_clicked_old(){
  //alert("Recalc Old Clicked!");
  lastDataTable = null;
  s2mReadCustomersData(function() {
    showStores();
    dummyCheck();
  });
}

// created this function just to test from browser
function dummyCheck() {
  var x = $('#Lat').val();
  var y = $('#Long').val();
  Geo.lat = x;
  Geo.lng = y;
  last5Geo.lat = x;
  last5Geo.lng = y;
  last10Geo.lat = x;
  last10Geo.lng = y;
  initGeoLocationQueues(Geo.lat, Geo.lng);
  geolocationWatchSuccess_helper(x, y);
}

function distEuclidean(lat1, long1, lat2, long2) {
  var dlong = (long2 - long1);
  var dlat  = (lat2 - lat1);

  var d = 100*Math.sqrt(dlong*dlong + dlat*dlat);
  return d;
}

// Reference: http://stackoverflow.com/questions/15890081/calculate-distance-in-x-y-between-two-gps-points
// Artcile: http://www.movable-type.co.uk/scripts/latlong.html
function distHaversine(lat1, long1, lat2, long2) {
  var dlong = (long2 - long1)*Math.PI/180;
  var dlat  = (lat2 - lat1)*Math.PI/180;

  // Haversine formula:
  var R = 6371;
  var sinDlat = Math.sin(dlat/2);
  var sinDLong = Math.sin(dlong/2);
  var a = sinDlat*sinDlat + Math.cos(lat1)*Math.cos(lat2)*sinDLong*sinDLong;
  var c = 2 * Math.atan2( Math.sqrt(a), Math.sqrt(1-a) );
  var d = R * c;
  return d;
}

function updateStoreProperty() {
  if (closestStoreDistance < closestStorePropertyRadius) {
    if (storeProperty.id != closestStoreId) {
      storeProperty.id = closestStoreId;
      storeProperty.arrivalTime = new Date().getTime();
      storeProperty.arrivalDuration = 0;
      storeProperty.welcomeMessageDisplayed = false;
      storeProperty.dealMessageDisplayed = false;
    } else {
      storeProperty.arrivalDuration = (new Date().getTime() - storeProperty.arrivalTime)/1000; // in seconds
    }
    $('#statusMessage').html(watchCounter + ': ' +' Property:' + storeProperty.id + '. Duration:' + 
      storeProperty.arrivalDuration + '. Distance:' + closestStoreDistance.toFixed(0));
   } else {
    var dtNow = new Date();
    storeProperty.id = null;
    storeProperty.arrivalTime = dtNow.getTime();
    storeProperty.arrivalDuration = -1; // hasn't arrived.
    storeProperty.welcomeMessageDisplayed = false;
    storeProperty.dealMessageDisplayed = false;
    $('#statusMessage').html(watchCounter + '-' + dtNow.getMinutes() + ':' + dtNow.getSeconds()+ ' Closest:' + closestStoreId + '. Distance:' + closestStoreDistance.toFixed(0));
  }
 }

function parseCustomersData(x, y, radius) {
  var i = 0;

  var data = lastDataTable;
  //and store it in local storage
  // http://stackoverflow.com/questions/27906173/cant-seem-to-store-and-retrieve-google-charts-data-in-local-storage-using-jstor
  // $.jStorage.set("customersData", data);
  var count = data.getNumberOfRows();
  var strDisplay = "";
  var dx, dy, kmDistance;
  var distHarv;
  var distError;
  var arrStores = [];
  var tempStoreString = "";
  var store = null;

  console.log('[parseCustomersDataAndCallback]: count of customers=' + count);
  if (count < 1) {
    alert ("There are no S2M customers in your proximity.");
  } else {
    store_string = "";
    for (i=0; i < count; i++) {
      a = data.getValue(i,0); // store id
      b = data.getValue(i,1); // store name
      d = data.getValue(i,3); // city
      g = data.getValue(i,6); // store lat
      h = data.getValue(i,7); // store long
      l = data.getValue(i,11); // store image url
      m = data.getValue(i,12); // store catalog url
      dx = (parseFloat(g)-x)*100; // distance in Km
      dy = (parseFloat(h)-y)*100; // distance in Km
      //kmDistance = Math.sqrt(dx*dx + dy*dy);
      distHarv = distHaversine(x,y, parseFloat(g), parseFloat(h));
      //distError = (distHarv-kmDistance)*100/distHarv;
      strDisplay += a + ', ' + b + ', ' + g + ', ' + h + ', ' + d + '\r\n';
      //console.log(strDisplay);
      arrStores.push({dist: distHarv, storeId: a, name: b, city: d, imgUrl: l, catalogUrl: m});
      //store_string += tempStoreString;
    }
    var sortedStores = arrStores.sort(function(a, b) {
      return a.dist - b.dist;
    });
    i=0;
    var storeBackColors = ['#FFFEE6', '#FFF3F7', '#EBFEEC', '#E8FAFF']
    for (var st in sortedStores) {
      i++;
      store = arrStores[st];
      tempStoreString = '<li><div id="store_' + store.storeId + '" style="border: 0px solid;border-radius: 0px; background: ' + storeBackColors[i%4] + ';">';
      tempStoreString += '<img style="width: 50px;height: 50px;float:left;margin-top: 1px;" src="' + store.imgUrl + '"/>';
      tempStoreString += '<p style="margin: 8px 0px 0px 60px; font-weight: bold;">' + store.name + ', ' + store.city + '<p>';
      tempStoreString += '<p style="margin-left:60px; color: #777; font-size: small;">' + store.dist.toFixed(3) + ' Km. ';
      //store_string += kmDistance.toFixed(3) + ' Km. Error: ' + distError.toFixed(2);
      tempStoreString += '</div></li>';
      store_string += tempStoreString;
    }
    //store_string = "";
    //alert (strDisplay);
  }
}

function s2mReadCustomersData(callback_func) {
  var x = parseFloat($('#Lat').val());
  var y = parseFloat($('#Long').val());
  var radius = parseFloat($('#Radius').val())*0.01;
  // Reference: https://developers.google.com/chart/interactive/docs/querylanguage
  // https://developers.google.com/chart/interactive/docs/reference#dataparam
  //alert ('x=' + x + ', y=' +y);

  var tq_query = "&tq=select * ";
  var gvizQuery;
  var data;

  tq_query += " where G > " + (x-radius);
  tq_query += " and G < " + (x+radius);
  tq_query += " and H > " + (y-radius);
  tq_query += " and H < " + (y+radius);
  //tq_query += " and P = 'Automotive'"
  //tq_query += " ORDER by SUM((" + x + "-G)*(" + x + "-G) + (" + y + "-H)*(" + y + "-H))";
  //console.log(tq_query);
  if (lastDataTable == null) {
    gvizQuery = new google.visualization.Query(s2m_customers_gsheet_url + tq_query);

    gvizQuery.send(function(response) {
      if (response.isError()) {
        alert('Error in query: ' + response.getMessage() + ' ' + response.getDetailedMessage());
        return;
      }

      lastDataTable = response.getDataTable();
      lastDataTableReadTime = new Date().getTime();
      console.log('[s2mReadCustomersData]: read the table at: ' + lastDataTableReadTime);
      parseCustomersData(x, y, radius);
      callback_func();    
    });
  } else {
    parseCustomersData(x, y, radius);
    callback_func();    
  }
}

function gladiatorClosestStoreCatalog(callback_func) {
  // Reference: https://developers.google.com/chart/interactive/docs/querylanguage
  // https://developers.google.com/chart/interactive/docs/reference#dataparam
  var x = parseFloat($('#Lat').val());
  var y = parseFloat($('#Long').val());
  var radius = parseFloat($('#Radius').val())*0.01; 
  var i = 0;

  //alert ('x=' + x + ', y=' +y);

  var tq_query = "&tq=select * where";
  var gvizQuery;
  var data;
  //var vendor_id = localStorage["current_vendor_id"];
  //var item_id = localStorage["current_item_id"];

  //tq_query += " G > 47.0";
  tq_query += " G > " + (x-radius);
  tq_query += " and G < " + (x+radius);
  tq_query += " and H > " + (y-radius);
  tq_query += " and H < " + (y+radius);
  tq_query += " and P = 'Automotive'";
  if (lastDataTable == null) {
    gvizQuery = new google.visualization.Query(s2m_customers_gsheet_url + tq_query);

    gvizQuery.send(function(response) {
      if (response.isError()) {
        alert('Error in query: ' + response.getMessage() + ' ' + response.getDetailedMessage());
        return;
      }

      lastDataTable = response.getDataTable();
      lastDataTableReadTime = (new Date).getTime();
    });
  }
  else {
    data = lastDataTable;
    //and store it in local storage
    // http://stackoverflow.com/questions/27906173/cant-seem-to-store-and-retrieve-google-charts-data-in-local-storage-using-jstor
    // $.jStorage.set("customersData", data);
    var count = data.getNumberOfRows();
    var themes = ['f', 'b', 'c', 'd', 'e'];
    var strDisplay = "";
    var lastMinDistance = 10000000000.00; // large number
    var currentDistance = 0.0;
    var x1, y1;
    if (count > 0) {
      store_string = "";
      for (i=0; i < count; i++) {
        a = data.getValue(i,0); // store id
        b = data.getValue(i,1); // store name
        d = data.getValue(i,3); // city
        e = data.getValue(i,4); // state
        g = data.getValue(i,6); // store lat
        h = data.getValue(i,7); // store long
        l = data.getValue(i,11); // store image url
        m = data.getValue(i,12); // store catalog url
        r = data.getValue(i,17); // s2m message
        s = data.getValue(i,18); // welcome message
        t = data.getValue(i,19); // deals
        u = data.getValue(i,20); // property radius
        v = data.getValue(i,21); // proximity radius
        strDisplay += a + ', ' + b + ', ' + g + ', ' + h + ', ' + e + '\r\n';
        x1 = parseFloat(g);
        y1 = parseFloat(h);
        currentDistance = 1000*distHaversine(x1, y1, x, y);
        if (currentDistance < lastMinDistance) {
          lastMinDistance = currentDistance;
          closestStoreId = a;
          closestStoreCatalog = m;
          closestStoreName = b + ', ' + d ;
          closestStoreLat = x1;
          closestStoreLng = y1;
          closestStoreDistance = currentDistance; // in meters
          closestStoreProximityMessage = r;
          closestStoreWelcomeMessage = s;
          closestStoreDealMessage = t;
          closestStorePropertyRadius = parseFloat(u);
          closestStoreProximityRadius = parseFloat(v);
        }
      }
      //alert (strDisplay);
    }
    updateStoreProperty();
    callback_func(closestStoreCatalog);
  }
}

function s2mStoreItemsData(catalogURL, callback_func) {
  // Reference: https://developers.google.com/chart/interactive/docs/querylanguage
  // https://developers.google.com/chart/interactive/docs/reference#dataparam
  var i = 0; 
  var tq_query = "&tq=select * where";
  var gvizQuery;
  var data = null;
  var count = 0;
  var strDisplay = "";
  var wt = $("#stores_list").width(); 
  var ht = 2.0*wt/3.0;


  tq_query += " G > 0.0"; // pick up the items with promo price
  gvizQuery = new google.visualization.Query(catalogURL + tq_query);
  promo_string = "";

  gvizQuery.send(function(response) {
    if (response.isError()) {
      alert('Error in query: ' + response.getMessage() + ' ' + response.getDetailedMessage());
      return;
    }
    
    data = response.getDataTable();
    count = data.getNumberOfRows();
    //and store it in local storage
    // http://stackoverflow.com/questions/27906173/cant-seem-to-store-and-retrieve-google-charts-data-in-local-storage-using-jstor
    // $.jStorage.set("customersData", data);
    if (count > 0) {
      for (i=0; i < count; i++) {
        a = data.getValue(i,0); // id
        b = data.getValue(i,1); // category
        c = data.getValue(i,2); // name
        d = data.getValue(i,3); // description
        e = data.getValue(i,4); // item URL
        f = data.getValue(i,5); // retail price
        g = data.getValue(i,6); // promo price
        if (g == null || parseFloat(g) <= 0) continue;             
        strDisplay += a + ', ' + b + ', ' + c + ', ' + d + ', ' + e + ', ' + f + '\r\n';
        promo_string += '<li data-userid="' + a + '">';
        promo_string += '<div style="background-image: url(' + e + '); background-repeat: no-repeat;';
        promo_string += ' background-size: cover; width: ' + wt + 'px; height: ' + ht + 'px;">';
        promo_string += '<p style="color: #fff; font-size: 20px; margin: 8px 8px 0px 8px; font-weight: bold; float:right;">$ ' + g + '</p>';
        promo_string += '<div style="position:relative; top: ' + (ht-50) + 'px; margin: 8px 0px 0px 8px;">';
        promo_string += '<span style="font-family: Verdana, Geneva, sans-serif; color: #fff; font-size: 16px;">' + c + '</span><br>';
        promo_string += '<span style="font-family: Verdana, Geneva, sans-serif; color: #fff; font-size: 14px;">' + d + '</span>';
        promo_string += '</div></div><hr></li>';
      }
      //alert (strDisplay);
    }
    callback_func();
  });
}