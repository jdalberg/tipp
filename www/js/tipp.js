var _URL;
var _VER;
var _CHANGELOG_PAGE_SIZE;
var _statusbar;
var _status_area;
var _SERVER_CAPS;
var _LINKIFY;
var _BIGFREE;
function init()
{
	_URL = "cgi-bin/tipp.cgi";
	_VER = "2010030201";
	_CHANGELOG_PAGE_SIZE = 30;

	message("The status of the latest update is shown here");

	remote({ what: "config" }, function (res) {
		_SERVER_CAPS = res.caps;
		_LINKIFY = res.linkify;
		$("h1").text($("h1").text() + res.extra_header);
		document.title = document.title + res.extra_header;
		$("#login-name").html("Welcome, <strong>" + res.login + "</strong>");
	});

	$("#search").focus();
	$('#search-button').click(function (ev) {
		ev.preventDefault();
		ev.stopPropagation();
		clear_selection();
		$("#main-content").remove();
		search();
	});
	$('#home-button').click(function (ev) {
		ev.preventDefault();
		ev.stopPropagation();
		clear_selection();
		$("#main-content").remove();
		browse();
	});
	$('#net-view-button').click(function (ev) {
		ev.preventDefault();
		ev.stopPropagation();
		clear_selection();
		$("#main-content").remove();
		net_view();
	});
	$('#add-button').click(function (ev) {
		ev.preventDefault();
		ev.stopPropagation();
		clear_selection();
		add_network();
	});
	$('#changelog-button').click(function (ev) {
		ev.preventDefault();
		ev.stopPropagation();
		clear_selection();
		$("#main-content").remove();
		view_changes();
	});
	$('#add-range-button').click(function (ev) {
		ev.preventDefault();
		ev.stopPropagation();
		clear_selection();
		add_class_range();
	});
	$('#statistics-button').click(function (ev) {
		ev.preventDefault();
		ev.stopPropagation();
		clear_selection();
		$("#main-content").remove();
		stat_view();
	});

	browse();
}

function browse()
{
	remote({}, function (res) {
		$(document).data("@classes", res);
		var $div = $("<div class='linklist' id='main-content'></div>");
		$div.append($("<h2>All classes &amp; networks</h2>"));
		var $ul  = $("<ul></ul>");
		$div.hide().append($ul);
		var n = res.length;
		for (var i = 0; i < n; i++) {
			var v = res[i];
			var $li = $("<li id='browse-class-" + v.id + "'><a class='browse-class' href='#'>" +
				'<span class="form-icon ui-icon ui-icon-carat-1-e"></span>' +
				v.name + "</a>" +
				"</li>");
			$ul.append($li);
			add_class_link($li.find("a.browse-class"), v.id);
		}
		$("#view").append($div);
		$("#main-content-XXX").selectable({
			filter: ".can-select",
			delay: 20,
			distance: 10,
			start: function () {
				$("#select-menu").remove();
			},
			stop: function (ev) {
				var $menu = $("<div id='select-menu'>" +
					"<ul>" +
					"<li>Cancel</li>" +
					"<li>&nbsp;</li>" +
					"<li>Merge networks</li>" +
					"<li>Export CSV</li>" +
					"</ul>" +
					"</div>");
				$menu.css({
					left: ev.clientX-30,
					top:  ev.clientY-24
				});
				$("#view").append($menu);
			}
		});
		$div.slideDown("fast");
	});
}

function net_view()
{
	remote({what: "top-level-nets"}, function (res) {
		var $div = $("<div class='linklist' id='main-content'></div>");
		$div.append($("<h2>Network view</h2>"));
		var $ul  = $("<ul></ul>");
		$div.hide().append($ul);
		var n = res.length;
		for (var i = 0; i < n; i++) {
			var v = res[i];
			var $li = $("<li><a href='#' class='show-net with-free without-free'>" +
				'<span class="form-icon ui-icon ui-icon-carat-1-e"></span>' +
				v + "</a></li>");
			$ul.append($li);
			add_net_link($li, { class_range_id: null, limit: v });
		}
		$("#view").append($div);
		$div.slideDown("fast");
	});
}

function stat_view()
{
	_BIGFREE = [];
	remote({what: "top-level-nets"}, function (res) {
		var $div = $("<div class='linklist' id='main-content'></div>");
		$div.append($("<h2>IPv4 Usage Statistics (network based)</h2>"));
		var $table = $("<table class='networks'><tr><th>Supernet</th><th>Total IPs</th><th>Used IPs</th><th>Free IPs</th></tr></table>");
		$div.append($table);
		$("#view").append($div);
		$div.show();
		var n = res.length;
		add_stat_line($div, $table, res, 0, n, 0, 0);
	});
}

function add_stat_line($div, $table, res, i, n, all_total, all_used)
{
	if (i >= n) {
		// finalize
		$div.append(snippet("statistics-usage-summary", {
            total : all_total,
            used  : all_used,
            free  : all_total - all_used,
            usage : (100 * all_used / all_total).toFixed(1) + "%"
		}));

		$div.append($("<h2>Big IPv4 free public space</h2>"));
		var $table = $("<table class='networks'><tr><th>Size</th><th>Free nets</th></tr></table>");
		for (var k = 0; k < 24; k++) {
			if (_BIGFREE[k]) {
				$table.append(
					$("<tr class='network'><td class='network'>" +
					k + "</td><td class='ip'>" +
					_BIGFREE[k].length + "</td></tr>"));
				for (var j = 0; j < _BIGFREE[k].length; j++) {
					var $tr = $("<tr class='network class-range'><td class='network'></td><td class='ip'>" +
						"<div class='class-range'>" +
						_BIGFREE[k][j].net +
						button_icon("allocate", "plus", "Allocate network in this range") +
						"<span class='extras-here'></span>" +
						"</div>" +
						"</td></tr>");
					$table.append($tr);
					$tr.data("@net", _BIGFREE[k][j]);
					class_range_net_link($tr);
				}
			}
		}
		$table.find('tr.network:nth-child(even)').addClass('alt-row');
		$div.append($table);
	} else {
		remote({what: "net", id: null, limit: res[i], free: true},
		function (nets) {
			var n_nets = nets.length;
			var ip_total = 0;
			var ip_used  = 0;
			var ip_free  = 0;
			for (var k = 0; k < n_nets; k++) {
				var net = nets[k];
				if (net.f == 4) {
					if (net.free == 1) {
						ip_free += net.sz;
						if (!net.private && net.bits < 24) { // a bit arbitrary
							if (!_BIGFREE[net.bits]) _BIGFREE[net.bits] = [];
							_BIGFREE[net.bits].push(net);
						}
					} else {
						ip_used += net.sz;
						if (!net.private)	all_used += net.sz;
					}
					ip_total += net.sz;
					if (!net.private)	all_total += net.sz;
				}
			}
			if (ip_total) {
				var $tr = $("<tr class='network'><td class='network'>" + res[i] + "</td><td class='ip'>" +
					ip_total + "</td><td class='ip'>" +
					ip_used + "</td><td class='ip'>" +
					ip_free + "</td></tr>");
				if (net.private)
					$tr.find(".network").addClass('noteworthy').tooltip({ 
						cssClass: "tooltip",
						xOffset:  10,
						yOffset:  30,
						content:  '<a href="http://tools.ietf.org/html/rfc1918">RFC1918</a> range'
					});
				$table.append($tr);
				$table.find('tr.network:nth-child(even)').addClass('alt-row');
			}
			add_stat_line($div, $table, res, i+1, n, all_total, all_used);
		});
	}
}
/*
		remote({what: "net", id: null, limit: limit, free: true},
		function (res) {
			$main_a.find("span.ui-icon").removeClass("ui-icon-carat-1-e");
			$main_a.find("span.ui-icon").addClass("ui-icon-carat-1-n");
			var $div = $("<div class='linklist networks'></div>");
			var $tab  = $("<table class='networks'></table>");
			$div.hide().append($tab);
			var n = res.length;
			for (var i = 0; i < n; i++) {
				$tab.append(insert_network(res[i]));
			}
			$tab.find('tr.network:nth-child(even)').addClass('alt-row');
			$main_a.closest("li").append($div);
			$div.slideDown("fast");
			remove_net_link($li, class_range_id, limit);
		});
*/

