<script type="text/javascript" src="@base-url@/public/yui/3.2.0/yui/yui-min.js"></script>
<script type="text/javascript">

if (typeof persTemplateFlag === 'undefined')
    persTemplateFlag = '{prs}';

YUI().use("jsonp", "substitute", "transition", "querystring", function (Y) {

    // page information.
    var query = "fullquery";
    var enc_query = "fullquery";
    var lang = '';
    var clustered = 0;

    function page_info()
    {
	this.rpp = xxrpp;  // results per page.
	this.cpage = 1;  // current page.
	this.engines = '';
	this.expansion = 1;
	this.nexpansion = 2;
	this.prs = "xxpers";
	this.ca = "xxca"; // content analysis.
	this.nclusters = "xxnclust";
	this.suggestion = '';
	this.reset = function() {
            this.cpage = 1;
            this.engines = '';
            this.expansion = 1;
            this.nexpansion = 2;
            this.suggestion = '';
	};
    }
    var pi_txt = new page_info();
    var pi_img = new page_info();
    pi_img.rpp = 60;
    var pi_vid = new page_info();
    pi_vid.rpp = 40;
    var pi_twe = new page_info();

    function type_info()
    {
        this.txt = 1;
        this.img = 0;
        this.vid = 0;
        this.twe = 0;
        this.reset = function() {
            this.txt = 0;
            this.img = 0;
            this.vid = 0;
            this.twe = 0;
        };
    }
    var ti = new type_info();

    function rpage()
    {
        this.prev = '';
	this.next = '';
        this.cpage = 1;
    }

    function sort_meta(s1,s2)
    {
	if (s1.seeks_meta < s2.seeks_meta)
	    return 1;
	else if (s1.seeks_meta > s2.seeks_meta)
	    return -1;
	else {
            if (s1.rank > s2.rank)
		return 1;
            else if (s2.rank < s1.rank)
                return -1;
            else return 0;
        }
    }    

    function sort_score(s1,s2)
    {
        if (s1.seeks_score < s2.seeks_score)
            return 1;
        else if (s1.seeks_score > s2.seeks_score)
            return -1;
	else return sort_meta(s1,s2);
    }
    
    var ref_url = "@base-url@/search?q=fullquery&expansion=1&action=expand&rpp=10&content_analysis=off&prs=on&output=json&callback={callback}";

    var outputDiv = Y.one("#main"), expansionLnk = Y.one("#expansion"), suggDiv = Y.one("#search_sugg"),
    pagesDiv = Y.one("#search_page_current"), langSpan = Y.one("#tab-language"), persHref = Y.one("#tab-pers"),
    persSpan = Y.one("#tab-pers-flag"), queryInput = Y.one("#search_input"), pagePrev = Y.one("#search_page_prev"),
    pageNext = Y.one("#search_page_next");

    var hashSnippets = {};
    var nsnippets = 0;
    var labels;

    function refresh_snippets(response)
    {
        var l = response.snippets.length;
        for (i=0; i < l; ++i)
        {
            var snippet = response.snippets[i];
            if (!hashSnippets[snippet.id])
                nsnippets++;
            hashSnippets[snippet.id] = snippet;
        }
    }

    function refresh_clusters(response,labels)
    {
        var c = response.clusters.length;
        for (i=0; i<c; ++i)
        {
            var cluster = response.clusters[i];
            var l = cluster.snippets.length;
            for (j=0; j<l; ++j)
            {
                var snippet = cluster.snippets[j];
                snippet.cluster = i;
                if (!hashSnippets[snippet.id])
                    nsnippets++;
                hashSnippets[snippet.id] = snippet;
            }
            labels[i] = cluster.label;
        }
    }
    
    // results.
    function refresh(url)
    {
        //outputDiv.setContent("Seeking...");
        var resultsWidget = new Y.JSONPRequest(url, {
            on: {
		success: function (response) {
                    lang = response.lang;
                    query = response.query;
                    enc_query = ':' + lang + '+' + encodeURIComponent(response.query);

                    if ('clusters'in response)
                    {
			clustered = response.clusters.length;
			labels = new Array(clustered);
			refresh_clusters(response,labels);
		    }
		    else
                    {
			clustered = 0;
			refresh_snippets(response);
                    }

                    // expansion.
                    var pi;
                    if (ti.txt == 1)
			pi = pi_txt;
                    else if (ti.img == 1)
			pi = pi_img;
                    else if (ti.vid == 1)
			pi = pi_vid;
                    else if (ti.twe == 1)
			pi = pi_twe;
                    pi.expansion = response.expansion;
                    pi.nexpansion = eval(response.expansion) + 1;
                    pi.suggestion = response.suggestion;
		    
                    // personalization.
                    pi.prs = response.pers;

                    // engines.
                    pi.engines = response.engines;

                    // TODO: content analysis.
                    
		    // rendering.
                    render();
		},

		failure: function () {
                    alert("fail");
                    outputDiv.setContent(this.failureTemplate);
		}
            }
        });
	resultsWidget.send();
    }

    /* main result widget stuff. */
    snippetTxtTemplate =
        '<li class="search_snippet">{headHTML}<a href="{url}">{title}</a>{enginesHTML}</h3><div>{summary}</div><div><cite>{cite}</cite><a class="search_cache" href="{cached}">Cached</a><a class="search_cache" href="{archive}">Archive</a><a class="search_cache" href="/search?q={enc_query}&amp;page=1&amp;expansion=1&amp;action=similarity&amp;id={id}&amp;engines=">Similar</a></div></li>';

    snippetImgTemplate =
        '<li class="search_snippet search_snippet_img"><h3><a href="{url}"><img src="{cached}"><div>{title}{enginesHTML}</div></h3><cite>{cite}</cite><br><a class="search_cache" href="{cached}">Cached</a></li>';
    
    snippetVidTemplate =
        '<li class="search_snippet search_snippet_vid"><a href="{url}"><img class="video_profile" src="{cached}"></a>{headHTML}<a href="{url}">{title}</a>{enginesHTML}</h3><div><cite>{date}</cite></div></li>';

    snippetTweetTemplate =
        '<li class="search_snippet"><a href="{cite}"><img class="tweet_profile" src="{cached}" ></a><h3><a href="{url}">{title}</a></h3><div><cite>{cite}</cite><date> ({date})</date><a class="search_cache" href="/search?q={enc_query}&page=1&expansion=1&action=similarity&id={id}&engines=twitter,identica">Similar</a></div></li>';
    
    //persTemplateFlag = '{prs}';
    
    failureTemplate =
        '<p class="error">Ack, I couldn\'t reach the Seeks search service!</p>';
    
    function render_snippet(snippet,pi)
    {
        var snippet_html = '';

        // personalization & title head.
        if (snippet.personalized == 'yes')
        {
            snippet.headHTML = '<h3 class=\"personalized_result personalized\" title=\"personalized result\">';
        }
        else
        {
            snippet.headHTML = '<h3>';
        }

        // render url capture.
        if (pi.prs == "on")
	{
            snippet.url = "/qc_redir?q=" + enc_query + "&url=" + encodeURIComponent(snippet.url);
        }

        // render engines.
        snippet.enginesHTML = '';
        for (j=0, le=snippet.engines.length; j < le; ++j)
        {
            snippet.enginesHTML += '<span class=\"search_engine search_engine_' + snippet.engines[j]  + '\" title=\"' + snippet.engines[j] + '\"><a href=\"';
            snippet.enginesHTML += '@base-url@/search';
            if (ti.img == 1)
                snippet.enginesHTML += '_img';
            snippet.enginesHTML += '?q=' + enc_query;
            snippet.enginesHTML += '&page=1&expansion=1&action=expand&engines=' + snippet.engines[j] + '\">';
            snippet.enginesHTML += '</a></span>';
        }

        // encoded query.
        snippet.enc_query = enc_query;
	
        var shtml = '';
        if (ti.txt == 1)
            shtml = Y.substitute(snippetTxtTemplate, snippet);
        else if (ti.img == 1)
            shtml = Y.substitute(snippetImgTemplate, snippet);
        else if (ti.vid == 1)
            shtml = Y.substitute(snippetVidTemplate, snippet);
        else if (ti.twe == 1)
            shtml = Y.substitute(snippetTweetTemplate, snippet);

        return shtml;
    }

    function render_snippets(rsnippets,pi)
    {
        var snippets_html = '<div id="search_results"><ol>';

        if (pi.prs == "on")
            rsnippets.sort(sort_score);
        else rsnippets.sort(sort_meta);

        var k = 0;
        for (id in rsnippets)
        {
            var snippet = rsnippets[id]
            k++;

            if (k < (pi.cpage-1) * pi.rpp)
                continue;
            else if (k > pi.cpage * pi.rpp)
                break;

            snippets_html += render_snippet(snippet,pi);
        }
        return snippets_html + '</ol></div>';
    }

    var isEven = function(someNumber)
    {
        return (someNumber%2 == 0) ? true : false;
    }

    function render_clusters(clusters,labels,pi)
    {
        var clusters_html = '<div id="search_results" class="yui3-g clustered">';
        var clusters_c1_html = '<div class="yui3-u-1-2 first">';
        var clusters_c2_html = '<div class="yui3-u-1-2">';
        for (c=0;c<clustered;++c)
        {
            var chtml = '';
            if (isEven(c))
                clusters_c1_html = render_cluster(clusters[c],labels[c],clusters_c1_html,pi);
            else clusters_c2_html = render_cluster(clusters[c],labels[c],clusters_c2_html,pi);
        }
        return clusters_html + clusters_c1_html + "</div>" + clusters_c2_html + "</div></div></div>";
    }

    function render_cluster(cluster,label,chtml,pi)
    {
        var l = cluster.length;
        if (l == 0)
            return chtml;
        chtml += '<div class="cluster"><h2>' + label + ' <font size="2"> (' + l + ')</font></h2><br><ol>';
        for (i=0;i<l;++i)
        {
            var s = cluster[i];
            var shtml = render_snippet(s,pi);
            chtml += shtml;
        }
        chtml += '</div></ol><div class="clear"></div>';
        return chtml;
    }

    function render()
    {
        var pi;
        if (ti.txt == 1)
            pi = pi_txt;
        else if (ti.img == 1)
            pi = pi_img;
        else if (ti.vid == 1)
            pi = pi_vid;
        else if (ti.twe == 1)
            pi = pi_twe;

        var clusters;
        if (clustered > 0)
        {
            clusters = new Array(clustered);
            for (i=0;i<clustered;++i)
                clusters[i] = new Array();
        }

        var rsnippets = [];
	var ns = 0;
        for (id in hashSnippets)
        {
            var snippet = hashSnippets[id];

            // check snippet type for rendering.
            if (ti.txt == 1
                && (snippet.type == "image" || snippet.type == "video_thumb" || snippet.type == "tweet"))
                continue;
            if (ti.img == 1 && snippet.type != "image")
                continue;
            else if (ti.vid == 1 && snippet.type != "video_thumb")
                continue;
            else if (ti.twe == 1 && snippet.type != "tweet")
                continue;
            if (clustered > 0)
            {
                if ('cluster' in snippet)
                {
		    clusters[snippet.cluster].push(snippet);
                }
            }
            else rsnippets.push(snippet);
            ns++;
        }

        // render snippets.
        var output_html = '';
        if (clustered > 0)
            output_html = render_clusters(clusters,labels,pi);
        else output_html = render_snippets(rsnippets,pi);
        outputDiv.setContent(output_html);

        // compute page number.
        var p = new rpage();
        p.cpage = pi.cpage;
        var max_page = 1;
        if (ns > 0)
	    max_page = ns / pi.rpp;

        pagesDiv.setContent(pi.cpage);
        if (pi.cpage > 1)
            pagePrev.setStyle('display',"inline");
        else pagePrev.setStyle('display',"none");
        if (pi.cpage < max_page)
            pageNext.setStyle('display',"inline");
        else pageNext.setStyle('display',"none");

        // expansion image.
        expansionLnk.setAttribute('class',"expansion_" + String(pi.expansion));
        expansionLnk.setContent(pi.expansion);

        // personalization.
        var persHTMLf = Y.substitute(persTemplateFlag, pi);
        persSpan.setContent(persHTMLf);

	// render language.
        langSpan.setContent(lang);

        // query suggestion.
        suggDiv.setContent(pi.suggestion);
    }
    
    /* send the request. */
    refresh(ref_url);

    // Click the search button to send the JSONP request
    Y.one("#search_form").on("submit", function (e) {
        var nquery = queryInput.get('value');
        var pi;
        if (ti.txt == 1)
            pi = pi_txt;
        else if (ti.img == 1)
        {
            pi = pi_img;
            eimg = "_img";
        }
        else if (ti.vid == 1)
            pi = pi_vid;
        else if (ti.twe == 1)
            pi = pi_twe;
        if (query != nquery)
        {
            var eimg = '';
            if (ti.img == 1)
                eimg = "_img";
            var url = '@base-url@/search' + eimg + '?' + Y.QueryString.stringify({"q":queryInput.get('value'),"expansion":1,"action":"expand","rpp":pi.rpp,"prs":"on","content_analysis":pi.ca,"ui":"dyn","output":"json"}) + "&engines=" + pi.engines + "&callback={callback}";
            for (id in hashSnippets)
                delete hashSnippets[id];
            pi_txt.reset();
            pi_img.reset();
            pi_vid.reset();
	    pi_twe.reset();
            refresh(url);
        }
        pi.cpage = 1;
        clustered = 0;
        render();
        return false;
    });

    Y.one("#expansion").on("click",function(e) {
	var eimg = '';
        var pi;
	if (ti.txt == 1)
            pi = pi_txt;
	else if(ti.img == 1)
	{
            pi = pi_img;
            eimg = "_img";
	}
        else if(ti.vid == 1)
            pi = pi_vid;
	else if(ti.twe == 1)
	    pi = pi_twe;
	var url = '@base-url@/search' + eimg + '?' + Y.QueryString.stringify({"q":queryInput.get('value'),"expansion":pi.nexpansion,"action":"expand","rpp":pi.rpp,"prs":pi.prs,"content_analysis":pi.ca,"ui":"dyn","output":"json"}) + "&engines=" + pi.engines + "&callback={callback}";
	refresh(url);
        return false;
    });

    Y.one("#cluster").on("click",function(e) {
	var pi;
	if (ti.txt == 1)
	    pi = pi_txt;
	else if (ti.vid == 1)
	    pi = pi_vid;
	else if (ti.twe == 1)
	    pi = pi_twe;
	else return false;
	var url = '@base-url@/search?' + Y.QueryString.stringify({"q":queryInput.get('value'),"expansion":pi.expansion,"action":"clusterize","clusters":pi.nclusters,"prs":pi.prs,"content_analysis":pi.ca,"ui":"dyn","output":"json"}) + "&callback={callback}";
        refresh(url);
        return false;
    });

    Y.one("#tab-pers").on("click",function(e) {
        var pi;
        if (ti.txt == 1)
            pi = pi_txt;
        else if(ti.img== 1)
            pi = pi_img;
        else if(ti.vid== 1)
            pi = pi_vid;
        else if(ti.twe== 1)
            pi = pi_twe;
        var nprs = "off";
        if (pi.prs == "off")
            nprs = "on";
        var url = '@base-url@/search?' + Y.QueryString.stringify({"q":queryInput.get('value'),"expansion":pi.expansion,"action":"expand","rpp":pi.rpp,"prs":nprs,"content_analysis":pi.ca,"ui":"dyn","output":"json"}) + "&engines=" + pi.engines + "&callback={callback}";
        refresh(url);
        return false;
    });

    Y.one("#tab-text").on("click",function(e) {
        ti.reset();
        ti.txt = 1;
        clustered = 0;
        if (pi_txt.engines == '')
        {
            var url = '@base-url@/search?' + Y.QueryString.stringify({"q":queryInput.get('value'),"expansion":pi_txt.expansion,"action":"expand","rpp":pi_txt.rpp,"prs":pi_txt.pers,"content_analysis":pi_txt.ca,"ui":"dyn","output":"json"}) + "&callback={callback}";
            refresh(url);
        }
        else render();
        return false;
    });

    Y.one("#tab-img").on("click",function(e) {
        ti.reset();
        ti.img = 1;
        if (pi_img.engines == '')
        {
            var url = '@base-url@/search_img?' + Y.QueryString.stringify({"q":queryInput.get('value'),"expansion":1,"action":"expand","rpp":pi_img.rpp,"prs":pi_img.pers,"content_analysis":pi_img.ca,"ui":"dyn","output":"json"}) + "&callback={callback}";
            refresh(url);
        }
        else render();
        return false;
    });

    Y.one("#tab-vid").on("click",function(e) {
        ti.reset();
        ti.vid = 1;
        clustered = 0;
        if (pi_vid.engines == '')
        {
            var url = '@base-url@/search?' + Y.QueryString.stringify({"q":queryInput.get('value'),"expansion":pi_vid.expansion,"action":"expand","rpp":pi_vid.rpp,"prs":pi_vid.pers,"content_analysis":pi_vid.ca,"ui":"dyn","output":"json"}) + "&engines=youtube,dailymotion&callback={callback}";
            refresh(url);
        }
        else render();
        return false;
    });

    Y.one("#tab-tweet").on("click",function(e) {
        ti.reset();
        ti.twe = 1;
        clustered = 0;
        if (pi_twe.engines == '')
        {
            var url = '@base-url@/search?' + Y.QueryString.stringify({"q":queryInput.get('value'),"expansion":pi_twe.expansion,"action":"expand","rpp":40,"prs":pi_twe.pers,"content_analysis":pi_twe.ca,"ui":"dyn","output":"json"}) + "&engines=twitter,identica&callback={callback}";
            refresh(url);
        }
        else render();
        return false;
    });

/* Y.one("#tab-urls").on("click",function(e) {                                                                                                                                                                                                                                     
        var url = '@base-url@/search?' + Y.QueryString.stringify({"q":queryInput.get('value'),"action":"urls","ui":"dyn","output":"json"}) + "&callback={callback}";
        refresh(url);
        return false;
	});                                                                                                                                                                                                                                                                                
   Y.one("#tab-titles").on("click",function(e) {                                                                                                                                                                                                                                      
        var url = '@base-url@/search?' + Y.QueryString.stringify({"q":queryInput.get('value'),"action":"titles","ui":"dyn","output":"json"}) + "&callback={callback}";
        refresh(url);
        return false;
	}); */

    Y.one("#tab-types").on("click",function(e) {
        var url = '@base-url@/search?' + Y.QueryString.stringify({"q":queryInput.get('value'),"action":"types","ui":"dyn","output":"json"}) + "&callback={callback}";
        refresh(url);
        return false;
    });

    Y.one("#search_page_prev").on("click",function(e) {
        if (ti.txt == 1)
            pi = pi_txt;
        else if(ti.img== 1)
            pi = pi_img;
        else if(ti.vid== 1)
            pi = pi_vid;
        else if(ti.twe== 1)
            pi = pi_twe;
        pi.cpage--;
        render();
    });

    Y.one("#search_page_next").on("click",function(e) {
        if (ti.txt == 1)
            pi = pi_txt;
        else if(ti.img== 1)
            pi = pi_img;
        else if(ti.vid== 1)
            pi = pi_vid;
        else if(ti.twe== 1)
            pi = pi_twe;
        pi.cpage++;
        render();
    });
});

