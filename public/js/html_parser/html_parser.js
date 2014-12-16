(function() {
	this.HtmlParser = function() {
		this.filters = [];
	}
	HtmlParser.prototype.add_filter = function(filter) {
		this.filters.push(filter);
	}
	HtmlParser.prototype.parse = function(text) {
		for( index in this.filters) {
			text = this.filters[index].apply(text);
		}
		return text;
	}

	this.YoutubeFilter = function(options) {
		this.options = $.extend({
	        'width': 420,
	        'height': 315,
	        'frameborder': 0,
	        'wmode': null,
	        'autoplay': 0,
	        'hide_related': 1
    	}, options);
	}
	YoutubeFilter.prototype.apply = function(text) {
		var regex = /(https?:\/\/)?(www.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/watch\?feature=player_embedded&v=)([A-Za-z0-9_-]*)(\&\S+)?(\?\S+)?/;
		var options = this.options;
		return text.replace(regex, function(match, protocole, subdomain, url,youtube_id) {
			width = options["width"];
			height = options["height"];
			frameborder = options["frameborder"];
			wmode = options["wmode"];
			autoplay = options["autoplay"];
			hide_related = options["hide_related"];
			src = "//www.youtube.com/embed/"+youtube_id;
			params = [];
			if (wmode) {
				params.push("wmode="+wmode);
			}
			if (autoplay){
				params.push("autoplay=1");
			}
			if (hide_related){
				params.push("rel=0");
			}
			if (params.length > 0){
				src += "?"+params.join('&');
			}

			return '<div class="video youtube"><iframe width="'+width+'" height="'+height+'" src="'+src+'" frameborder="'+frameborder+'" allowfullscreen></iframe></div>';
		});
	}
}).call(this)