function search()
{
	var v = $("#search").val();
	$(document).data("@search", v);
	remote({what: "search", q: v}, function (res) {
		var $div = $("<div class='linklist' id='main-content'></div>");
		$div.hide();
		$div.append($("<h2>Matching networks (" + res.nn + ")</h2>"));
		network_search_results($div, res);
		$div.append($("<h2>Matching IP addresses (" + res.ni + ")</h2>"));
		ip_search_results($div, res);
		$("#view").append($div);
		$div.slideDown("fast");
	});
}

function network_search_results($div, res)
{
	if (res.n.length == 0 && !res.net_message)
		res.net_message = "No matches.";
	if (res.net_message)
		$div.append(possibly_full_search("net", res.net_message));
	var $tab  = $("<table class='networks'></table>");
	$div.append($tab);
	var n = res.n.length;
	for (var i = 0; i < n; i++) {
		$tab.append(insert_network(res.n[i]));
	}
	$tab.find('tr.network:nth-child(even)').addClass('alt-row');
}

function ip_search_results($div, res)
{
	if (res.i.length == 0 && !res.ip_message)
		res.ip_message = "No matches.";
	if (res.ip_message)
		$div.append(possibly_full_search("ip", res.ip_message));
	if (res.i.length == 0)
		return;
	var $ips = $("<div class='addresses'><table class='addresses'></table></div>");
	var n = res.i.length;
	var trs = "";
	for (var i = 0; i < n; i++) {
		var v = res.i[i];
		trs += "<tr class='ip-info'><td class='ip'>" +
			'<a class="show-net" href="#" title="Show network">' +
			'<span class="form-icon ui-icon ui-icon-arrowreturnthick-1-n"></span></a>' +
			"<a class='ip' href='#'>" + v.ip + "</a>" +
			"</td><td class='description'>" + ip_description(v) +
			"</td></tr>";
	}
	$ips.find("table").append(trs);
	$ips.find('tr:nth-child(even)').addClass('alt-row');
	$ips.find("table.addresses").click(edit_ip);
	$div.append($ips);
}

function possibly_full_search(what, msg)
{
	var m = msg.replace(/{(.*?)}/, "<a class='show-anyway' href='#'>$1</a>");
	var $div = inline_alert(m);
	var v = $(document).data("@search");
	$div.find(".show-anyway").click(function (ev) {
		ev.preventDefault();
		ev.stopPropagation();
		remote({what: "search", q: v, only: what, all: true}, function (res) {
			var $new_div = $("<div class='linklist'></div>");
			$new_div.hide();
			if (what == "net")
				network_search_results($new_div, res);
			if (what == "ip")
				ip_search_results($new_div, res);
			$div.replaceWith($new_div);
			$new_div.slideDown("fast");
		});
	});
	return $div;
}

function view_changes()
{
	var $div = snippet("change-log-div");
	$div.data("@page", 0);
	$("#view").append($div);
	$div.slideDown("fast", function () { $("#changelog-filter").focus(); });
	$("#changelog-filter-button").click(function (ev) {
		ev.preventDefault();
		ev.stopPropagation();
		$div.data("@page", 0);
		filter_changes(true);
	});
	filter_changes();
}

function filter_changes(changed)
{
	var $div = $("#main-content");
	var filter = $("#changelog-filter").val();
	var page = $div.data("@page");
	remote({what: 'changelog', filter: filter, page: page, pagesize: _CHANGELOG_PAGE_SIZE }, function (res) {
		var $form = $("<form class='changelog-form'><table class='changelog'></table></form>");
		var $head_tr = changelog_navigation(res);
		var $tail_tr = changelog_navigation(res);
		var $tab = $form.find("table.changelog");
		$tab.append($head_tr);
		var n = res.e.length;
		for (var i = 0; i < n; i++) {
			var v = res.e[i];
			var $tr = $("<tr><td class='date'>" +
				date_format(v.created) +
				"</td><td class='who'>" + v.who +
				"</td><td class='change'>" + format_change(v) +
				"</td></tr>");
			$tr.find("td.change").data("@created", v.created);
			$tab.append($tr);
		}
		if (n == 0) {
			$tab.append($("<tr><td colspan='3'>" + inline_alert("No matching changes").html() + "</td></tr>"));
		}
		$tab.find('tr:nth-child(odd)').not('tr:first').addClass('alt-row');
		$tab.append($tail_tr);
		$tab.click(changelog_click_handler);
		$div.find("form.changelog-form").remove();
		$div.append($form);
		$form.find(".next").click(function (ev) {
			$div.data("@page", $div.data("@page")+1);
			ev.preventDefault();
			ev.stopPropagation();
			filter_changes(true);
		});
		$form.find(".previous").click(function (ev) {
			$div.data("@page", $div.data("@page")-1);
			ev.preventDefault();
			ev.stopPropagation();
			filter_changes(true);
		});
		if (changed) $form.effect("highlight", {}, 1000);
	});
}

function format_change(v)
{
	var t = v.change;
	if (v.what == 'N') {
		t = t.replace(/(\d+\.\d+\.\d+\.\d+\/\d+)/, "<a class='net-history' href='#'>$1</a>");
		t = t.replace(/([\da-fA-F]+(:[\da-fA-F]+){7}\/\d+)/, "<a class='net-history' href='#'>$1</a>");
		t = t.replace(/([\da-fA-F]+(:[\da-fA-F]+)*::\/\d+)/, "<a class='net-history' href='#'>$1</a>");
	} else if (v.what == 'I') {
		t = t.replace(/(\d+\.\d+\.\d+\.\d+)/, "<a class='ip-history' href='#'>$1</a>");
	}
	return t;
}

function changelog_navigation(r)
{
	var $tr = $("<tr class='navigation'></tr>");
	var $td_left  = $("<td class='changelog left'></td>");
	var $td_right = $("<td class='changelog right'></td>");
	if (r.p > 0) {
		var $prev = $(button_icon("previous", "arrowthick-1-w", "Previous page"));
		$td_left.append($prev);
	}
	if (r.n > 0) {
		var $next = $(button_icon("next", "arrowthick-1-e", "Next page"));
		$td_right.append($next);
	}
	$tr.append($td_left);
	$tr.append($("<td></td>"));
	$tr.append($td_right);
	return $tr;
}

function changelog_click_handler(ev)
{
	var $t = $(ev.target);
	if ($t.closest("a.ip-history").length > 0) {
		var $td = $t.closest("td.change");
		var ip = $t.closest("a.ip-history").text();
		show_ip_history(ev, $td, ip, false, $td.data("@created"));
	} else if ($t.closest("a.net-history").length > 0) {
		var $td = $t.closest("td.change");
		var net = $t.closest("a.net-history").text();
		show_network_history(ev, $td, net, false, $td.data("@created"));
	}
/*
	if ($t.is("a.ip") && $t.parent().is("td.ip")) {
		ev.preventDefault();
		ev.stopPropagation();
		var $form_td = $t.parent().parent().find("td.description:first");
		var $div = $form_td.find("div.ip-net:first");
		if ($div.is("div")) {
			$div.slideUp("fast", function () { $(this).remove(); edit_ip_main($t, $form_td); });
		} else {
			edit_ip_main($t, $form_td);
		}
*/
}

