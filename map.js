// This will let you use the .remove() function later on
  if (!('remove' in Element.prototype)) {
    Element.prototype.remove = function() {
      if (this.parentNode) {
          this.parentNode.removeChild(this);
      }
    };
  }

  mapboxgl.accessToken = 'pk.eyJ1IjoiYzEzc2xhbSIsImEiOiJjaWh2MjBjenEwMXdndHNraGgxYnFrMXVyIn0.EnDtV7OFvEYku7--ecPDJg';

  // This adds the map
  var map = new mapboxgl.Map({
    // container id specified in the HTML
    container: 'map',
    // style URL
    style: 'mapbox://styles/c13slam/ck4nbngoa1bm81clep5ebr8x3',
    // initial position in [long, lat] format
    center: [-100.034084142948, 41.909671288923],
    // initial zoom
    zoom: 5,
    scrollZoom: true
  });
  map.addControl(new mapboxgl.NavigationControl({showCompass: false}));
  
  map.addControl(
    new mapboxgl.GeolocateControl({
    positionOptions: {
    enableHighAccuracy: true
    },
    trackUserLocation: true
    }).on('geolocate', (e)=>{
      map.flyTo({
        center: [e.coords.longitude, e.coords.latitude],
        zoom: 11
      });
    })
  );

  var feat=[];
  var timer; //variable used to store setTimeout() and then resetting it
  var delay=0;
  map.on('load', function (e) {
    map.addLayer({
        "id": "attribution-layer",
        "type": "circle",
        "source": {
            "type": "geojson",
            "data": {
                "type": "Feature",
                "properties": {},
                "geometry": null
            }
        }
    });
    map.style.sourceCaches['attribution-layer']._source.attribution = "Map by: rodrigomd94@gmail.com";
    Papa.parse("https://docs.google.com/spreadsheets/d/e/2PACX-1vRrZnllTiVGWFmzzvEXLxAt5boQZZh3krmLbwkTwYT6rmVB_b6ntjmaiI6E2RmsVgzMUFLYbAv5GTaA/pub?output=csv", 
      {download: true,
      header: true,
      complete: function(results) {
              var data = results;
              var names=[];
              for(feature of data.data){
                var company = feature.company;
                names.push(company);
              };
              createMap(data.data, names);
          }
      });
  });
function createMap(data, names){
    //save string of features for geojson
    for (i=0; i<data.length; i++){
        feat.push({type: 'Feature', properties: data[i], geometry: { type: 'Point', coordinates: [data[i].lon, data[i].lat]}});
    };
    var geojson = {
    type: 'FeatureCollection',
    features: feat
    };

    // This adds the data to the map
        var lats = [];
        var longs = [];
        
        /* map.addSource('breweries', {
            'type': 'geojson',
            'data': geojson
        }); */
        map.addLayer({
            'id': 'breweries_layer',
            'type': 'circle',
            'source': {
                'type': 'geojson',
                'data': geojson
            },
            'paint':{
              'circle-radius': 4.5,
              'circle-color': '#8d8741',
              'circle-stroke-width':0.3
              
            },
            "icon-allow-overlap": true
            
        });

        map.addLayer({
        'id': 'breweries_labels',
        'type': 'symbol',
        'source': {
                'type': 'geojson',
                'data': geojson
            },
          'layout': {
          'text-field': ['get', 'company'],
          'text-variable-anchor': ['bottom', 'top'],
          'text-radial-offset': 0,
          'text-justify': 'auto',
          'text-size': 11,          
          },
          'paint':{
            'text-color':'#8a8888',
            'text-halo-width':0.4,
            'text-halo-color': '#8a0123'
          }
        });
        map.setLayoutProperty('breweries_labels', 'visibility', 'none');
        buildLocationList(geojson.features.sort(compareValues('company')));

        var options = {
          keys:['properties.company'],
          threshold: 0.0,
          location: 0,
          distance: 0
          }
          var fuse = new Fuse(geojson.features, options);
  //-----------function called when click search button

        $("#search").autocomplete({
          source: names,
          autoFocus: true,
          minLength: 2,
          delay: 500
        });
        $("#search").on("autocompleteselect", searchComplete);

  ///-------function called when zomming or panning      
        map.on('moveend', function() {


      //------------------show or hide labels based on zoom
            if (map.getZoom()>12){
                map.setLayoutProperty('breweries_labels', 'visibility', 'visible');
            }else{
              map.setLayoutProperty('breweries_labels', 'visibility', 'none');
            } 
            var features = getPointsInView(geojson.features);
            
            if (features) {
            // Populate features for the listing overlay.
            buildLocationList(features.sort(compareValues('company')));
            }
        });

        function searchComplete(e, ui){
          search_result = fuse.search(ui.item.value)[0];
          console.log(fuse.search(ui.item.value));
              map.flyTo({
                center: search_result.geometry.coordinates,
                zoom: 13
              });
        };
   
}
    map.on('mouseenter', 'breweries_layer', () => {
        map.getCanvas().style.cursor = 'pointer'
    });
    map.on('mouseleave', 'breweries_layer', () => {
     map.getCanvas().style.cursor = ''
    });

  map.on('click', 'breweries_layer', function(e){
        // 1. Fly to the point
        flyToStore(e.features[0]);

        // 2. Close all other popups and display popup for clicked store
        createPopUp(e.features[0]);

        // 3. Highlight listing in sidebar (and remove highlight for all other listings)
        var activeItem = document.getElementsByClassName('active');

        //e.stopPropagation();
        if (activeItem[0]) {
           activeItem[0].classList.remove('active');
        }

        var listing = document.getElementById('listing-' + i);
        listing.classList.add('active');
  });

  function flyToStore(currentFeature) {
    map.flyTo({
        center: currentFeature.geometry.coordinates,
        zoom: 13
      });
  }

  function createPopUp(currentFeature) {
    var popUps = document.getElementsByClassName('mapboxgl-popup');
    if (popUps[0]) popUps[0].remove();
    
    if (currentFeature.properties.website !="" && currentFeature.properties.website != null){
        website = '<h4><a href="https://'+currentFeature.properties.website+'" target="_blank">Website</a></h4>';
    }else{
        website = '';
    }

    var popup = new mapboxgl.Popup({closeOnClick: true})
          .setLngLat(currentFeature.geometry.coordinates)
          .setHTML('<h3>'+currentFeature.properties.company+'</h3>' +
            '<h4>' + currentFeature.properties.address+', '+currentFeature.properties.city+ ', '+ currentFeature.properties.state+ ", "+ currentFeature.properties.zip_code + '</h4>'+
            website)
          .addTo(map);
  }
    

