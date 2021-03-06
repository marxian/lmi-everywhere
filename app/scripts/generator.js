(function($, undefined){
	'use strict';
	var tag = _.template([
		'<script id="lmi-loader-0.22">',
		'(function() {',
		'  var script = document.createElement("script");',
		'  script.src = "<%= src %>";',
		'  script.async = true;',
		'   var entry = document.getElementById("lmi-loader-0.22");',
		'   entry.parentNode.insertBefore(script, entry);',
		'})();',
		'</script>'
	].join('\n'));

	function gen(params){
		// get our own host
		var path = window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port : ''),
			loader = '/lmi-everywhere.js',
			src = $.param.querystring(path + loader, params);
		return tag({src: src});
	}

	$('#gen').on('click', '.generate', function(evt){
		evt.preventDefault();
		var loader = gen(
			$.deparam(
				$(this).parents('form').serialize()
			)
		);
		$('#output').text(loader);
		$('#demo').empty();
		$('#demo').html(loader);
	});

})(jQuery);