function add_network($where)
{
	if (!$where && $('#add-form').length > 0) {
		$('#add-form').slideToggle("fast", function () {
			if (!$(this).is(":hidden"))
				$(this).find(".network").focus().select();
		});
	} else {
		var id_or_class = $where ? "class" : "id";
		var inside = "";
		var class_id = 0;
		var v;
		var limit = "";
		if ($where) {
			v = $where.data("@net");
			inside = " within " + v.net;
			class_id = v.class_id;
			limit = v.net;
		}
		var form = '<div ' + id_or_class + '="add-form"><form class="add-form">' +
			'<div class="edit-header">Allocating new network' +
			inside + '</div><div class="edit-form">' +
			'<table><tr><td class="label">Class:</td><td>' +
			gen_class_input(class_id) + '</td></tr>' +
			'<tr><td class="label">Network:</td><td>' +
			'<input type="text" size="32" maxlength="32" class="network with-icon"/>' +
			'<a href="#" title="Suggest network based on specified size"><span class="form-icon ui-icon ui-icon-gear right suggest"></span>' +
			'</td></tr>' +
			'<tr><td class="label">Description:</td><td>' +
			'<input type="text" size="64" maxlength="256" class="network-description"/>' +
			'</td></tr>' +
			'<tr><td class="label">Integration data:</td><td>' +
			'<input type="text" size="32" maxlength="256" class="network-integration"/>' +
			'</td></tr></table><p>' +
			"<input class='ok-button' type='image' src='images/notification_done.png' title='Save'/> " +
			"<input class='cancel-button' type='image' src='images/notification_error.png' title='Cancel'/></p>" +
			'</div></form></div>';
		var $form = $(form);
		var $insert = $form;
		$form.hide();
		var in_class_range = false;
		if ($where)	{
			$form.find(".network").val(v.net);
			if ($where.is(".class-range")) {
				$where.find(".extras-here").after($insert);
				$form.addClass("class-range");
				in_class_range = true;
			} else {
				$insert = $("<tr><td colspan='3'></td></tr>");
				$insert.find("td").append($form);
				$where.after($insert);
			}
		} else {
			$("#view").prepend($form);
		}
		$form.slideDown("fast");
		$form.find('.cancel-button').click(function (ev) {
			ev.preventDefault();
			ev.stopPropagation();
			$form.slideUp("fast", function () {
				if ($where) {
					$insert.remove();
					if (!in_class_range) add_address_link($where);
				}
			});
		});
		if ($where && !in_class_range) {
			var $el = $where.find("a.address-link");
			$el.unbind("click");
			$el.click(function (ev) {
				$form.slideUp("fast", function () { if ($where) { $insert.remove(); }});
				ev.preventDefault();
				ev.stopPropagation();
				add_address_link($where);
			});
		}
		$form.find('.suggest').click(function (ev) {
			ev.preventDefault();
			ev.stopPropagation();
			remote({what: "suggest-network",
				limit: limit,
				sz: $form.find(".network").val(),
				id: $form.find(".network-class").val()},
				function (res) {
					if (res.n) {
						$form.find(".network").val(res.n).effect("highlight", {}, 2000);
					} else {
						carp("Internal error, should not happen!");
					}
				});
		});
		$form.find('.ok-button').click(function (ev) {
			ev.preventDefault();
			ev.stopPropagation();
			clear_selection();
			var $net = $form.find(".network");
			var $descr = $form.find(".network-description");
			var $integration = $form.find(".network-integration");
			var $class = $form.find(".network-class");
			if ($net.val() == "") {
				$net.effect("bounce", {direction: "left"});
				return carp("Network must be specified");
			}
			if ($descr.val() == "") {
				$descr.effect("bounce", {direction: "left"});
				return carp("Network description must be specified");
			}
			remote({what: "new-network",
				limit: limit,
				net: $net.val(),
				descr: $descr.val(),
				integration: $integration.val(),
				class_id: $class.val(),
				in_class_range: in_class_range},
				function (res) {
					message(res.msg);
					if ($where && !in_class_range) {
						$insert.remove();
						replace_networks($where, res);
					} else {
						var $div = $("#main-content").find("div.newly-inserted");
						var $tab;
						if ($div.length <= 0) {
							$div = $("<div class='linklist newly-inserted'></div>");
							$tab = $("<table class='networks'></table>");
							$div.hide().append($("<h2>Newly inserted networks</h2>"));
							$div.append($tab);
							$("#main-content").prepend($div);
						} else {
							$tab = $div.find("table.networks");
						}
						var $ni = insert_network(res);
						$tab.append($ni);
						$form.slideUp("fast", function () { if (in_class_range) $form.remove(); });
						if (!in_class_range) {
							$net.val("");
							$descr.val("");
							$class.val(0);
						}
						$div.slideDown("fast");
						$tab.find('tr.network').removeClass('alt-row');
						$tab.find('tr.network:nth-child(even)').addClass('alt-row');
						$ni.effect("highlight", {}, 2000);
					}
				});
		});
		$form.find(".network").focus().select();
	}
}

function add_class_range()
{
	if ($('#add-class-range-form').length > 0) {
		$('#add-class-range-form').slideUp("fast", function () { $(this).remove() });
	} else {
		var form = '<div id="add-class-range-form" class="edit-class-range"><form class="class-range-edit-form">' +
			'<div class="edit-header">Creating new class range</div><div class="edit-form">' +
			'<table><tr><td class="label">Class:</td><td>' +
			gen_class_input(0) + '</td></tr>' +
			'<tr><td class="label">Class range:</td><td>' +
			'<input type="text" size="32" maxlength="32" class="class-range-range"/>' +
			'</td></tr>' +
			'<tr><td class="label">Description:</td><td>' +
			'<input type="text" size="64" maxlength="256" class="class-range-description"/>' +
			'</td></tr>' +
			'</table><p>' +
			"<input class='ok-button' type='image' src='images/notification_done.png' title='Save'/> " +
			"<input class='cancel-button' type='image' src='images/notification_error.png' title='Cancel'/>" +
			"</p>" +
			'</div></form></div>';
		var $form = $(form);
		$form.hide();
		$("#view").prepend($form);
		$form.slideDown("fast");
		$form.find(".cancel-button").click(function (e) {
			e.preventDefault();
			e.stopPropagation();
			$form.slideUp("fast", function () { $form.remove(); });
		});
		$form.find(".ok-button").click(function (e) {
			e.preventDefault();
			e.stopPropagation();
			var $range = $form.find(".class-range-range");
			var $descr = $form.find(".class-range-description");
			var $cl = $form.find(".network-class");

			if (!is_net_ok($range.val())) {
				$range.effect("bounce", {direction: "left"});
				return carp("Invalid class range", $range);
			}

			remote({
				what:		"add-class-range",
				class_id:	$cl.val(),
				range:		$range.val(),
				descr:		$descr.val()
			}, function (res) {
				message(res.msg);
				var $el = $("#browse-class-" + res.class_id);
				remove_class_link($el.find('a.browse-class'), res.class_id);
				$el.find('a.browse-class').click();
				$el.effect("highlight", {}, 3000);
				$form.slideUp("fast", function () { $form.remove(); });
			});
		});
		$form.find(".class-range-range").focus().select();
	}
}

function replace_networks($where, res)
{
	var $tab = $where.closest("table.networks");
	var n = res.n.length;
	var $toins = $where;
	var collection = new Array;
	for (var i = 0; i < n; i++) {
		var $ni = insert_network(res.n[i]);
		$toins.after($ni);
		$toins = $ni;
		collection.push($ni);
	}
	$where.remove();
	$tab.find('tr.network').removeClass('alt-row');
	$tab.find('tr.network:nth-child(even)').addClass('alt-row');
	n = collection.length;
	for (var i = 0; i < n; i++) {
		collection[i].effect("highlight", {}, 2000);
	}
}