// Shortcut for search, ctrl+s
YUI().use('event-key', function(Y) {
    var handle = Y.on('key', function(e) {
        e.halt();
        Y.one('#search_input').select();
    }, document, 'press:102+ctrl');

});

// Shortcut for expansion, ctrl+e
YUI().use('event-key', function(Y) {
    var handle = Y.on('key', function(e) {
	e.halt();
	document.location = Y.one('#expansion').getAttribute('href');
    }, document, 'press:101+ctrl');

});

// Shortcut for clustering, ctrl+c                                                                                                                                                                                                                                                     
YUI().use('event-key', function(Y) {
    var handle = Y.on('key', function(e) {
	e.halt();
	document.location = Y.one('#cluster').getAttribute('href');
    }, document, 'press:99+ctrl');
});

// Shortcut for previous page, ctrl+<
YUI().use('event-key', function(Y) {
    var handle = Y.on('key', function(e) {
        e.halt();
        document.location = Y.one('#search_page_prev').getAttribute('href');
    }, document, 'press:37+ctrl');
});

// Shortcut for home page, ctrl+h
YUI().use('event-key', function(Y) {
    var handle = Y.on('key', function(e) {
        e.halt();
        document.location = Y.one('#search_home').getAttribute('href');
    }, document, 'press:104+ctrl');
});

</script>