var RefView = Backbone.View.extend({
	el: '#left_panel_content',
	initialize: function(options) {
		this.AppData = options.appdata;
		
		this.RouteLayer = new L.FeatureGroup();
		
		this.listenTo(this.model, "change", this.routeRefChanged);
		this.listenTo(this.model, "remove", this.route_remove);
	},
	routeRefChanged: function() {
		$('#left_panel').show();
		
		this.buildRoute();
		this.showRouteInfo();
	},
	route_remove: function() {
		this.RouteLayer.clearLayers();
		//this.remove();
	},
	showRouteInfo: function() {	
		var template = _.template($('#route_directions_template').html());
		this.$el.html(template(this.model.attributes));
		var view = this;
		
		var mapBounds = new L.LatLngBounds();
		var geojsonlayers = this.RouteLayer._layers;
		_.each(geojsonlayers, function(item) {
			var feature_id = _.values(item._layers)[0].feature.properties.id;
			var sel = "#route_link_" + feature_id;
			
			$(sel).hover(function() {
				_.each(geojsonlayers, function(el) {
					el.setStyle({
						"weight": 8,
						"opacity": 0.3
					});
					var el_feature_id = _.values(el._layers)[0].feature.properties.id;
					$("#route_link_" + el_feature_id).css('background', '#FFFFFF');
				});
				item.setStyle({
					"weight": 8,
					"opacity": 0.8
				});
				$(sel).css('background', 'linear-gradient(90deg, #1E90FF 5%, #EEEEEE 5%)');
			});
			
			mapBounds = view.mergeBounds(mapBounds, item.getBounds());
		});
		
		this.AppData.get('map').fitBounds(mapBounds);
	},
	buildRoute: function() {
		var map = this.AppData.get('map');
		var routeLayer = this.RouteLayer;
		
		_.each(this.model.get('routes'), function(route) {
			L.geoJson(route, {
				style: {
					"color": "#1E90FF",
					"weight": 8,
					"opacity": 0.5
				},
				onEachFeature: function (feature, layer) {
					//
				}
			}).addTo(routeLayer);
		});
		
		map.addLayer(this.RouteLayer);
	},
	mergeBounds: function(bounds1, bounds2) {
		if(typeof bounds1._southWest === 'undefined' || typeof bounds1._northEast === 'undefined') {
			return bounds2;
		}		
		var southWest = new L.latLng(
			Math.min(bounds1._southWest.lat, bounds2._southWest.lat),
			Math.min(bounds1._southWest.lng, bounds2._southWest.lng)
		);
		var northEast = new L.latLng(
			Math.max(bounds1._northEast.lat, bounds2._northEast.lat),
			Math.max(bounds1._northEast.lng, bounds2._northEast.lng)
		);
		return new L.latLngBounds(southWest, northEast);
	}
});