function add_class_link($el, class_id)
{
	$el.unbind("click");
	$el.click(function(ev) {
		clear_selection();
		remote({what: "class", id: class_id},
		function (res) {
			$el.find("span.ui-icon").removeClass("ui-icon-carat-1-e");
			$el.find("span.ui-icon").addClass("ui-icon-carat-1-n");
			var $div = $("<div class='linklist'></div>");
			var $ul  = $("<ul></ul>");
			$div.hide().append($ul);
			var n = res.length;
			for (var i = 0; i < n; i++) {
				var v = res[i];
				var free_space = v.addresses;
				if (v.misclassified) {
					var $li = snippet("misclassified-class-range", {
						misclassified : v.misclassified
					});
					$ul.append($li);
					$li.data("@net", v);
					add_net_link($li, { misclassified: v.misclassified, class_id: v.class_id });
					continue;
				}
				if (v.f == 6)
					free_space = (100 * (new Number(v.addresses) / (new Number(v.addresses) + new Number(v.used)))).toFixed(1) + "%";
				var $li = $("<li class='class-range'>" +
					"<div>" +
					// XXX this fixed width is unsatisfactory for IPv6
					// XXX maybe this <li> should be table-like
					"<a href='#' class='show-net without-free td-like' style='width: 14em;'>" +
					'<span class="form-icon ui-icon ui-icon-carat-1-e"></span>' +
					v.net + "</a>" +
					"<span class='netinfo td-like' style='width: 7em;'> " +
					"<a href='#' class='show-net with-free'>" + free_space + " free</a>" +
					"</span>" +
					'<span class="buttons td-like">' + button_icon("edit-range", "document", "Edit range") +
					(v.addresses == 0 ? "" :
					' ' + button_icon("allocate", "plus", "Allocate network in this range")) +
					(v.used != 0 ? "" :
					' ' + button_icon("delete-range", "close", "Delete this range")) +
					"</span>" +
					'<span class="description td-like">' + v.descr +
					"</span>" +
					"<span class='extras-here'></span></div></li>");
				$ul.append($li);
				$li.data("@net", v);
				class_range_net_link($li);
				class_range_edit_link($li);
				class_range_remove_link($li);
				if (v.addresses > 0)
					$li.find("a.with-free").addClass("has-free-space");
				add_net_link($li, { class_range_id: v.id });
			}
			$el.parent().append($div);
			$div.slideDown("fast");
			remove_class_link($el, class_id);
		});
		ev.preventDefault();
		ev.stopPropagation();
	});
}

function class_range_net_link($li)
{
	$li.find(".allocate").click(function(ev) {
		ev.preventDefault();
		ev.stopPropagation();
		clear_selection();
		var $form = $li.find("div.add-form.class-range");
		if ($form.length > 0)
			$form.slideUp("fast", function () { $form.remove(); });
		else
			add_network($li);
	});
}

function class_range_edit_link($li, ev)
{
	$li.find(".edit-range").click(function(ev) {
		ev.preventDefault();
		ev.stopPropagation();
		clear_selection();
		var $form = $li.find("div.edit-class-range");
		if ($form.length > 0)
			$form.slideUp("fast", function () { $form.remove(); });
		else
			edit_class_range($li);
	});
}

function class_range_remove_link($li, ev)
{
	$li.find(".delete-range").click(function(ev) {
		ev.preventDefault();
		ev.stopPropagation();
		clear_selection();
		var v = $li.data("@net");
		ask("All information about<br/>class range " + v.net + "<br/>will be deleted!", function () {
			remote({what: "remove-class-range", id: v.id}, function (res) {
				message(res.msg);
				$li.slideUp("fast", function () { $li.remove(); });
			});
		});
	});
}

function edit_class_range($li)
{
	var v = $li.data("@net");
	var form = '<div class="edit-class-range"><form class="class-range-edit-form">' +
		'<div class="edit-header">Editing class range ' + v.net + '</div><div class="edit-form">' +
		'<table><tr><td class="label">Class:</td><td>' +
		gen_class_input(v.class_id) + '</td></tr><tr><td class="label">Description:</td><td>' +
		'<input type="text" size="64" maxlength="256" class="class-range-description"/>' +
		'</td></tr></table><p>' +
		"<input class='ok-button' type='image' src='images/notification_done.png' title='Save'/> " +
		"<input class='cancel-button' type='image' src='images/notification_error.png' title='Cancel'/>" +
		"</p>" +
		'</div></form></div>';
	var $form = $(form);
	$form.hide();
	$form.find(".class-range-description").val(v.descr);
	$li.find(".extras-here").after($form);
	$form.slideDown("fast", function () {
		$form.find(".class-range-description").focus().select();
	});
	$form.find(".cancel-button").click(function (e) {
		e.preventDefault();
		e.stopPropagation();
		$form.slideUp("fast", function () { $form.remove(); });
	});
	$form.find(".ok-button").click(function (e) {
		e.preventDefault();
		e.stopPropagation();
		var $descr = $form.find(".class-range-description");
		var $cl = $form.find(".network-class");
		var v = $li.data("@net");

		remote({
			what:		"edit-class-range",
			id:			v.id,
			class_id:	$cl.val(),
			descr:		$descr.val()
		}, function (res) {
			message(res.msg);
			$li.find("span.description").text(res.descr);
			$form.slideUp("fast", function () { $form.remove(); });
			$li.effect("highlight", {}, 3000);
		});
	});
}

function remove_class_link($el, class_id)
{
	$el.unbind("click");
	$el.click(function (ev) {
		$el.find("span.ui-icon").removeClass("ui-icon-carat-1-n");
		$el.find("span.ui-icon").addClass("ui-icon-carat-1-e");
		$el.parent().find("div").slideUp("fast", function () { $(this).remove() });
		ev.preventDefault();
		ev.stopPropagation();
		clear_selection();
		add_class_link($el, class_id);
	});
}

function add_net_link($li, p)
{
	var $all_a = $li.find("a.show-net");
	var $main_a = $li.find("a.show-net.without-free");
	$all_a.unbind("click");
	$all_a.click(function(ev) {
		clear_selection();
		remote({what: "net",
			id:            p.class_range_id,
			limit:         p.limit,
			free:          $(ev.target).closest(".with-free").length > 0,
			misclassified: p.misclassified,
			class_id:      p.class_id
		},
		function (res) {
			$main_a.find("span.ui-icon").removeClass("ui-icon-carat-1-e");
			$main_a.find("span.ui-icon").addClass("ui-icon-carat-1-n");
			var $div = $("<div class='linklist networks'></div>");
			var $tab  = $("<table class='networks'></table>");
			$div.hide().append($tab);
			var n = res.length;
			for (var i = 0; i < n; i++) {
				$tab.append(insert_network(res[i]));
			}
			$tab.find('tr.network:nth-child(even)').addClass('alt-row');
			$main_a.closest("li").append($div);
			$div.slideDown("fast");
			remove_net_link($li, p);
		});
		ev.preventDefault();
		ev.stopPropagation();
	});
}

function insert_network(v)
{
	var $ni;
	if (v.free == 1) {
		$ni = $("<tr class='free network can-select'><td class='network'>" +
			"<form class='button-form'>" +
			'<span class="form-icon no-icon"></span> ' +
			'<span>' +
			"<a class='newnet-link address-link' href='#'>" + v.net + "</a>" +
			"</span></form></td><td class='class_name'>" +
			"<span class='netinfo class_name'> " + v.class_name + "</span>" +
			"</td><td class='description'>" +
			"<span class='netinfo'>" + linkify(v.descr) + "</span></td></tr>");
	} else {
		$ni = $("<tr class='network can-select'><td class='network'>" +
			"<form class='button-form'>" +
			'<a class="edit-button" href="#" title="Edit"><span class="form-icon ui-icon ui-icon-document"></span></a> ' +
			'<span>' +
			"<a class='address-link' href='#'>" + v.net + "</a>" +
			"</span></form></td><td class='class_name'>" +
			"<span class='netinfo class_name'> " + v.class_name + "</span>" +
			"</td><td class='description'>" +
			"<span class='netinfo'>" + linkify(v.descr) + "</span></td></tr>");
	}
	if (v.wrong_class == 1) {
		$ni.find("span.class_name").addClass("noteworthy").tooltip({ 
			cssClass: "tooltip",
			xOffset:  10,
			yOffset:  30,
			content:  'Classified differently<br/>from its parent range,<br/><u><strong>' +
				id2class(v.parent_class_id) + '</strong></u>'
		});
	}
	clear_selection();
	$ni.data("@net", v).find(".edit-button").click(function(ev){edit_network($ni, ev)});
	add_address_link($ni);
	return $ni;
}

