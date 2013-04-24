(function($, undefined){
    'use strict';

    var app = {
        search_term: null,
        soc: null,
        region: 3,
        cache: {}
    };

    // Grab config from our URL
    $.extend(true, app, $.deparam.querystring());

    // Pick a starting page TODO: de-uglify this.
    if (app.search_term) {
        window.location.hash = 'list';
    }
    if (app.soc) {
        window.location.hash = 'info';
    }
    // Init jQM
    $.mobile.initializePage();

    /**
     * Provide a custom transistion handler to let us load and render api data before page show
     * I'm always surprised that tis sort of thing is necessary with jQuery Mobile. I'm probably missing something :-)
     */
    var oldDefaultTransitionHandler = $.mobile.defaultTransitionHandler;
    $.mobile.defaultTransitionHandler = function(name, reverse, $to, $from) {
        var promise = $to.data('promise');
        if (promise) {
            $to.removeData('promise');
            $.mobile.loading('show');                
            return promise.then(function() {
                $.mobile.loading('hide');
                return oldDefaultTransitionHandler(name, reverse, $to, $from);
            });
        }
        return oldDefaultTransitionHandler(name, reverse, $to, $from);
    };
    
    /**
     * Simple templte renderer
     * @param  {[Element]} target      [a jQuery wrapped element to accept the content]
     * @param  {[String]} template_id [the id of script element with type=text/template]
     * @param  {[Object]} data        [data to pass to the template]
     * @return
     */
    function render(target, template_id, data) {
        var content = _.template(
            $('#'+template_id).html(),
            data
        );
        target.html(content);
    }

    /**
     * Set app.search_term when the search button is clicked
     */
    $('#search').on('click', 'a', function(evt){
        app.search_term = $(evt.delegateTarget).find('input[type=text]').val();
    });

    $('#list').on('click', 'a', function(evt){
        var soc = _.findWhere(app.search_results, { soc: $(this).data('soc')});
        app.soc = soc.soc;
        app.cache[app.soc] = soc; 
    });

    /**
     * Fetch search results and render a template before showing the list view
     */
    $(document).on('pagebeforeshow', '#list', function() {
        var $page = $(this),
            promise = $.Deferred(function(d){
                $.ajax({
                    url: 'http://api.lmiforall.org.uk/api/soc/search',
                    method: 'GET',
                    dataType: 'json',
                    data: {
                        q: app.search_term
                    }
                }).done(function(data){
                    app.search_results = data;
                    render($page.find('ul'), 'list_content', {jobs: data});
                    $page.find('ul').listview('refresh');
                    d.resolve();
                });
            }).promise();
        // Save promise on page so the transition handler can find it.
        $page.data('promise', promise);
    });

    function fetchSOC(code) {
        var d = $.Deferred();
        if (!app.cache[code]) {
            $.ajax({
                url: 'http://api.lmiforall.org.uk/api/soc/code/' + code,
                method: 'GET',
                dataType: 'json',
            }).done(function(soc){
                app.cache[code] = soc;
                d.resolve();
            });
        } else {
            d.resolve();
        }
        return d.promise();
    }

    /**
     * Fetch working futures predictions and prepare the info view
     */
    $(document).on('pagebeforeshow', '#info', function(){
        var $page = $(this),
            promise = $.Deferred(function(d){
                fetchSOC(app.soc).then(function(){
                    $.ajax({
                        url: 'http://api.lmiforall.org.uk/api/wf/predict',
                        method: 'GET',
                        dataType: 'json',
                        data: {
                            soc: app.soc,
                            region: app.region
                        }
                    }).done(function(data){
                        var chart_data, chart, axes;
                        render($page.find('div[data-role=content]'), 'info_content', {
                            soc: app.cache[app.soc]
                        });
                        // mangle the data for the rickshaw chart
                        chart_data = $.map(data.predictedEmployment, function(v){
                            return {
                                x: new Date(v.year.toString()).getTime() / 1000,
                                y: v.employment
                            }
                        });
                        // Clear any previous chart. This is less than elegant...
                        $page.find('.chart').empty();
                        chart = new Rickshaw.Graph( {
                            element: $page.find('.chart')[0],
                            min: 'auto',
                            width: $('body').width(),
                            height: $(window).height() * 0.45,
                            series: [{
                                color: 'steelblue',
                                data: chart_data
                            }]
                        });
                        axes = new Rickshaw.Graph.Axis.Time( { graph: chart } );
                        chart.render();
                        d.resolve();
                    });
                });
            }).promise();
        $page.data('promise', promise);
    });

    // debug
    window.app = app;

})(jQuery);

