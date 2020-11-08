var closedBar = true;

function openNav() {
    if (closedBar == true) {
        document.getElementById("sidebar").style.width = "17.3%";
        document.getElementById("map").style.left = "17.3%";
        document.getElementById("map").style.width = "82.6%";
        closedBar = false;
    } else {
        document.getElementById("sidebar").style.width = "0";
        document.getElementById("map").style.width = "100vw";
        document.getElementById("map").style.left = "0";
        closedBar = true;
    }
    console.log('sidebar');
}

function closeNav() {
    document.getElementById("sidebar").style.width = "0";
    document.getElementById("map").style.width = "100vw";
    document.getElementById("map").style.left = "0";
    closedBar = true;
}


$(document).ready(function() {
    var trigger = $('.hamburger'),
        overlay = $('.overlay'),
        isClosed = false;

    trigger.click(function() {
        hamburger_cross();
    });

    function hamburger_cross() {

        if (isClosed == true) {
            overlay.hide();
            trigger.removeClass('is-open');
            trigger.addClass('is-closed');
            isClosed = false;
        } else {
            overlay.show();
            trigger.removeClass('is-closed');
            trigger.addClass('is-open');
            isClosed = true;
        }
    }

    $('[data-toggle="offcanvas"]').click(function() {
        $('#wrapper').toggleClass('toggled');
    });
});


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
    style: 'mapbox://styles/c13slam/ck4sv4p6b0sdb1cnnn5670vqk',
    // initial position in [long, lat] format
    center: [-100.034084142948, 41.909671288923],
    // initial zoom
    zoom: 2.5,
    scrollZoom: true
});
map.addControl(new mapboxgl.NavigationControl({ showCompass: false }));

map.addControl(
    new mapboxgl.GeolocateControl({
        positionOptions: {
            enableHighAccuracy: true
        },
        trackUserLocation: false
    }).on('geolocate', (e) => {
        map.flyTo({
            center: [e.coords.longitude, e.coords.latitude],
            zoom: 11
        });
    })
);

var feat = [];
var timer; //variable used to store setTimeout() and then resetting it
var delay = 0;
map.on('load', function(e) {
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
    //map.style.sourceCaches['attribution-layer']._source.attribution = "Map by: rodrigomd94@gmail.com";
    Papa.parse("./data/brewers_master_data.csv", {
        download: true,
        header: true,
        complete: function(results) {
            var data = results;
            var names = [];
            for (feature of data.data) {
                var company = feature.company;
                names.push(company);
            };
            createMap(data.data, names);
        }
    });
});