function remove_net_link($li, p)
{
	var $all_a = $li.find("a.show-net");
	var $main_a = $li.find("a.show-net.without-free");
	$all_a.unbind("click");
	$all_a.click(function (ev) {
		$main_a.find("span.ui-icon").removeClass("ui-icon-carat-1-n");
		$main_a.find("span.ui-icon").addClass("ui-icon-carat-1-e");
		$main_a.closest("li").find("div.networks").slideUp("fast", function () { $(this).remove() });
		ev.preventDefault();
		ev.stopPropagation();
		clear_selection();
		add_net_link($li, p);
	});
}

function add_address_link($li)
{
	var v = $li.data("@net");
	var $el = $li.find("a.address-link");
	$el.unbind("click");
	clear_selection();
	if (v.free == 1) {
		$el.click(function(ev) {
			ev.preventDefault();
			ev.stopPropagation();
			add_network($li);
		});
	} else {
		$el.click(function(ev) {
			no_click_action($el);
			ev.preventDefault();
			ev.stopPropagation();
			remote({what: "paginate", net: v.net}, function (res) {
				var $pages = gen_address_pages(v, res);
				$pages.find("div.address-list").hide();
				$li.after($pages);
				$li.data("$pages", $pages);
				$pages.find("div.address-list").slideDown("fast");
				remove_address_link($li, $pages);
			});
		});
	}
}

function remove_address_link($li, $pages)
{
	var $el = $li.find("a.address-link");
	$el.unbind("click");
	$el.click(function (ev) {
		clear_selection();
		$pages.find("div.address-list").slideUp("fast", function () { $pages.remove() });
		ev.preventDefault();
		ev.stopPropagation();
		add_address_link($li);
	});
}

function edit_network($li, ev)
{
	clear_selection();
	ev.preventDefault();
	ev.stopPropagation();
	var $edit_icon = $(ev.target);
	$edit_icon.unbind("click");
	var v = $li.data("@net");
	var form = '<tr><td colspan="3"><div class="network-edit"><form class="network-edit-form">' +
		'<div class="edit-header">Editing network ' + v.net + '</div><div class="edit-form">' +
		'<table><tr><td class="label">Class:</td><td>' +
		gen_class_input(v.class_id) + '</td></tr><tr><td class="label">Description:</td><td>' +
		'<input type="text" size="64" maxlength="256" class="network-description"/>' +
		'</td></tr><tr><td class="label">Integration data:</td><td>' +
		'<input type="text" size="32" maxlength="256" class="network-integration"/>' +
		'</td></tr></table><p>' +
		"<input class='ok-button' type='image' src='images/notification_done.png' title='Save'/> " +
		"<input class='cancel-button' type='image' src='images/notification_error.png' title='Cancel'/> &nbsp; &nbsp; " +
		"<input class='history-button' type='image' src='images/clock.png' title='History'/> &nbsp; &nbsp; " +
		"<input class='remove-button' type='image' src='images/notification_remove.png' title='Remove'/>";
	if (v.merge_with)
		form += "&nbsp;&nbsp;<input class='merge-button' type='image' src='images/load_download.png' title='Merge with " +
		v.merge_with + "'/>";
	form += '</p></div></form></div></td></tr>';
	var $form = $(form);
	$form.find("div.edit-header").hide();
	$form.find(".network-description").val(v.descr);
	$form.find(".network-integration").val(v.integration);
	// $li.find(".button-form").after($form);
	$li.after($form);
	$form.find("div.edit-header").slideDown("fast", function () {
		$form.find(".network-description").focus().select();
	});
	$li.data("$form", $form);
	var remove_form = function(e2) {
		e2.preventDefault();
		e2.stopPropagation();
		$edit_icon.unbind("click");
		$form.find("div.edit-header").slideUp("fast", function() { $form.remove(); });
		$edit_icon.click(function(ev){edit_network($li, ev)});
	}
	$(ev.target).click(remove_form);
	$form.find(".cancel-button").click(remove_form);
	$form.find(".ok-button").click(function (e) { submit_edit_network(e, $li, $form); });
	$form.find(".history-button").click(function(e) { show_network_history(e, $form.find("div.network-edit"), $li.data("@net").net, true); });
	$form.find(".remove-button").click(function(e) { submit_remove_network(e, $li, $form); });
	$form.find(".merge-button").click(function(e) { submit_merge_network(e, $li, $form); });
}

function gen_class_input(selected_id)
{
	var r = "<select class='network-class'>";
	var res = $(document).data("@classes");
	var n = res.length;
	for (var i = 0; i < n; i++) {
		var v = res[i];
		var o = '<option value="' + v.id + '"';
		if (v.id == selected_id) o += ' selected';
		o += '>' + v.name + '</option>';
		r += o;
	}
	return r + "</select>";
}

function id2class(id)
{
	var cl = $(document).data("@classes");
	var n = cl.length;
	for (var i = 0; i < n; i++) {
		if (cl[i].id == id)
			return cl[i].name;
	}
	return "???";
}

function gen_address_pages(ni, res)
{
	var $pages = $("<tr><td colspan='3'>" +
		"<div class='address-list'>" +
		"<table class='address-pages address-pages-top'></table>" +
		"<div class='addresses'></div>" +
		"<table class='address-pages address-pages-bottom'></table>" +
		"</div></td></tr>");
	var $tr;
	var n = res.length;
	var $fa;
	for (var i = 0; i < n; i++) {
		var v = res[i];
		if (i % 8 == 0)
			$tr = $("<tr></tr>");
		var $td = $("<td><a href='#' class='address-range'>" + v.base + "-" + v.last + "</a></td>");
		if (i == 0) $fa = $td.find("a");
		add_address_page_switch_link($pages, $td.find("a"), v.base + "/" + v.bits, v.base + "-" + v.last);
		$tr.append($td);
		if (i % 8 == 7 || i == n-1) {
			if (i / 8. <= 1) {
				var buttons = "<td valign='top'>";
				if (_SERVER_CAPS.split)
					buttons += button_icon("clip-mode", "scissors", "Split mode");
				if (_SERVER_CAPS.edit_range)
					buttons += button_icon("edit-range", "copy", "Edit range of IPs");
				if (_SERVER_CAPS.edit_range_list)
					buttons += button_icon("edit-range-list", "script", "Fill-in range of IPs from a list");
				buttons += '</td>';
				$tr.append($(buttons));
			} else {
				$tr.append($("<td></td>"));
			}
			$pages.find("table.address-pages-top").append($tr);
			$pages.find("table.address-pages-bottom").append($tr.clone(true));
		}
	}
	$pages.find(".clip-mode").data("clip-mode", false);
	add_split_mode_link($pages);
	add_edit_range($pages, ni);
	add_edit_range_list($pages, ni);
	show_addresses($pages, res[0].base + "/" + res[0].bits, res[0].base + "-" + res[0].last);
	return $pages;
}

function add_address_page_switch_link($pages, $a, net, range)
{
	$a.click(function(e) {
		e.preventDefault();
		e.stopPropagation();
		show_addresses($pages, net, range);
	});
}

