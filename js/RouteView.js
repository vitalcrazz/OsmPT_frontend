var RouteView = Backbone.View.extend({
	initialize: function(options) {
		this.AppData = options.appdata;
		
		this.RouteLayer = new L.FeatureGroup();
		this.RoutePlatformLayer = new L.FeatureGroup();
		this.RouteStopLayer = new L.FeatureGroup();

		this.listenTo(this.model, "change", this.route_changed);
		this.listenTo(this.model, "remove", this.route_remove);
	},
	route_remove: function() {
		this.clearRouteLayer();
		this.remove();
	},
	route_changed: function() {
		this.removeOverlays();
		$("#platform-list").empty();
		$("#stop-position-list").empty();

		this.buildRoute();
	},
	clearRouteLayer: function() {
		this.RouteLayer.clearLayers();
		this.RoutePlatformLayer.clearLayers();
		this.RouteStopLayer.clearLayers();
	},
	removeOverlays: function() {
		var map = this.AppData.get('map');
		_.each(this.AppData.get('overlays'), function(item) {
			if (map.hasLayer(item)) {
				map.removeLayer(item);
			}
		});
	},
	buildRoute: function() {
		var map = this.AppData.get('map');
		var view = this;
		
		if (typeof this.model.get('geojsonRoute') !== "undefined") {
			L.geoJson(this.model.get('geojsonRoute'), {
				style: {
					"color": "#1E90FF",
					"weight": 6,
					"opacity": 0.6
				},
				onEachFeature: function (feature, layer) {
					view.bindRoutePopup(feature, layer);
					view.createRouteInfo(feature);
				}
			}).addTo(this.RouteLayer);
		}
		if (typeof this.model.get('geojsonStops') !== "undefined") {
			L.geoJson(this.model.get('geojsonStops'), {
				style: {
					"color": "#FFFFFF",
					"weight": 1,
					"opacity": 1
				},
				pointToLayer: function (feature, latlng) {
					return L.circleMarker(latlng, {
						radius: 6,
						fillColor: "#1E90FF",
						color: "#000",
						weight: 2,
						opacity: 1,
						fillOpacity: 1
					});
				},
				onEachFeature: function (feature, layer) {
					bindLabel(feature, layer);
					layer.on('click', function() {
						loadFeaturePopupData(feature, layer);
					});
					view.createListElements(feature, layer);
				}
			}).addTo(this.RouteStopLayer);
		}
		if (typeof this.model.get('geojsonPlatforms') !== "undefined") {
			L.geoJson(this.model.get('geojsonPlatforms'), {
				style: {
					"color": "#1E90FF",
					"weight": 2,
					"opacity": 1
				},
				pointToLayer: function (feature, latlng) {
					return L.circleMarker(latlng, {
						radius: 6,
						fillColor: "#FFFFFF",
						color: "#000",
						weight: 1,
						opacity: 1,
						fillOpacity: 1
					});
				},
				onEachFeature: function (feature, layer) {
					bindLabel(feature, layer)
					layer.on('click', function() {
						loadFeaturePopupData(feature, layer);
					});
					view.createListElements(feature, layer);
				}
			}).addTo(this.RoutePlatformLayer);
		}

		map.addLayer(this.RouteLayer);
		map.addLayer(this.RouteStopLayer);
		map.addLayer(this.RoutePlatformLayer);

		if (document.getElementById('stop-position-list').childNodes.length > document.getElementById('platform-list').childNodes.length) {
			document.getElementById("SelectList").options[1].selected=true;
			document.getElementById('platform-list').style.display = 'none';
			document.getElementById('stop-position-list').style.display = 'block';
		}
		$('#left_panel').show();
		map.invalidateSize();
		map.fitBounds(this.RouteLayer.getBounds());
	},
	createListElements: function(feature, layer) {
		if (feature.properties) {
			if (feature.properties.name == "") {
				feature.properties.name = "Без названия";
			}

			if (feature.properties.type == 'platform') {
				var item = document.getElementById('platform-list').appendChild(document.createElement('li'));
				item.innerHTML = feature.properties.name;
				if (feature.geometry.type=='Point') {
					item.onmouseover = function() {
						layer.showLabel();
					};
					item.onmouseout = function() {
						layer.hideLabel();
					};
				}
				item.onclick = function() {
					loadFeaturePopupData(feature, layer);
				};
			}
			if (feature.properties.type == 'stop') {
				var item = document.getElementById('stop-position-list').appendChild(document.createElement('li'));
				item.innerHTML = feature.properties.name;
				if (feature.geometry.type=='Point') {
					item.onmouseover = function() {
						layer.showLabel();
					};
					item.onmouseout = function() {
						layer.hideLabel();
					};
				}
				item.onclick = function() {
					loadFeaturePopupData(feature, layer);
				};
			}
		}
	},
	bindRoutePopup: function(feature, layer) {
		var popupContent;
		if (feature.properties) {
			with (feature.properties) {
				if ((from !== '') & (to !== '')) {
					var from_to = ": " + from + " ⇨ " + to;
				} else {
					from_to = '';
				}
				popupContent = "<b>" + type + " " + ref + from_to + "</b><hr>";
				popupContent += "Протяженность маршрута: " + length + " км.";
			}
			layer.bindPopup(popupContent);
		}
	},
	createRouteInfo: function(feature) {
		var template = _.template($('#route_info_template').html());
		$('#left_panel_content').html(template({
			'type' : feature.properties.type,
			'type_name' : feature.properties.type_name,
			'ref': feature.properties.ref,
			'length': feature.properties.length,
			'place_id': feature.properties.place_id
		}));
	}
});