function createMap(data, names) {
    //save string of features for geojson
    for (i = 0; i < data.length; i++) {
        feat.push({ type: 'Feature', properties: data[i], geometry: { type: 'Point', coordinates: [data[i].lon, data[i].lat] } });
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


    map.addSource('breweries', {
        'type': 'geojson',
        'data': geojson,
        'buffer': 0,
        'cluster': true,
        clusterMaxZoom: 10, // Max zoom to cluster points on
        clusterRadius: 45 // Radius of each cluster when clustering points (defaults to 50)
    })

    map.addLayer({ //unclustered breweries
        'id': 'breweries_layer',
        'type': 'symbol',

        'source': 'breweries',
        'filter': ['!', ['has', 'point_count']],
        'minzoom': 3,
        'layout': {
            'icon-image': 'brewery-marker',
            'icon-size': 0.4,
            'icon-allow-overlap': true,
            'icon-anchor': 'bottom'
        }
    });

    map.addLayer({
        'id': 'clusters',
        'type': 'symbol',
        'source': 'breweries',
        'filter': ['has', 'point_count'],
        'layout': {
            'icon-image': 'brewery_cluster',
            'icon-size': [
                'step', ['get', 'point_count'],
                0.6,
                100,
                0.8,
                750,
                1
            ],
            'icon-allow-overlap': true,
            'icon-anchor': 'center'
        }
    });

    map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'breweries',
        filter: ['has', 'point_count'],
        layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 15
        },
        paint: {
            'text-color': 'black',
            'text-halo-width': 0,
            'text-halo-color': 'black'
        }
    });

    map.addLayer({
        'id': 'labels',
        'type': 'symbol',
        'source': 'breweries',
        // 'minzoom': 6,
        'layout': {
            'text-field': ['get', 'company'],
            'text-variable-anchor': ['top'],
            'text-radial-offset': 0.1,
            'text-justify': 'auto',
            'text-size': 12
        },
        'paint': {
            'text-color': '#f64c72',
            'text-halo-width': 0.03,
            'text-halo-color': 'black'
        }
    });
    var visible_features = geojson.features;

    buildLocationList(visible_features);

    var options = {
        keys: ['properties.company'],
        threshold: 0.0,
        location: 0,
        distance: 0
    }
    var fuse = new Fuse(geojson.features, options);
    //-----------function called when click search button
    $("#search").on('click', function(e) {
        $(this).addClass("hidden");
        $(this).closest($(".container-fluid")).find($("#titleBarNav")).addClass("hidden");
        $("#searchForm").removeClass("hidden");
        //$("$searchForm").addClass("animate");
        $("#searchForm input").focus();
    });

    $("#searchForm input").focusout(function(e) {
        $("#search").removeClass("hidden");
        $("#titleBarNav").removeClass("hidden");
        $("#searchForm").addClass("hidden");
    });
    $("#search").autocomplete({
        source: names,
        autoFocus: true,
        minLength: 1,
        delay: 500
    });
    $("#search").on("autocompleteselect", searchComplete);

    ///-------function called when zomming or panning      
    map.on('moveend', function() {
        visible_features = getPointsInView(geojson.features);

        if (visible_features) {
            // Populate features for the listing overlay.
            buildLocationList(visible_features);
        }
    });

    function searchComplete(e, ui) {
        search_result = fuse.search(ui.item.value)[0];
        map.flyTo({
            center: search_result.geometry.coordinates,
            zoom: 13
        });
    };

    // ----------------------------- functions to build location list -------------
    //-----------------------------------------------------------------------------
    var last_loaded = 0;

    function buildLocationList(features) { //--------this function is called whenever the user pans or zooms. Resets sidebar listings and creates new ones based on visible points
        features = features.sort(compareValues('company'));
        clearTimeout(timer);
        timer = setTimeout(() => { //timer used to wait until user finishes panning or scrolling. Improves performance and smoothness
            delay = 1400;

            /*  if (document.getElementById('search').value != ''){
            features = fuse.search(document.getElementById('search').value).sort(compareValues('company'));
            } */

            var listings = document.getElementById('listings');
            listings.innerHTML = '';
            listings.scrollTo(0, 0); //puts scrollbar back on the top
            last_loaded = 0;

            loadMore(features);

        }, delay);
    };

    function loadMore(features) { //---this function loads more results on side bar when scrollbar hits bottom or when panning/zooming
        if (last_loaded < features.length) {
            var limit = ((last_loaded + 20) < features.length) ? (last_loaded + 20) : features.length;
            for (i = last_loaded; i < limit; i++) {
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

                if (prop.website != '' && prop.website != null) {
                    var site = '</br><a href="https://' + currentFeature.properties.website + '" target="_blank">Website</a>'
                } else {
                    var site = '';
                }

                var details = listing.appendChild(document.createElement('div'));
                details.className = 'details';
                details.innerHTML = prop.address + ', ' + prop.city + ', ' + prop.state + ", " + prop.zip_code + site;


                link.addEventListener('click', function(e) {
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
                last_loaded++;


            };
        };
        $(listings).scroll(function() { //event listener for when scrollbar hits bottom. Used to load more results
            if ((listings.scrollHeight - listings.scrollTop) - 1 < listings.clientHeight) {
                loadMore(visible_features);
            }
        });

    }

}

map.on('mouseenter', 'breweries_layer', () => {
    map.getCanvas().style.cursor = 'pointer'
});
map.on('mouseleave', 'breweries_layer', () => {
    map.getCanvas().style.cursor = ''
});

map.on('click', 'breweries_layer', function(e) {
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

    if (currentFeature.properties.website != "" && currentFeature.properties.website != null) {
        website = '<h4><a href="https://' + currentFeature.properties.website + '" target="_blank">Website</a></h4>';
    } else {
        website = '';
    }

    var popup = new mapboxgl.Popup({ closeOnClick: true })
        .setLngLat(currentFeature.geometry.coordinates)
        .setHTML('<h3>' + currentFeature.properties.company + '</h3>' +
            '<h4>' + currentFeature.properties.address + ', ' + currentFeature.properties.city + ', ' + currentFeature.properties.state + ", " + currentFeature.properties.zip_code + '</h4>' +
            website)
        .addTo(map);
}


//function to get points inside the field of view
function getPointsInView(data) {
    viewBounds = map.getBounds();
    let features_in_bounds = [];
    for (i = 0; i < data.length; i++) {
        if (data[i].geometry.coordinates[0] > viewBounds._sw.lng && data[i].geometry.coordinates[1] > viewBounds._sw.lat && data[i].geometry.coordinates[0] < viewBounds._ne.lng && data[i].geometry.coordinates[1] < viewBounds._ne.lat) {
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

        const varA = (typeof a.properties[key] === 'string') ?
            a.properties[key].toUpperCase() : a.properties[key];
        const varB = (typeof b[key] === 'string') ?
            b.properties[key].toUpperCase() : b.properties[key];

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