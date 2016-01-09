/*
 * The contents of this file are subject to the OpenMRS Public License
 * Version 2.0 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://license.openmrs.org
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
 * License for the specific language governing rights and limitations
 * under the License.
 *
 * Copyright (C) OpenMRS, LLC.  All Rights Reserved.
 */
define(openhmis.url.backboneBase + "js/openhmis",
	[
		openhmis.url.backboneBase + 'js/lib/jquery',
		openhmis.url.backboneBase + 'js/lib/underscore',
		openhmis.url.backboneBase + 'js/lib/backbone',
		openhmis.url.backboneBase + 'js/lib/i18n',
		openhmis.url.backboneBase + 'js/lib/backbone-forms'
	],
	function($, _, Backbone, __) {

		// Use <? ?> for template tags.
		_.templateSettings = {
			evaluate:  /<\?(.+?)\?>/g,
			interpolate: /<\?=(.+?)\?>/g
		};
		
		var openhmis = window.openhmis || {};
		openhmis.templates = {};
		
		openhmis.url.getPage = function (moduleBaseName) {
			return openhmis.url.page + openhmis.url[moduleBaseName];
		};

		//TODO: Better system for identifying specific errors
		openhmis.error = function (model, resp) {
			var handleErrorResp = function (resp) {
				var o = (typeof resp === "string") ? $.parseJSON(resp).error : resp;
				if (o.detail.indexOf("ContextAuthenticationException") !== -1) {
					alert(__("Your session has timed out.  You will be redirected to the login page."));
					window.location.reload();
				}
				else if (o.detail.indexOf("AccessControlException") !== -1) {
					if (o.detail.indexOf("refund") !== -1) {
						alert(__("The total of the bill is negative and you do not have the required privileges to process a refund.\n\nPlease contact your supervisor about processing refunds."));
					}
					else if (o.detail.indexOf("adjust") !== -1) {
						alert(__("You do not have the required privileges to adjust a bill.\n\nPlease contact your supervisor about adjusting a bill."));
					}
				}
				else if (o.message.indexOf("no rounding item ID") !== -1) {
					alert(__(o.message + "\n\nPlease specify a rounding item or disable rounding."));
				}
				else {
					var firstLfPos = o.detail.indexOf('\n');
					if (firstLfPos !== -1)
						o.detail = o.detail.substring(0, firstLfPos);
					alert('An error occurred during the request.\n\n' + o.message + '\n\nCode: ' + o.code + '\n\n' + o.detail);
				}
			};

			if (!(model instanceof Backbone.Model)) {
				if (model.responseText)
					handleErrorResp(model.responseText);
				else
					handleErrorResp(model);
			} else if (resp !== undefined) {
				handleErrorResp(resp.responseText);
				//var str = "";
				//for (var i in resp) {
				//	if (str.length > 0) str += ",\n";
				//	str += i + ": " + resp[i];
				//}
				//alert(str);
			}
		};

		openhmis.getQueryStringParameter = function (name) {
			name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
			var regexS = "[\\?&]" + name + "=([^&#]*)";
			var regex = new RegExp(regexS);
			var results = regex.exec(window.location.search);
			if (results == null)
				return "";
			else
				return decodeURIComponent(results[1].replace(/\+/g, " "));
		};

		openhmis.addQueryStringParameter = function (queryString, parameter) {
			return queryString ? queryString + "&" + parameter : parameter;
		};

		openhmis.padZero = function (n) {
			return n < 10 ? "0" + n : n;
		};

		openhmis.pad2Zeros = function (n) {
			if (n < 100) n = '0' + n;
			if (n < 10) n = '0' + n;
			return n;
		};

		openhmis.dateFormat = function (date, includeTime) {
			var padZero = openhmis.padZero;
			var day = date.getDate();
			var month = date.getMonth() + 1;
			var year = date.getFullYear();
			day = padZero(day);
			month = padZero(month);
			var strDate = day + '-' + month + '-' + year;
			if (includeTime === true) {
				strDate += " " + padZero(date.getHours())
					+ ":" + padZero(date.getMinutes());
			}
			return strDate;
		};

		openhmis.dateFormatLocale = function (date) {
			if (typeof date === "string") {
				date = new Date(date);
			}

			return date ? date.toLocaleDateString() : "";
		};

		openhmis.dateTimeFormatLocale = function (date) {
			if (typeof date === "string") {
				date = new Date(date);
			}

			return date ? date.toLocaleString() : "";
		};

		openhmis.iso8601Date = function (d) {
			var padZero = openhmis.padZero;
			var pad2Zeros = openhmis.pad2Zeros;
			return d.getUTCFullYear() + '-' + padZero(d.getUTCMonth() + 1) + '-' + padZero(d.getUTCDate()) + 'T' + padZero(d.getUTCHours()) + ':' + padZero(d.getUTCMinutes()) + ':' + padZero(d.getUTCSeconds()) + '.' + pad2Zeros(d.getUTCMilliseconds()) + '+0000';
		};

		openhmis.tryParsingFuzzyDate = function (fuzzyString) {
			var numberOfSomething = /^([0-9]+)\s?(\w+)(\s+.*)?$/;
			var matches = fuzzyString.match(numberOfSomething);
			var number;
			if (matches && matches[2] && !isNaN(number = parseInt(matches[1]))) {
				matches[1] = number;
				return matches;
			}
			return null;
		};

		openhmis.toFuzzyDate = function (seconds) {
			var timeChunks = [
				[31536000, __("year")],
				[604800, __("week")],
				[86400, __("day")]
			];
			for (var i in timeChunks) {
				var chunk = timeChunks[i]
				var numberOfChunks;
				if ((numberOfChunks = Math.floor(seconds / chunk[0])) >= 1) {
					var string = numberOfChunks === 1
						? __("%d %s", numberOfChunks, chunk[1])
						: __("%d %s", numberOfChunks, openhmis.pluralize(chunk[1]));
					var remainder = seconds % chunk[0];
					if (remainder > 0)
						return string + " " + openhmis.toFuzzyDate(remainder);
					else
						return string;
				}
			}
			return null;
		};

		openhmis.fromFuzzyDate = function (fuzzyString, carry) {
			var timeChunks = [
				["year", 31536000],
				["week", 604800],
				["day", 86400]
			];
			var matches = openhmis.tryParsingFuzzyDate($.trim(fuzzyString))
			if (matches) {
				for (var i in timeChunks) {
					var chunk = timeChunks[i];
					if (matches[2] === chunk[0] || matches[2] === (chunk[0] + "s")) {
						var seconds = matches[1] * chunk[1];
						if (matches[3])
							return openhmis.fromFuzzyDate(matches[3], seconds + (carry || 0));
						else
							return seconds + (carry || 0);
					}
				}
			}

			return carry;
		};

		openhmis.validationMessage = function (parentEl, message, inputEl) {
			if ($(parentEl).length > 1) parentEl = $(parentEl)[0];
			if ($(parentEl).find('.validation').length > 0) return;
			var prevPosition = $(parentEl).css("position");
			$(parentEl).css("position", "relative");
			var el = $('<div class="validation"></div>');
			el.text(message);
			$(parentEl).append(el);
			if (inputEl !== undefined) $(inputEl).focus();
			setTimeout(function () {
				$(el).remove();
				if (prevPosition !== "static")
					$(parentEl).css("position", prevPosition);
			}, 5000);
		};

		openhmis.round = function (val, nearest, mode) {
			nearest = nearest ? nearest : 1;
			if (nearest === 0) return val;
			var factor = 1 / nearest;
			switch (mode) {
				case 'FLOOR':
					return Math.floor(val * factor) / factor;
				case 'CEILING':
					return Math.ceil(val * factor) / factor;
				default:
					return Math.round(val * factor) / factor;
			}
		};

		openhmis.isNumeric = function (n) {
			return !isNaN(parseFloat(n)) && isFinite(n);
		};

		openhmis.toCamelCase = function (str, firstCapital) {
			firstCapital = firstCapital !== undefined ? firstCapital : false;
			str.replace(
				/\b(\S)(\S*)/g,
				function (match, first, rest) {
					return first.toUpperCase() + rest.toLowerCase();
				}
			);
			if (!firstCapital)
				str = str.charAt(0).toLowerCase() + str.substring(1);
			return str;
		};
		
		// Use uuid for id
		Backbone.Model.prototype.idAttribute = 'uuid';
		
		/**
		 * Template helper function
		 *
		 * Fetches a template from a remote URI unless it has been previously fetched
		 * and cached.
		 */
		Backbone.View.prototype.tmplFileRoot = openhmis.url.resources;
		Backbone.View.prototype.getTemplate = function(tmplFile, tmplSelector) {
			tmplFile = tmplFile ? tmplFile : this.tmplFile;
			tmplSelector = tmplSelector ? tmplSelector : this.tmplSelector;
			var view = this;
			if (openhmis.templates[tmplFile] === undefined) {
				var uri = view.tmplFileRoot === undefined ? tmplFile : view.tmplFileRoot + tmplFile;
				$.ajax({
					url: uri,
					async: false,
					dataType: "html",
					success: function(data, status, jq) {
						openhmis.templates[tmplFile] = $("<div/>").html(data);
					}
				});
			}

			var template = _.template($(openhmis.templates[tmplFile]).find(tmplSelector).html());
			var augmentedTemplate = function(context) {
				if (context !== undefined) {
					context.__ = context.__ ? context.__ : __;
					context.urls = context.urls ? context.urls : openhmis.url;
					context.helpers = context.helpers ? context.helpers : Backbone.Form.helpers
					context.pluralize = openhmis.pluralize;
				}

				return template.call(this, context);
			};

			return augmentedTemplate;
		};
		
		return openhmis;
	}
);