function add_edit_range($pages, ni)
{
	$pages.find(".edit-range").click(function (ev) {
		clear_selection();
		ev.preventDefault();
		ev.stopPropagation();
		var $form = $pages.find(".edit-range-form");
		if ($form.length > 0) {
			$form.slideUp("fast", function () { $form.remove(); });
			return;
		}
		$form = $('<div class="edit-range-form"><form>' +
			'<div class="edit-header">Editing range of IPs within ' + ni.net + '</div>' +
			'<div class="edit-form">' +
			'<table>' +
			'<tr><td class="label">Range start:</td><td>' + 
			'<input type="text" size="16" maxlength="256" class="ip_start"/></td></tr>' +
			'<tr><td class="label">Range end:</td><td>' + 
			'<input type="text" size="16" maxlength="256" class="ip_end"/></td></tr>' +
			'<tr><td class="info" colspan="2">' +
			'In the following fields you can designate parts of the text<br/>' +
			'that will undergo autoincrementing by using the <strong>"[[]]"</strong> construct,<br/>' +
			'for example: <strong>somehost[[010]].somedomain.com</strong> will become<br/>' +
			'somehost<strong>010</strong>.somedomain.com, somehost<strong>011</strong>.somedomain.com etc.' +
			'</td></tr>' + 
			'<tr><td class="label">Description:</td><td>' + 
			'<input type="text" size="64" maxlength="256" class="ip-description"/></td></tr>' +
			'<tr><td class="label">Hostname:</td><td>' + 
			'<input type="text" size="60" maxlength="256" class="ip-hostname"/></td></tr>' +
			'<tr><td class="label">Location:</td><td>' + 
			'<input type="text" size="32" maxlength="256" class="ip-location"/></td></tr>' +
			'<tr><td class="label">Contact phone:</td><td>' + 
			'<input type="text" size="16" maxlength="256" class="ip-phone"/></td></tr>' +
			'<tr><td class="label">Owner/responsible:</td><td>' + 
			'<input type="text" size="32" maxlength="256" class="ip-owner"/></td></tr>' +
			'<tr><td class="label">Comments:</td><td>' + 
			'<textarea rows=6 cols=64 class="ip-comments"></textarea></td></tr>' +
			'</table>' +
			'<p>' +
			"<input class='ok-button' type='image' src='images/notification_done.png' title='Save'/> " +
			"<input class='cancel-button' type='image' src='images/notification_error.png' title='Cancel'/> &nbsp; &nbsp; " +
			"<input class='remove-button' type='image' src='images/notification_remove.png' title='Remove'/></p>" +
			'</div>' +
			'</form></div>');
		$form.hide();
		$form.find(".ip_start").val(ni.second);
		$form.find(".ip_end").val(ni.next_to_last);
		$pages.find(".address-list").prepend($form);
		$form.slideDown("fast", function () {
			$form.find(".ip_start").focus().select();
		});
		$form.find(".cancel-button").click(function (e) {
			e.preventDefault();
			e.stopPropagation();
			$form.slideUp("fast", function () { $(this).remove() });
		});
		$form.find(".ok-button").click(function (e) { submit_edit_ip_range(e, $form); });
		$form.find(".remove-button").click(function(e) { submit_remove_ip_range(e, $form); });
	});
}

function add_edit_range_list($pages, ni)
{
	$pages.find(".edit-range-list").click(function (ev) {
		clear_selection();
		ev.preventDefault();
		ev.stopPropagation();
		var $form = $pages.find(".edit-range-form");
		if ($form.length > 0) {
			$form.slideUp("fast", function () { $form.remove(); });
			return;
		}
		$form = snippet("edit-range-list-dialog", {
			net     : ni.net,
			ip_start: ni.second,
			ip_end  : ni.next_to_last
		}).hide();
		$pages.find(".address-list").prepend($form);
		$form.slideDown("fast", function () {
			$form.find(".ip_start").focus().select();
		});
		$form.find(".cancel-button").click(function (e) {
			e.preventDefault();
			e.stopPropagation();
			$form.slideUp("fast", function () { $(this).remove() });
		});
		$form.find(".ok-button").click(function (e) { submit_edit_ip_range_list(e, $form); });
	});
}

function submit_edit_ip_range(ev, $form)
{
	e.preventDefault();
	e.stopPropagation();

	var $descr    = $form.find(".ip-description");
	var $hostname = $form.find(".ip-hostname");
	var $location = $form.find(".ip-location");
	var $phone    = $form.find(".ip-phone");
	var $owner    = $form.find(".ip-owner");
	var $comments = $form.find(".ip-comments");

	if ($descr.val() == "" && $hostname.val() == "") {
		$descr.effect("bounce", {direction: "left"});
		$hostname.effect("bounce", {direction: "left"});
		return carp("Either a description or a hostname or both must be given", $descr);
	}
	var ip = $form.data("@ip");

	remote({
		what:		"edit-ip",
		ip:			ip,
		descr:		$descr.val(),
		hostname:	$hostname.val(),
		location:	$location.val(),
		phone:		$phone.val(),
		owner:		$owner.val(),
		comments:	$comments.val()
	}, function (res) {
		message(res.msg);
		var $tr = $form.closest("tr.ip-info");
		var $descr = $form.closest("td.description");
		$form.slideUp("fast", function () {
			$(this).remove();
			$descr.html(ip_description(res));
			$tr.effect("highlight", {}, 3000);
		});
	});
}

function submit_remove_ip_range(ev, $form)
{
}

function submit_edit_ip_range_list(ev, $form)
{
}

function add_split_mode_link($pages)
{
	$pages.find(".clip-mode").data("clip-mode", false).click(function(ev) {
		clear_selection();
		ev.preventDefault();
		ev.stopPropagation();
		var clip_mode = $pages.find(".clip-mode").data("clip-mode");
		$pages.find(".clip-mode").data("clip-mode", !clip_mode);
		set_clip_mode($pages);
	});
}

function set_clip_mode($pages)
{
	var $tr = $pages.find("table.addresses tr").filter(function() {
		var $tr = $(this);
		var $td = $tr.find("td.ip");
		if ($td.length < 1)
			return false;
		var $a = $td.find("a.ip");
		if ($a.length < 1)
			return false;
		return true;
	});
	var clip_mode = $pages.find(".clip-mode").data("clip-mode");
	if (clip_mode) {
		$tr.find("td.ip").prepend($('<a class="clip-here" href="#" title="Split net here">' +
			'<span class="form-icon ui-icon ui-icon-scissors"></span></a>'));
		$tr.find(".clip-here").click(function(e) {
			e.preventDefault();
			e.stopPropagation();
			var ip = $(e.target).closest("td.ip").find("a.ip").text();
			remote({what: "split", ip: ip}, function (res) {
				var msg = "<p>Network <strong>" + res.o + "</strong> will be split into the following:</p><p class='netlist'>";
				var n = res.n.length;
				for (var i = 0; i < n; i++) {
					var v = res.n[i];
					msg += v + "<br/>";
				}
				msg += "</p><p>Are you sure you want to proceed?</p>";
				if (res.extra_msg != "")
					msg += inline_alert(res.extra_msg).html();
				ask(msg, function () {
					remote({what: "split", ip: ip, confirmed: 1}, function (res) {
						message(res.msg);
						var $tr = $pages.prev("tr.network");
						$pages.remove();
						replace_networks($tr, res);
					});
				});
			});
		});
	} else {
		$tr.find(".clip-here").remove();
	}
}

function show_addresses($pages, net, range)
{
	var $div = $pages.find(".addresses");
	remote({what: "addresses", net: net}, function (res) {
		var $new_div = $("<div class='addresses'><table class='addresses'></table></div>");
		var n = res.length;
		for (var i = 0; i < n; i++) {
			var v = res[i];
			var $tr = $("<tr class='ip-info'><td class='ip'><a class='ip' href='#'>" + v.ip +
				"</a></td><td class='description'>" + ip_description(v) +
				"</td></tr>");
			$new_div.find("table").append($tr);
		}
		$new_div.find('tr:nth-child(even)').addClass('alt-row');
		$div.replaceWith($new_div);
		$pages.find("table.address-pages").find("td").removeClass("selected");
		$pages.find("table.addresses").unbind("click").click(edit_ip);
		$pages.find("a.address-range:contains('" + range + "')").parent().addClass("selected");
		set_clip_mode($pages);
	});
}