//function to get points inside the field of view
function getPointsInView(data){
    viewBounds = map.getBounds();
    let features_in_bounds=[];
    for (i=0; i<data.length; i++){
        if (data[i].geometry.coordinates[0]>viewBounds._sw.lng && data[i].geometry.coordinates[1]>viewBounds._sw.lat && data[i].geometry.coordinates[0]<viewBounds._ne.lng && data[i].geometry.coordinates[1]<viewBounds._ne.lat){
            features_in_bounds.push(data[i]);
        }
    }
    return features_in_bounds;
}
  //function to sort list alphabetically
function compareValues(key, order = 'asc') {
    return function innerSort(a, b) {
        if (!a.properties.hasOwnProperty(key) || !b.properties.hasOwnProperty(key)) {
        // property doesn't exist on either object
        return 0;
        }

        const varA = (typeof a.properties[key] === 'string')
        ? a.properties[key].toUpperCase() : a.properties[key];
        const varB = (typeof b[key] === 'string')
        ? b.properties[key].toUpperCase() : b.properties[key];

        let comparison = 0;
        if (varA > varB) {
        comparison = 1;
        } else if (varA < varB) {
        comparison = -1;
        }
        return (
        (order === 'desc') ? (comparison * -1) : comparison
        );
    };
}

  function buildLocationList(features) {
    
    clearTimeout(timer);
      timer = setTimeout(()=>{
        delay= 1850;

       /*  if (document.getElementById('search').value != ''){
        features = fuse.search(document.getElementById('search').value).sort(compareValues('company'));
        } */

        var listings = document.getElementById('listings');
        listings.innerHTML='';
        for (i = 0; i < features.length; i++) {
        var currentFeature = features[i];
        var prop = currentFeature.properties;

        
        var listing = listings.appendChild(document.createElement('div'));
        listing.className = 'item';
        listing.id = "listing-" + i;

        var link = listing.appendChild(document.createElement('a'));
        link.href = '#';
        link.className = 'title';
        link.dataPosition = i;
        link.innerHTML = prop.company;

        if(prop.website != '' && prop.website !=null){
            var site = '</br><a href="https://'+currentFeature.properties.website+'" target="_blank">Website</a>'
        }else{
            var site = '';
        }

        var details = listing.appendChild(document.createElement('div'));
        details.innerHTML = prop.address+', '+prop.city+ ', '+ prop.state+ ", "+ prop.zip_code+site;
        
        
        link.addEventListener('click', function(e){
            // Update the currentFeature to the store associated with the clicked link
            var clickedListing = features[this.dataPosition];

            // 1. Fly to the point
            flyToStore(clickedListing);

            // 2. Close all other popups and display popup for clicked store
            createPopUp(clickedListing);

            // 3. Highlight listing in sidebar (and remove highlight for all other listings)
            var activeItem = document.getElementsByClassName('active');

            if (activeItem[0]) {
            activeItem[0].classList.remove('active');
            }
            this.parentNode.classList.add('active');

        });   
        }
    }, delay);
    };

    
