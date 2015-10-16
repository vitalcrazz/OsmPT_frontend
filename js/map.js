var RouteInfo = Backbone.Model.extend();
var RefInfo = Backbone.Model.extend();
var PlaceInfo = Backbone.Model.extend();

var Routes = Backbone.Collection.extend({
	'model': RouteInfo,
	'url': 'route'
});

var Refs = Backbone.Collection.extend({
	'model': RefInfo,
	'url': function() {
		return "place/"+this.place+"/type/"+this.type+"/ref";
	},
	'place': 0,
	'type': ''
});

var Places = Backbone.Collection.extend({
	'model': PlaceInfo,
	'url': 'place'
});

var routeCollection = new Routes();
var refCollection = new Refs();
var placesCollection = new Places();

var Router = Backbone.Router.extend({
	routes: {
		"map/:zoom/:lat/:lon(/layer/:layer)(/overlays/:overlays)(/feature/:feature)": "reload",
		"route/:route": "load_route",
		"ref/:ref/type/:type/place/:place": "load_directions",
		"place/:place": "load_place",
	},
	reload: function(zoom, lat, lon, layer, overlays, feature) {
		mapData.set({
			'position': L.latLng(lat, lon),
			'zoom': zoom
		});
		if(layer) {
			mapData.set('baseLayer', layer);
		}
		if(overlays) {
			mapData.set('overlayIds', overlays);
		}
		if(feature) {
			mapData.set('feature', feature);
		}
	},
	load_route: function(route) {
		mapData.set({
			'RouteID': route,
			'PlaceID': 0,
			'RouteRef': ''
		});
		
		routeCollection.pop();
		refCollection.pop();
		
		var routeInfo = new RouteInfo({'id': route});
		routeCollection.add(routeInfo);		
		var routeView = new RouteView({'model': routeInfo, 'appdata': mapData});
		routeInfo.fetch();
	},
	load_place: function(place) {
		routeCollection.pop();
		refCollection.pop();
		
		var placeModel = placesCollection.get(place);
		if(typeof placeModel === 'undefined') {
			var placeInfo = new PlaceInfo({'id': place});
			placesCollection.add(placeInfo);
			var placeView = new PlaceView({'model': placeInfo, 'appdata': mapData});
			placeInfo.fetch();
		}
		else {
			//var placeView = new PlaceView({'model': placeModel, 'appdata': mapData});
			placeModel.trigger('redraw');
		}
	
		mapData.set({
			'RouteID': '',
			'PlaceID': place,
			'RouteRef': ''
		});
	},
	load_directions: function(ref, type, place) {
		routeCollection.pop();
		refCollection.pop();
		
		refCollection.type = type;
		refCollection.place = place;
		var refInfo = new RefInfo({'id': ref});
		refCollection.add(refInfo);
		var refView = new RefView({'model': refInfo, 'appdata': mapData});
		refInfo.fetch();
		
		mapData.set({
			'RouteID': '',
			'PlaceID': place,
			'RouteRef': ref,
			'RouteType': type
		});
	}
});

function bindLabel(feature, layer) {
	if (feature.properties.name !== '') {
		layer.bindLabel(feature.properties.name, {
			direction: 'auto'
		});
	}
}