function edit_ip(ev)
{
	var $t = $(ev.target);
	if ($t.is("a.ip") && $t.parent().is("td.ip")) {
		clear_selection();
		ev.preventDefault();
		ev.stopPropagation();
		var $form_td = $t.parent().parent().find("td.description:first");
		var $div = $form_td.find("div.ip-net:first");
		if ($div.is("div")) {
			$div.slideUp("fast", function () { $(this).remove(); edit_ip_main($t, $form_td); });
		} else {
			edit_ip_main($t, $form_td);
		}
	} else if (($t.is("a.show-net") && $t.parent().is("td.ip")) ||
			   ($t.parent().is("a.show-net") && $t.parent().parent().is("td.ip"))) {
		clear_selection();
		ev.preventDefault();
		ev.stopPropagation();

		if (!$t.is("a.show-net"))
			$t = $t.parent();
		var ip = $t.parent().parent().find("a.ip").text();
		var $form_td = $t.parent().parent().find("td.description");
		var $div = $form_td.find("div.ip-edit");
		if ($div.is("div")) {
			$div.slideUp("fast", function () { $(this).remove() });
		}
		$div = $form_td.find("div.ip-net");
		if ($div.is("div")) {
			$div.slideUp("fast", function () { $(this).remove() });
		} else {
			remote({what: "ip-net", ip: ip},
			function (res) {
				var $div = $("<div class='ip-net'></div>");
				var $tab  = $("<table class='networks'></table>");
				$div.hide().append($tab);
				$tab.append(insert_network(res));
				$tab.find('tr.network:nth-child(even)').addClass('alt-row');
				$form_td.append($div);
				$div.slideDown("fast");
			});
		}
	}
}

function edit_ip_main($t, $form_td)
{
	var $div = $form_td.find("div.ip-edit:first");
	if ($div.is("div")) {  // XXX must be a better way!
		$div.slideUp("fast", function () { $(this).remove() });
	} else {
		var ip = $t.text();
		var $form = snippet('ip-edit-dialog', { ip : ip }).hide();
		$form.data("@ip", ip);
		fetch_ip_info($form, ip);
		$form_td.append($form);
		$form.slideDown("fast", function () {
			$form.find(".ip-description").focus().select();
		});
		$form.find(".cancel-button").click(function (e) {
			e.preventDefault();
			e.stopPropagation();
			$form.slideUp("fast", function () { $(this).remove() });
		});
		$form.find(".ok-button").click(function (e) { submit_edit_ip(e, $form); });
		$form.find(".history-button").click(function(e) { show_ip_history(e, $form, $form.data("@ip"), true); });
		$form.find(".remove-button").click(function(e) { submit_remove_ip(e, $form); });
		$form.find('.nslookup').click(function (ev) {
			ev.preventDefault();
			ev.stopPropagation();
			remote({what: "nslookup", ip: $form.data("@ip")}, function (res) {
				$form.find(".ip-hostname").val(res.host).effect("highlight", {}, 2000);
			});
		});
	}
}

function submit_edit_ip(e, $form)
{
	e.preventDefault();
	e.stopPropagation();

	var $descr    = $form.find(".ip-description");
	var $hostname = $form.find(".ip-hostname");
	var $location = $form.find(".ip-location");
	var $phone    = $form.find(".ip-phone");
	var $owner    = $form.find(".ip-owner");
	var $comments = $form.find(".ip-comments");

	if ($descr.val() == "" && $hostname.val() == "") {
		$descr.effect("bounce", {direction: "left"});
		$hostname.effect("bounce", {direction: "left"});
		return carp("Either a description or a hostname or both must be given", $descr);
	}
	var ip = $form.data("@ip");

	remote({
		what:		"edit-ip",
		ip:			ip,
		descr:		$descr.val(),
		hostname:	$hostname.val(),
		location:	$location.val(),
		phone:		$phone.val(),
		owner:		$owner.val(),
		comments:	$comments.val()
	}, function (res) {
		message(res.msg);
		var $tr = $form.closest("tr.ip-info");
		var $descr = $form.closest("td.description");
		$form.slideUp("fast", function () {
			$(this).remove();
			$descr.html(ip_description(res));
			$tr.effect("highlight", {}, 3000);
		});
	});
}

function submit_remove_ip(e, $form)
{
	e.preventDefault();
	e.stopPropagation();

	var ip = $form.data("@ip");
	ask("All information about<br/>IP address " + ip + "<br/>will be deleted!",
		function () {
			remote({
				what:		"edit-ip",
				ip:			ip,
				descr:		"",
				hostname:	"",
				location:	"",
				phone:		"",
				owner:		"",
				comments:	""
			}, function (res) {
				message(res.msg);
				var $tr = $form.closest("tr.ip-info");
				var $descr = $form.closest("td.description");
				$form.slideUp("fast", function () {
					$(this).remove();
					$descr.html(ip_description(res));
					$tr.effect("highlight", {}, 3000);
				});
			});
	});
}

function submit_remove_network(e, $li, $form)
{
	e.preventDefault();
	e.stopPropagation();

	var v = $li.data("@net");
	ask("All information about<br/>network " + v.net + "<br/>and IP addresses associated" +
		"<br/>with it will be deleted!",
		function () {
			remote({
				what:		"remove-net",
				id:			v.id
			}, function (res) {
				message(res.msg);
				$form.remove();
				var $pages = $li.next('tr');
				if ($pages.find("div.address-list").length > 0) {
					$pages.find("div.address-list").slideUp("fast", function () { $pages.remove() });
				}
				$li.remove();
			});
		});
}

function show_ip_history(e, $form, ip, with_fill_in, special_date)
{
	e.preventDefault();
	e.stopPropagation();
	var $hist = $form.find("div.history");
	if ($hist.length > 0) {
		$hist.slideUp("fast", function () { $(this).remove() });
	} else {
		remote({ what: "ip-history", ip: ip }, function (res) {
			var $history = $("<div class='history ip-history'><table class='history'>" +
				"<tr><th>From</th><th>Until</th><th>Description</th>" +
				"<th>Who</th><th></th></tr></table></div>");
			var $tab = $history.find("table.history");
			var fill_in = "";
			if (with_fill_in) {
				fill_in = '<a class="fill-in" href="#" title="Use this info">' +
					'<span class="form-icon ui-icon ui-icon-copy"></span></a>';
			}
			var n = res.length;
			for (var i = 0; i < n; i++) {
				var v = res[i];
				var $tr = $(
					"<tr><td class='date'>" + date_format(v.created) +
					"</td><td class='date'>" + date_format(v.invalidated, "still valid") +
					"</td><td class='description'>" + ip_description(v) +
					"</td><td class='who'>" + v.created_by +
					"</td><td class='actions'>" + fill_in +
					"</td></tr>");
				if (special_date && special_date >= v.created && special_date - v.created <= 2)
					$tr.addClass("special");
				if (with_fill_in)
					$tr.find("a.fill-in").data("@ip", v).click(function (e) {
						e.preventDefault();
						e.stopPropagation();
						var $a = $(e.target).closest("a.fill-in");
						var ip = $a.data("@ip");
						$form.effect("highlight", {}, 1000);
						$form.find(".ip-description").val(ip.descr);
						$form.find(".ip-hostname").val(ip.hostname);
						$form.find(".ip-location").val(ip.location);
						$form.find(".ip-phone").val(ip.phone);
						$form.find(".ip-owner").val(ip.owner);
						$form.find(".ip-comments").val(ip.comments);
					});
				$tab.append($tr);
			}
			$history.hide();
			$history.find('tr:nth-child(odd)').not('tr:first').addClass('alt-row');
			$form.append($history);
			$history.slideDown("fast");
		});
	}
}

function fetch_ip_info($form, ip)
{
	remote({what: "get-ip", ip: ip}, function (v) {
		$form.find(".ip-description").val(v.descr);
		$form.find(".ip-hostname").val(v.hostname);
		$form.find(".ip-location").val(v.location);
		$form.find(".ip-phone").val(v.phone);
		$form.find(".ip-owner").val(v.owner);
		$form.find(".ip-comments").val(v.comments);
	});
}

