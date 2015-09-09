var MapData = Backbone.Model.extend({
	defaults: {
		'mapEl': 'map',
		'baseLayer': 'S',
		'overlayIds': 'P',
		'RouteID': '',
		'PlaceID': 0,
		'RouteRef': '',
		'RouteType': '',
		'minZoom': 14,
		'position': L.latLng(60.50, 107.50),
		'zoom': 3,
		'feature': 0
	},
	initialize: function() {
		var baseLayers = this.mapLayerArray(this.get('baseLayers'));
		var overlays = this.mapLayerArray(this.get('overlays'));
		
		this.set('map', L.map(this.get('mapEl'), {
			closePopupOnClick: false
		}));
		
		L.control.layers(baseLayers, overlays).addTo(this.get('map'));
		
		this.init_plugins();
		
		_.each(this.get('overlays'), function(element, index, array) {
			element.on('loading', function() {
				if (this.get('map').getZoom() >= this.get('minZoom')) {
					this.trigger('tilesLoading');
				}
			}, this);
			element.on('load', function() {
				if (this.get('map').getZoom() >= this.get('minZoom')) {
					var is_completed = _.reduce(array, function(prev, cur) {
						var tilesToLoad = cur._tilesToLoad || 0;
						return prev && (tilesToLoad < 1);
					}, true);
					if(is_completed)
						this.trigger('tilesLoaded');
				}
			}, this);
		}, this);
		
		this.get('map').on('baselayerchange', this.onBaselayerChange, this);
		this.get('map').on('moveend', this.onMoveEnd, this);
		this.get('map').on('zoomend', this.onZoomEnd, this);
		this.get('map').on('overlayadd', this.onOverlayChanged, this);
		this.get('map').on('overlayremove', this.onOverlayChanged, this);
	},
	// return layer array for leaflet
	mapLayerArray: function(layers) {
		return _.object(_.map(layers, function(val){
			return [val.options.title, val];
		}));
	},
	resetView: function() {
		var position = this.get('position');
		var zoom = this.get('zoom');
		
		this.get('map').setView(position, zoom);
	},
	removeBaseLayers: function() {
		var m = this.get('map');
		_.each(this.get('baseLayers'), function(item, index) {
			if(m.hasLayer(item)) m.removeLayer(item);
		}, this);
	},
	addBaselayer: function() {
		var m = this.get('map');
		var nBaseLayer = _.find(this.get('baseLayers'), function(item, index) {
			return (this.get('baseLayer') === index);
		}, this);
		m.addLayer(nBaseLayer);
	},
	init_plugins: function() {
		var map = this.get('map');
		
		L.control.scale().addTo(map);

		L.control.fullscreen({
			position: 'topleft',
			title: 'Full Screen',
			forceSeparateButton: true,
			forcePseudoFullscreen: false
		}).addTo(map);

		L.control.locate({
			icon: 'fa fa-map-marker',
			iconLoading: 'fa fa-spinner fa-spin',
			onLocationError: function(err) {alert(err.message)},
			onLocationOutsideMapBounds:  function(context) {
					alert(context.options.strings.outsideMapBoundsMsg);
			},
			strings: {
				title: "Show me where I am",
				popup: "Вы находитесь в пределах {distance} м. от этой точки",
				outsideMapBoundsMsg: "You seem located outside the boundaries of the map"
			}
		}).addTo(map);

		var topMessage = L.Control.extend({
			options: {
				position: 'topleft'
			},
			onAdd: function (map) {
				var container = L.DomUtil.create('div', 'top-message');
				container.id = 'top-message-box';
				return container;
			}
		});

		map.addControl(new topMessage());
	},
	onBaselayerChange: function() {
		var layerIndex = this.get('baseLayer');
		_.find(this.get('baseLayers'), function(item, index) {
			if(this.get('map').hasLayer(item)) {
				layerIndex = index;
				return true;
			}
		}, this);
		
		this.set({'baseLayer': layerIndex},{'silent':true});
		this.trigger('mapStateChanged');
	},
	onMoveEnd: function() {
		var mapPosition = this.get('map').getCenter()
		this.set({'position': mapPosition}, {'silent': true});
		
		this.trigger('mapStateChanged');
	},
	onZoomEnd: function() {
		var mapZoom = this.get('map').getZoom();
		this.set({'zoom': mapZoom}, {'silent': true});
		
		if (mapZoom < this.get('minZoom')) {
			if(!this.get('RouteID')) {
				this.trigger('zoomInvalid');
			}
		}
		else {
			this.trigger('zoomValid');
		}
	},
	onOverlayChanged: function() {
		var MapOverlays = '';
		var m = this.get('map');
		_.each(this.get('overlays'), function(item, index) {
			if(m.hasLayer(item)) MapOverlays += index;
		}, this);
		
		this.set({'overlayIds': MapOverlays}, {'silent': true});
		this.trigger('mapStateChanged');
	}
});