function loadFeaturePopupData(feature, layer) {
	mapData.set('feature', feature.properties.id);
	
	var popupContent;
	$.ajax({
		type: "POST",
		url: "/ajax/get_detail_info.php",
		data: {
			id: feature.properties.id,
		},
		dataType: "text",
		async: false,
		success: function(data){
			var busRes = '';
			var trolleybusRes = '';
			var sharetaxiRes = '';
			var tramRes = '';
			var trainRes = '';
			if (data !== '') {
				routes = JSON.parse(data);
				for (var i = 0, length = routes.length; i < length; i++) {
					if (i in routes) {
						if (routes[i].from == null) {
							routes[i].from = 'Неизвестно';
						}
						if (routes[i].to == null) {
							routes[i].to = 'Неизвестно';
						}
						switch (routes[i].type) {
							case 'bus':
								busRes += '<a href="#" onclick="getRouteData('+routes[i].id+'); return false;">'+routes[i].ref+'</a> ('+routes[i].from+' ⇨ '+routes[i].to+')<br>';
								break;
							case 'trolleybus':
								trolleybusRes += '<a href="#" onclick="getRouteData('+routes[i].id+'); return false;">'+routes[i].ref+'</a> ('+routes[i].from+' ⇨ '+routes[i].to+')<br>';
								break;
							case 'share_taxi':
								sharetaxiRes += '<a href="#" onclick="getRouteData('+routes[i].id+'); return false;">'+routes[i].ref+'</a> ('+routes[i].from+' ⇨ '+routes[i].to+')<br>';
								break;
							case 'tram':
								tramRes += '<a href="#" onclick="getRouteData('+routes[i].id+'); return false;">'+routes[i].ref+'</a> ('+routes[i].from+' ⇨ '+routes[i].to+')<br>';
								break;
							case 'train':
								trainRes += '<a href="#" onclick="getRouteData('+routes[i].id+'); return false;">'+routes[i].ref+'</a> ('+routes[i].from+' ⇨ '+routes[i].to+')<br>';
								break;
						}
					}
				}
			}
			if (feature.properties) {
				switch (feature.properties.type) {
					case 'station':
						featureType = 'Станция';
						break;
					case 'platform':
						featureType = 'Остановка транспорта';
						break;
					case 'stop':
						featureType = 'Место остановки транспорта';
						break;
				}
				if (feature.properties.name == "") {
					feature.properties.name = "Без названия";
				}

				popupContent = "<span id='popup-title'>" + feature.properties.name + "</span>";
				popupContent += "<br>" + featureType + "<hr>";

				if (busRes !== '') {
					popupContent += '<b>Автобусы:</b><br>' + busRes;
				}
				if (trolleybusRes !== '') {
					popupContent += '<b>Троллейбусы:</b><br>' +trolleybusRes;
				}
				if (sharetaxiRes !== '') {
					popupContent += '<b>Маршрутные такси:</b><br>' +sharetaxiRes;
				}
				if (tramRes !== '') {
					popupContent += '<b>Трамваи:</b><br>' +tramRes;
				}
				if (trainRes !== '') {
					popupContent += '<b>Поезда:</b><br>' +trainRes;
				}
				if (feature.properties.description == '') {
					popupContent += feature.properties.description;
				}
			}

		}
	});
	var popupObj = layer.bindPopup(popupContent);
	popupObj.on("popupclose", function(e) {
		mapData.set('feature', 0);
	});
	layer.openPopup();
}

function SetList() {
	var list_id = document.getElementById('SelectList').selectedIndex;
	if (list_id == 0) {
		document.getElementById('platform-list').style.display = 'block';
		document.getElementById('stop-position-list').style.display = 'none';
	}
	if (list_id == 1) {
		document.getElementById('platform-list').style.display = 'none';
		document.getElementById('stop-position-list').style.display = 'block';
	}
}

var OSMAttr = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
	CCBYSAAttr = '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>';

var MapSurferAttr = OSMAttr+', ' + CCBYSAAttr + ', Rendering <a href="http://giscience.uni-hd.de/">GIScience Research Group @ Heidelberg University</a>',
	SputnikAttr = OSMAttr+', ' + CCBYSAAttr + ', Tiles <a href="http://www.sputnik.ru/">© Спутник</a>',
	MapnikAttr = OSMAttr+', ' + CCBYSAAttr,
	PTAttr = 'Маршруты © <a href="http://www.openmap.lt/">openmap.lt</a>';

var MapSurferUrl = 'http://129.206.74.245/tiles/roads/x={x}&y={y}&z={z}',
	SputnikUrl = 'http://tiles.maps.sputnik.ru/{z}/{x}/{y}.png',
	MapnikUrl = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
	PTUrl = 'http://pt.openmap.lt/{z}/{x}/{y}.png';

