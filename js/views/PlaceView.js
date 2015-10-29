var PlaceView = Backbone.View.extend({
	el: '#left_panel_content',
	initialize: function(options) {
		this.AppData = options.appdata;
		
		this.Layers = new Array();
		this.RouteLayer = new L.FeatureGroup();
		this.RefCols = new Array();
		
		this.listenTo(this.model, "change", this.place_reload);
		this.listenTo(this.model, "redraw", this.place_redraw);
		this.listenTo(this.model, "erase", this.place_erase);
	},
	place_redraw: function() {
		$('#left_panel_content').show();
		this.showPlaceRoutes();
	},
	place_erase: function() {
		_.each(this.model.get('properties').buses, function(route) {
			route.visible = false;
		});
		
		this.buildAllRoutes();
	},
	place_reload: function() {
		var ind = 0;
		var view = this;
		_.each(this.model.get('properties').buses, function(route) {
			route.color = randomColor({luminosity: 'dark'});
			route.visible = false;
			view.RefCols['bus' + route.Ref] = route;
		});
		_.each(this.model.get('properties').trolleybuses, function(route) {
			route.color = randomColor({luminosity: 'dark'});
			route.visible = false;
			view.RefCols['trolleybus' + route.Ref] = route;
		});
		
		this.place_redraw();
	},
	showPlaceRoutes: function() {
		var template = _.template($('#route_list_template').html());
		this.$el.html(template(this.model.attributes));

		if(this.model.get('properties').geometry !== null) {
			var place_geom = L.geoJson(this.model.get('properties').geometry);
			var map = this.AppData.get('map');
			map.fitBounds(place_geom.getBounds());
		}
		
		var view = this;
		_.each(this.model.get('properties').buses, function(route) {
			var iden = "#" + 'bus' + route.Ref;
			$(iden).click(function() {
				route.visible = ! route.visible;
				if(route.visible) {
					$(iden).css('background', route.color);
				}
				else {
					$(iden).css('background', 'rgba(158,158,158,.2)');
				}
				view.buildAllRoutes();
			});
		});
		_.each(this.model.get('properties').trolleybuses, function(route) {
			var iden = "#" + 'trolleybus' + route.Ref;
			$(iden).click(function() {
				route.visible = ! route.visible;
				if(route.visible) {
					$(iden).css('background', route.color);
				}
				else {
					$(iden).css('background', 'rgba(158,158,158,.2)');
				}
				view.buildAllRoutes();
			});
		});
		
		this.buildAllRoutes();
	},
	buildRoute: function(tr_type) {
		this.RouteLayer.clearLayers();
		
		var map = this.AppData.get('map');
		var routeLayer = this.RouteLayer;
		
		var tr_arr = this.model.get('transport')[tr_type].routes;
		_.each(tr_arr, function(tr_el) {
			if(tr_el.visible) {
				L.geoJson(tr_el.route, {
					style: {
						"color": tr_el.color,
						"weight": 8,
						"opacity": 0.4
					},
					onEachFeature: function (feature, layer) {
						//
					}
				}).addTo(routeLayer);
			}
		});
		
		map.addLayer(this.RouteLayer);
	},
	buildAllRoutes: function() {
        var map = this.AppData.get('map');
		var zm = map.getZoom();
		var lineWeight = 4;
		if(zm > 13 && zm < 16) {
			lineWeight = 6;
		}
		else if(zm > 15) {
			lineWeight = 8;
		}
		
		console.log(lineWeight);
        //var lineColors = ['red', '#08f', '#0c0', '#f80'];
		
		if(this.Layers.length > 2) {
			for(var i = 0; i < 3; i++) {
				var _lay = this.Layers.pop();
				_lay.clearLayers();
			}
		}
		
        var outlines = L.layerGroup();
        var lineBg = L.layerGroup();
        var busLines = L.layerGroup();

		var view = this;
		var linesOnSegment, segmentCoords, segmentWidth;
		
		var tr_arr = this.model.get('properties');
		var tr_arr_lines = this.model.get('features');
		_.each(tr_arr_lines, function(lineSegment) {
			
			var linesOnSegmentcount = 0;//linesOnSegment.length;
			var visible = false;
			linesOnSegment = lineSegment.properties.refs;
			_.each(linesOnSegment, function(el) {
				_.each(tr_arr.buses, function(route) {
					if(route.Ref == el && route.visible) {
						visible = true;
						linesOnSegmentcount++;
					}
				});
				
				_.each(tr_arr.trolleybuses, function(route) {
					if(route.Ref == el && route.visible) {
						visible = true;
						linesOnSegmentcount++;
					}
				});
			});
			
			segmentWidth = linesOnSegmentcount * (lineWeight + 1);
			
			if(visible) {
				/*
				if(linesOnSegmentcount > 4)
				{
					var lineWeightCommon = lineWeight * 1.5;
					segmentWidth = 1 * (lineWeightCommon + 1);
					segmentCoords = L.GeoJSON.coordsToLatLngs(lineSegment.geometry.coordinates, 0);

					L.polyline(segmentCoords, {
					  color: '#000',
					  weight: segmentWidth + 5,
					  opacity: 1
					}).addTo(outlines);

					L.polyline(segmentCoords, {
					  color: '#fff',
					  weight: segmentWidth + 3,
					  opacity: 1
					}).addTo(lineBg);

					L.polyline(segmentCoords, {
						color: "#000000",
						weight: lineWeightCommon,
						opacity: 1,
						offset: ((lineWeightCommon + 1) / 2) - (segmentWidth / 2)
					}).addTo(busLines);
				}
				else */
				if(lineSegment.geometry.type == "LineString") {
					segmentCoords = L.GeoJSON.coordsToLatLngs(lineSegment.geometry.coordinates, 0);

					L.polyline(segmentCoords, {
					  color: '#000',
					  weight: segmentWidth + 5,
					  opacity: 1
					}).addTo(outlines);

					L.polyline(segmentCoords, {
					  color: '#fff',
					  weight: segmentWidth + 3,
					  opacity: 1
					}).addTo(lineBg);

					var j=0;
					_.each(linesOnSegment, function(el) {
						var tr_type = ('bus' + el) in view.RefCols ? 'bus' : 'trolleybus';
						if((tr_type + el) in view.RefCols && view.RefCols[tr_type + el].visible){
							L.polyline(segmentCoords, {
								color: view.RefCols[tr_type + el].color,
								weight: lineWeight,
								opacity: 1,
								offset: j * (lineWeight + 1) - (segmentWidth / 2) + ((lineWeight + 1) / 2)
							}).addTo(busLines);
							j++;
						}
					});
				}
				else {
					_.each(lineSegment.geometry.coordinates, function(multiSegment) {
						segmentCoords = L.GeoJSON.coordsToLatLngs(multiSegment, 0);

						L.polyline(segmentCoords, {
						  color: '#000',
						  weight: segmentWidth + 5,
						  opacity: 1
						}).addTo(outlines);

						L.polyline(segmentCoords, {
						  color: '#fff',
						  weight: segmentWidth + 3,
						  opacity: 1
						}).addTo(lineBg);

						var j=0;
						_.each(linesOnSegment, function(el) {
							var tr_type = ('bus' + el) in view.RefCols ? 'bus' : 'trolleybus';
							if((tr_type + el) in view.RefCols &&view.RefCols[tr_type + el].visible){
								L.polyline(segmentCoords, {
									color: view.RefCols[tr_type + el].color,
									weight: lineWeight,
									opacity: 1,
									offset: j * (lineWeight + 1) - (segmentWidth / 2) + ((lineWeight + 1) / 2)
								}).addTo(busLines);
								j++;
							}
						});
					});
				}
			}
        });

        outlines.addTo(map);
        lineBg.addTo(map);
        busLines.addTo(map);
		
		this.Layers.push(outlines);
		this.Layers.push(lineBg);
		this.Layers.push(busLines);
	}
});