function submit_edit_network(e, $ni, $form)
{
	e.preventDefault();
	e.stopPropagation();
	var $descr = $form.find(".network-description");
	var $integration = $form.find(".network-integration");
	if ($descr.val().length < 6) {
		$descr.effect("bounce", {direction: "left"});
		return carp("Network description is too short", $descr);
	}
	var $cl = $form.find(".network-class");
	var v = $ni.data("@net");

	remote({
		what:		"edit-net",
		id:			v.id,
		class_id:	$cl.val(),
		descr:		$descr.val(),
		integration:    $integration.val()
	}, function (res) {
		message(res.msg);
		var $new_ni = insert_network(res);
		$form.remove();
		$ni.replaceWith($new_ni);
		var $tab = $new_ni.closest("table.networks");
		$tab.find('tr.network').removeClass('alt-row');
		$tab.find('tr.network:nth-child(even)').addClass('alt-row');
		$new_ni.effect("highlight", {}, 3000);
	});
}

function submit_merge_network(e, $ni, $form)
{
	e.preventDefault();
	e.stopPropagation();
	var v = $ni.data("@net");
	if (!v.merge_with)
		return carp("Merge error", "Don't know what networks to merge");

	var msg = "<p>Network <strong>" + v.net + "</strong> will be merged with " +
		"<strong>" + v.merge_with + "</strong></p>" +
		"<p>Are you sure you want to proceed?</p>";
	ask(msg, function () {
		remote({
			what:		"merge-net",
			id:			v.id,
			merge_with:	v.merge_with
		}, function (res) {
			message(res.msg);
			var $new_ni = insert_network(res);
			$form.remove();
			var $pages = $ni.data("$pages");
			if ($pages) $pages.remove();
			$ni.replaceWith($new_ni);
			var $tab = $new_ni.closest("table.networks");
			$tab.find('tr.network').removeClass('alt-row');
			$tab.find('tr.network:nth-child(even)').addClass('alt-row');
			var $another = $tab.find('a.address-link:contains(' + v.merge_with + ')').closest('tr.network');
			if ($another.length > 0) {
				var $af = $another.data("$form");
				if ($af) $af.remove();
				var $ap = $another.data("$pages");
				if ($ap) $ap.remove();
				$another.remove();
			}
			$new_ni.effect("highlight", {}, 3000);
		});
	});
}

function snippet(name, data)
{
	return $("#" + name).children().autoRender(data).clone();
}

function carp(err, $descr)
{
	// XXX When I close it by pressing Escape, $descr does not get the focus.
	//     Maybe I should employ a timeout message of some sort.
	loading(false);
	$("<div title='Error'><p>" + err + "</p></div>").dialog({
		autoOpen:	true,
		modal:		true,
		width:		600,
		buttons:	{ Ok: function () { $(this).dialog('close'); } },
		close:		function () { if ($descr) $descr.focus(); }
	});
	return false;
}

function ask(msg, callback)
{
	$("<div title='Confirmation'><p>" + msg + "</p></div>").dialog({
		autoOpen:	true,
		modal:		true,
		width:		400,
		buttons:	{ Ok: function () { $(this).dialog('close'); callback(); },
					  Cancel: function () { $(this).dialog('close'); }}
	});
}

function show_network_history(e, $form, net, with_fill_in, special_date)
{
	e.preventDefault();
	e.stopPropagation();

	var $hist = $form.find("div.history");
	if ($hist.length > 0) {
		$hist.slideUp("fast", function () { $(this).remove() });
	} else {
		remote({ what: "net-history", net: net }, function (res) {
			var $history = snippet('network-history-table', {});
			var $tab = $history.find("table.history");
			var n = res.length;
			var fill_in = "";
			if (with_fill_in) {
				fill_in = '<a class="fill-in" href="#" title="Use this info">' +
					'<span class="form-icon ui-icon ui-icon-copy"></span></a>';
			}
			for (var i = 0; i < n; i++) {
				var v = res[i];
				var $tr = snippet('network-history-row', {
					created:     date_format(v.created),
					invalidated: date_format(v.invalidated, "still valid"),
					class_name:  v.class_name,
					description: linkify(v.descr),
					who:         v.created_by,
					actions:     fill_in
				});
				if (special_date && special_date >= v.created && special_date - v.created <= 2) {
					$tr.addClass("special");
				}
				if (with_fill_in)
					$tr.find("a.fill-in").data("@net", v).click(function (e) {
						e.preventDefault();
						e.stopPropagation();
						var $a = $(e.target).closest("a.fill-in");
						var net = $a.data("@net");
						$form.effect("highlight", {}, 1000);
						$form.find(".network-description").val(net.descr);
						$form.find(".network-class").val(net.class_id);
					});
				$tab.append($tr);
			}
			$history.hide();
			$history.find('tr:nth-child(odd)').not('tr:first').addClass('alt-row');
			$form.append($history);
			$history.slideDown("fast");
		});
	}
}

function ip_description(ip)
{
	if (ip.hostname && ip.hostname.length > 0 && ip.descr && ip.descr.length > 0)
		return linkify(ip.hostname + ": " + ip.descr);
	if (ip.hostname && ip.hostname.length > 0)
		return linkify(ip.hostname);
	if (ip.descr && ip.descr.length > 0)
		return linkify(ip.descr);
	return "";
}

function date_format(epoch, msg)
{
	if (epoch == 0)
		return msg;
	if (epoch < 0)
		return "not known";
	var d = new Date();
	d.setTime(epoch * 1000);
	var y = d.getFullYear();
	var m = d.getMonth()+1;
	if (m < 10) m = "0" + m;
	var day = d.getDate();
	if (day < 10) day = "0" + day;
	var h = d.getHours();
	if (h < 10) h = "0" + h;
	var min = d.getMinutes();
	if (min < 10) min = "0" + min;

	return y + "-" + m + "-" + day + " " + h + ":" + min;
}

function is_net_ok(net)
{
	if (net.match(/^(\d+\.\d+\.\d+\.\d+\/\d+)$/)) {
		return true;
	} else if (net.match(/^([\da-fA-F]+(:[\da-fA-F]+){7}\/\d+)$/)) {
		return true;
	} else if (net.match(/^([\da-fA-F]+(:[\da-fA-F]+)*::\/\d+)$/)) {
		return true;
	}
	return false;
}

function inline_alert(msg)
{
	return snippet("inline-alert", { msg : msg });
}

function button_icon(cl, icon, title)
{
	return '<button class="form-icon ' + cl +
		'" title="' + title + '">' +
		'<span class="ui-icon ui-icon-' + icon +
		'"></span></button>';
}

function no_click_action($el)
{
	$el.unbind("click");
	$el.click(function (ev) {
		ev.preventDefault();
		ev.stopPropagation();
	});
}

function message(msg)
{
	if (msg) show_status(msg, 3000);
}

function loading(on)
{
	if (typeof _statusbar == "undefined")
		return;
	if (on)
		_statusbar.addClass("loader");
	else
		_statusbar.removeClass("loader");
}

function show_status(message,timeout,add)
{        
	if (typeof _statusbar == "undefined") {
		// ** Create a new statusbar instance as a global object
		_statusbar = 
			$("<div id='_statusbar' class='statusbar'><div id='status-area'>status</div><div id='login-name'>Welcome</div></div>")
			.appendTo(document.body)                   
			.show();
		_status_area = $("#status-area");
	}

	if (add)              
		// *** add before the first item    
		_status_area.prepend( "<div style='margin-bottom: 2px;' >" + message + "</div>")[0].focus();
	else    
		_status_area.text(message)

	_statusbar.show();        

	if (timeout) {
		_statusbar.addClass("statusbarhighlight");
		_statusbar.removeClass("statusbarhighlight", timeout);
	}                
}

function remote(args, func)
{
	loading(true);
	args.ver = _VER;
	$.post(_URL, args, function (r) {
		if (r.error) return carp(r.error);
		func(r); loading(false);
	}, "json");
}

function clear_selection()
{
	$("#select-menu").remove();
//	$(".ui-selected").removeClass("ui-selected");
}

function linkify(t)
{
	if (t == "")	return t;
	var n = _LINKIFY.length;
	for (var i = 0; i < n; i++) {
		var l = _LINKIFY[i];
		t = t.replace(new RegExp(l.match), "<a class='linkified' target='_blank' href='" + l.url + "'>$1</a>");
	}
	return t;
}