var MapSurferLayer   = L.tileLayer(MapSurferUrl, {attribution: MapSurferAttr, title: "MapSurfer"}),
	SputnikRuLayer  = L.tileLayer(SputnikUrl, {attribution: SputnikAttr, title: "sputnik.ru"}),
	MapnikLayer  = L.tileLayer(MapnikUrl, {attribution: MapnikAttr, title: "Mapnik"}),
	PTLayer = L.tileLayer(PTUrl, {attribution: PTAttr, title: "Слой маршрутов"});
/*
var platformsGeoJsonTileLayer = new L.TileLayer.GeoJSON('/platform/{z}/{x}/{y}.geojson', {
		clipTiles: false,
		unique: function (feature) {
			return feature.properties.id;
		},
		minZoom: 14,
		title: "Остановки / платформы"
	}, {
		style: {
			"color": "#1E90FF",
			"weight": 2,
			"opacity": 1
		},
		pointToLayer: function (feature, latlng) {
			var cMarker = L.circleMarker(latlng, {
				radius: 6,
				fillColor: "#FFFFFF",
				color: "#000",
				weight: 1,
				opacity: 1,
				fillOpacity: 1
			});
			
			if(feature.properties.id == mapData.get('feature')) {
				cMarker.on('add', function() {
					loadFeaturePopupData(feature, cMarker);
				});
			}
			
			return cMarker;
		},
		onEachFeature: function (feature, layer) {
			bindLabel(feature, layer);
			layer.on('click', function() {
				loadFeaturePopupData(feature, layer);
			});
		}
	}
);

var stationsGeoJsonTileLayer = new L.TileLayer.GeoJSON('/station/{z}/{x}/{y}.geojson', {
		clipTiles: false,
		unique: function (feature) {
			return feature.properties.id;
		},
		minZoom: 14,
		title: "Станции"
	}, {
		style: {
			"color": "#008000",
			"weight": 3,
			"opacity": 1
		},
		pointToLayer: function (feature, latlng) {
			var cMarker = L.circleMarker(latlng, {
				radius: 8,
				fillColor: "#FFFFFF",
				color: "#000",
				weight: 1,
				opacity: 1,
				fillOpacity: 1
			});
			return cMarker;
		},
		onEachFeature: function (feature, layer) {
			bindLabel(feature, layer);
			layer.on('click', function() {
				loadFeaturePopupData(feature, layer);
			});
		}
	}
);

var stopsGeoJsonTileLayer = new L.TileLayer.GeoJSON('/stop_pos/{z}/{x}/{y}.geojson', {
		clipTiles: false,
		unique: function (feature) {
			return feature.properties.id;
		},
		minZoom: 14,
		title: "Места остановок"
	}, {
		style: {
			"color": "#FFFFFF",
			"weight": 1,
			"opacity": 1
		},
		pointToLayer: function (feature, latlng) {
			var cMarker = L.circleMarker(latlng, {
				radius: 6,
				fillColor: "#1E90FF",
				color: "#000",
				weight: 2,
				opacity: 1,
				fillOpacity: 1
			});

			bindLabel(feature, cMarker);
			cMarker.on('click', function() {
				loadFeaturePopupData(feature, cMarker);
			});
			cMarker.on('add', function() {
				cMarker.bringToBack();
			});
			return cMarker;
		}
	}
);
*/
var mapData = new MapData({
	'map': map,
	'baseLayers': {
		'K': SputnikRuLayer,
		'S': MapSurferLayer,
		'M': MapnikLayer
	},
	'overlays': {
		'T': PTLayer //,
		//'N': stationsGeoJsonTileLayer,
		//'P': platformsGeoJsonTileLayer,
		//'S': stopsGeoJsonTileLayer
	}
});

var router = new Router();
var mapView = new MapView({'model': mapData, 'router': router});

if(!Backbone.history.start()) {
	mapData.trigger('change:position');
}