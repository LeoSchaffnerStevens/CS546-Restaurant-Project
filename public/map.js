let map;
let lat = parseFloat(document.getElementById("lat").getAttribute("value"));
let lng = parseFloat(document.getElementById("lng").getAttribute("value"));
let name = document.getElementById("restaurantName").textContent;
let address = document.getElementById("ad").getAttribute("value");

function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: {lat: lat, lng: lng},
        zoom: 10
    });

    const marker = new google.maps.Marker({
        position: {lat: lat, lng: lng},
        map,
        title: name
    });

    const contentString = 
    `<h2>${name}</h2>` + 
    `<p>${address}</p>`;
    // content can be modified to add more stuff
    const infowindow = new google.maps.InfoWindow({
        content: contentString
    });

    infowindow.open(map, marker);

    marker.addListener("click", () => {
        infowindow.open(map, marker);
    });

    infoWindow = new google.maps.InfoWindow();
    const locationButton = document.createElement("button");
    locationButton.textContent = "Move To Current Location";
    locationButton.classList.add("current-location");
    map.controls[google.maps.ControlPosition.TOP_CENTER].push(locationButton);
    locationButton.addEventListener("click", () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          let markerC = new google.maps.Marker({
            position: {lat: position.coords.latitude, lng: position.coords.longitude},
            map,
            title: "current location"
          });
          infoWindow.setContent("Current Location");
          infoWindow.open(map, markerC);
          markerC.addListener("click", () => {
            infoWindow.open(map, markerC);
          });
          map.setCenter(pos);
        },
        () => {
          handleLocationError(true, infoWindow, map.getCenter());
        }
      );
    } else {
      // Browser doesn't support Geolocation
      handleLocationError(false, infoWindow, map.getCenter());
    }
  });
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
  infoWindow.setPosition(pos);
  infoWindow.setContent(
    browserHasGeolocation
      ? "Error: The Geolocation service failed."
      : "Error: Your browser doesn't support geolocation."
  );
  infoWindow.open(map);
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  var R = 3958.8;
  var rlat1 = lat1 * (Math.PI/180);
  var rlat2 = lat2 * (Math.PI/180);
  var difflat = rlat2-rlat1;
  var difflon = (lng2-lng1) * (Math.PI/180);

  var d = 2 * R * Math.asin(Math.sqrt(Math.sin(difflat/2)*Math.sin(difflat/2)+Math.cos(rlat1)*Math.cos(rlat2)*Math.sin(difflon/2)*Math.sin(difflon/2)));
  return d;
}

(function ($) {
    let requestConfig = {
        method: "GET",
        url: '/restaurants/' + $('#rId').val() + "/map",
        data: {ajaxid: "1"}
    }
    $.ajax(requestConfig).then(function (res) {
        if (res) {
          if (res.nearByRestaurants && Array.isArray(res.nearByRestaurants)) {
            for (let restaurant of res.nearByRestaurants) {
                let requestConfig2 = {
                    method: "GET",
                    url: '/restaurants/' + restaurant + "/map",
                    data: {ajaxid: "1"}
                }
                $.ajax(requestConfig2).then(function (res2){
                    if (res2) {
                        let position = {};
                        position.lat = res2.location.latitude;
                        position.lng = res2.location.longitude;
                        
                        let mark = new google.maps.Marker({
                            position: position,
                            map,
                            title: res2.name
                        });

                        let distance = calculateDistance(res.location.latitude, res.location.longitude, res2.location.latitude, res2.location.longitude);
                        distance = distance.toFixed(2);
                        console.log(distance);

                        const str = 
                            `<h2><a href="/restaurants/${res2._id}">${res2.name}</a></h2>` + 
                            `<p>${res2.location.address}</p>` + 
                            `<p>Distance to current restaurant: ${distance} miles</p>`;
                        // content can be modified to add more stuff
                        const info = new google.maps.InfoWindow({
                            content: str
                        });
                    
                        mark.addListener("click", () => {
                            info.open(map, mark);
                        });
                    } else {
                        console.log("Failed to get restaurant");
                    }
                });
            }
          }
        } else {
            console.log("Failed to get restaurant");
        }
    });

})(window.jQuery);
