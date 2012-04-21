/*

Heavily Modified by Diego 4/21/2012
Changes:

1) Removed lots and lots of bloat. Recoded many parts with jquery if possible.

2) Add a 'l-hilite' css class to the item attribute if its selected for sort. Just
change the css for a great highlighting while sorting feature.

3) Fixed bug where if item attribute does not exist, the entire sort fails. It now
auto defaults to ' ' single space if an attribute is missing.

4) This is only tested with existing list parsing. Adding/Removing/Editing is not testd.

5) Compatible with latest Chrome/IE/Firefox.


ListJS Beta 0.2.0
By Jonny Strömberg (www.jonnystromberg.com, www.listjs.com)

OBS. The API is not frozen. It MAY change!

License (MIT)

Copyright (c) 2011 Jonny Strömberg http://jonnystromberg.com

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without restriction,
including without limitation the rights to use, copy, modify, merge,
publish, distribute, sublicense, and/or sell copies of the Software,
and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/
(function( window, undefined ) {
    "use strict";
    var document = window.document,
        h;

    var List = function(id, options, values) {
        var self = this,
            templater,
            init,
            initialItems,
            Item,
            Templater,
            sortButtons,
            events = {
                'updated': []
            };
        this.listContainer = (typeof(id) == 'string') ? $('#'+id) : id;
        // Check if the container exists. If not return instead of breaking the javascript
        if (!this.listContainer)
            return;

        this.items = [];
        this.visibleItems = []; // These are the items currently visible
        this.matchingItems = []; // These are the items currently matching filters and search, regadlessof visible count
        this.searched = false;
        this.filtered = false;

        this.list = null;
        this.templateEngines = {};

        this.page = options.page || 200;
        this.i = options.i || 1;

        init = {
            start: function(values, options) {
                options.plugins = options.plugins || {};
                this.classes(options);
                templater = new Templater(self, options);
                this.callbacks(options);
                this.items.start(values, options);
                //self.update();
                this.plugins(options.plugins);
            },
            classes: function(options) {
                options.listClass = options.listClass || 'sort-list';
                options.searchClass = options.searchClass || 'sort-search';
                options.sortClass = options.sortClass || 'sort-sort';
            },
            callbacks: function(options) {
                self.list =  $(self.listContainer).find('.'+options.listClass);
                $(self.listContainer).find('.'+options.searchClass).on('keyup', self.search);
                sortButtons = $(self.listContainer).find('.'+options.sortClass)
                $(sortButtons).on('click',self.sort);
            },
            items: {
                start: function(values, options) {
                    if (options.valueNames) {
                        var itemsToIndex = this.get(),
                            valueNames = options.valueNames;
                        if (options.indexAsync) {
                            this.indexAsync(itemsToIndex, valueNames);
                        } else {
                            this.index(itemsToIndex, valueNames);
                        }
                    }
                    if (values !== undefined) {
                        self.add(values);
                    }
                },
                get: function() {
                    var nodes = self.list.children(),
                        items = [];
                    for (var i = 0, il = nodes.length; i < il; i++) {
                        // Only textnodes have a data attribute
                        if (nodes[i].data === undefined) {
                            items.push(nodes[i]);
                        }
                    }
                    return items;
                },
                index: function(itemElements, valueNames) {
                    for (var i = 0, il = itemElements.length; i < il; i++) {
                        self.items.push(new Item(valueNames, itemElements[i]));
                    }
                },
                indexAsync: function(itemElements, valueNames) {
                    var itemsToIndex = itemElements.splice(0, 100); // TODO: If < 100 items, what happens in IE etc?
                    this.index(itemsToIndex, valueNames);
                    if (itemElements.length > 0) {
                        setTimeout(function() {
                                init.items.indexAsync(itemElements, valueNames);
                            },
                            10);
                    } else {
                        self.update();
                        // TODO: Add indexed callback
                    }
                }
            },
            plugins: function(plugins) {
                for (var i = 0; i < plugins.length; i++) {
                    var pluginName = plugins[i][1].name || plugins[i][0];
                    self[pluginName] = new self.plugins[plugins[i][0]](self, plugins[i][1]);
                }
            }
        };




        this.show = function(i, page) {
            this.i = i;
            this.page = page;
            self.update();
        };



        /* Gets the objects in the list which
         * property "valueName" === value
         */
        this.get = function(valueName, value) {
            var matchedItems = [];
            for (var i = 0, il = self.items.length; i < il; i++) {
                var item = self.items[i];
                if (item.values()[valueName] == value) {
                    matchedItems.push(item);
                }
            }
            if (matchedItems.length == 0) {
                return null;
            } else if (matchedItems.length == 1) {
                return matchedItems[0];
            } else {
                return matchedItems;
            }
        };

        /* Sorts the list.
         * @valueOrEvent Either a JavaScript event object or a valueName
         * @sortFunction (optional) Define if natural sorting does not fullfill your needs
         */
        this.sort = function(valueName, options) {
            var length = self.items.length,
                value = null,
                target = valueName.target,
                sorting = '',
                isAsc = false,
                asc = 'l-asc',
                desc = 'l-desc',
                options = options || {};

            value = $(target).attr('data-sort');
            isAsc = $(target).hasClass(asc) ? false : true;


            //xing higlight the items been sorted
            $(".l-hilite").removeClass("l-hilite");
            $("."+value).addClass("l-hilite");

            for (var i = 0, il = sortButtons.length; i < il; i++) {
                $(sortButtons[i]).removeClass(asc);
                $(sortButtons[i]).removeClass(desc);

            }
            if (isAsc) {
                if (target !== undefined) {
                    $(target).addClass(asc);
                }
                isAsc = true;
            } else {
                if (target !== undefined) {
                    $(target).addClass(desc);
                }
                isAsc = false;
            }

            if (options.sortFunction) {
                options.sortFunction = options.sortFunction;
            } else {
                options.sortFunction = function(a, b) {
                    return h.sorter.alphanum(a.values()[value], b.values()[value], isAsc);
                };
            }

            self.items.sort(options.sortFunction);

            self.update();

        };

        /*
         * Searches the list after values with content "searchStringOrEvent".
         * The columns parameter defines if all values should be included in the search,
         * defaults to undefined which means "all".
         */
        this.search = function(searchString, columns) {
            self.i = 1; // Reset paging
            var matching = [],
                found,
                item,
                text,
                values,
                is,
                columns = (columns === undefined) ? self.items[0].values() : columns,
                searchString = (searchString === undefined) ? "" : searchString,
                target = searchString.target || searchString.srcElement; /* IE have srcElement */

            searchString = (target === undefined) ? (""+searchString).toLowerCase() : ""+target.value.toLowerCase();
            is = self.items;
            // Escape regular expression characters
            searchString = searchString.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

            templater.clear();
            if (searchString === "" ) {
                reset.search();
                self.searched = false;
                self.update();
            } else {
                self.searched = true;

                for (var k = 0, kl = is.length; k < kl; k++) {
                    found = false;
                    item = is[k];
                    values = item.values();

                    for(var j in columns) {
                        if(values.hasOwnProperty(j) && columns[j] !== null) {
                            text = (values[j] != null) ? values[j].toString().toLowerCase() : "";
                            if ((searchString !== "") && (text.search(searchString) > -1)) {
                                found = true;
                            }
                        }
                    }
                    if (found) {
                        item.found = true;
                        matching.push(item);
                    } else {
                        item.found = false;
                    }
                }
                self.update();
            }
            return self.visibleItems;
        };

        /*
         * Filters the list. If filterFunction() returns False hides the Item.
         * if filterFunction == false are the filter removed
         */
        this.filter = function(filterFunction) {
            self.i = 1; // Reset paging
            var matching = undefined;
            reset.filter();
            if (filterFunction === undefined) {
                self.filtered = false;
            } else {
                matching = [];
                self.filtered = true;
                var is = self.items;
                for (var i = 0, il = is.length; i < il; i++) {
                    var item = is[i];
                    if (filterFunction(item.values())) {
                        item.filtered = true;
                        matching.push(item);
                    } else {
                        item.filtered = false;
                    }
                }
            }
            self.update();
            return self.visibleItems;
        };

        /*
         * Get size of the list
         */
        this.size = function() {
            return self.items.length;
        };

        /*
         * Removes all items from the list
         */
        this.clear = function() {
            templater.clear();
            self.items = [];
        };

        this.on = function(event, callback) {
            events[event].push(callback);
        };

        var trigger = function(event) {
            var i = events[event].length;
            while(i--) {
                events[event][i]();
            }
        };

        var reset = {
            filter: function() {
                var is = self.items,
                    il = is.length;
                while (il--) {
                    is[il].filtered = false;
                }
            },
            search: function() {
                var is = self.items,
                    il = is.length;
                while (il--) {
                    is[il].found = false;
                }
            }
        };


        this.update = function() {
            var is = self.items,
                il = is.length;

            self.visibleItems = [];
            self.matchingItems = [];
            templater.clear();
            for (var i = 0; i < il; i++) {
                if (is[i].matching() && ((i+1) >= self.i && self.visibleItems.length < self.page)) {
                    is[i].show();
                    self.visibleItems.push(is[i]);
                    self.matchingItems.push(is[i]);
                } else if (is[i].matching()) {
                    self.matchingItems.push(is[i]);
                    is[i].hide();
                } else {
                    is[i].hide();
                }
            }
            trigger('updated');
        };

        Item = function(initValues, element, notCreate) {
            var item = this,
                values = {};

            this.found = false; // Show if list.searched == true and this.found == true
            this.filtered = false;// Show if list.filtered == true and this.filtered == true

            var init = function(initValues, element, notCreate) {
                if (element === undefined) {
                    if (notCreate) {
                        item.values(initValues, notCreate);
                    } else {
                        item.values(initValues);
                    }
                } else {
                    item.elm = element;
                    var values = templater.get(item, initValues);
                    item.values(values);
                }
            };
            this.values = function(newValues, notCreate) {
                if (newValues !== undefined) {
                    for(var name in newValues) {
                        values[name] = newValues[name];
                    }

                } else {
                    return values;
                }
            };
            this.show = function() {
                templater.show(item);
            };
            this.hide = function() {
                templater.hide(item);
            };
            this.matching = function() {
                return (
                    (self.filtered && self.searched && item.found && item.filtered) ||
                        (self.filtered && !self.searched && item.filtered) ||
                        (!self.filtered && self.searched && item.found) ||
                        (!self.filtered && !self.searched)
                    );
            };
            this.visible = function() {
                return (item.elm.parentNode) ? true : false;
            };
            init(initValues, element, notCreate);
        };

        /* Templater with different kinds of template engines.
         * All engines have these methods
         * - reload(item)
         * - remove(item)
         */
        Templater = function(list, settings) {
            if (settings.engine === undefined) {
                settings.engine = "standard";
            } else {
                settings.engine = settings.engine.toLowerCase();
            }
            return new self.constructor.prototype.templateEngines[settings.engine](list, settings);
        };

        init.start(values, options);
    };

    List.prototype.templateEngines = {};
    List.prototype.plugins = {};

    List.prototype.templateEngines.standard = function(list, settings) {
        var listSource = $(list.listContainer).find('.'+settings.listClass), //h.getByClass(settings.listClass, list.listContainer, true),
            itemSource = $('#'+settings.item), //getItemSource(settings.item),
            templater = this;

        /* Get values from element */
        this.get = function(item, valueNames) {

            var values = {};
            var t = '';
            for(var i = 0, il = valueNames.length; i < il; i++) {
                t = $(item.elm).find('.'+valueNames[i]).html();

                if(!t) {
                    t = ' ';
                }
                values[valueNames[i]] = t;
            }
            return values;
        };

        /* Sets values at element */
        this.set = function(item, values) {

            for(var v in values) {
                // TODO speed up if possible
                var elm = $(item.elm).find('.'+v);
                if (elm) {
                    $(elm).html(values[v]);
                }

            }
        };

        this.show = function(item) {
            listSource.append(item.elm);
        };
        this.hide = function(item) {
            if (item.elm !== undefined && $(item.elm).parent() === listSource) {
                listSource.remove(item.elm);
            }
        };
        this.clear = function() {
            listSource.empty();
        };
    };

    h = {

        sorter: {

            alphanum: function (a, b, asc) {

                if (a === undefined || a === null || a == ' ') {
                    a = '0';
                }
                if (b === undefined || b === null || b == ' ') {
                    b = '0';
                }


                var re = /(^-?[0-9]+(\.?[0-9]*)[df]?e?[0-9]?$|^0x[0-9a-f]+$|[0-9]+)/gi,
                    sre = /(^[ ]*|[ ]*$)/g,
                    dre = /(^([\w ]+,?[\w ]+)?[\w ]+,?[\w ]+\d+:\d+(:\d+)?[\w ]?|^\d{1,4}[\/\-]\d{1,4}[\/\-]\d{1,4}|^\w+, \w+ \d+, \d{4})/,
                    dre2 = /^\d+[\-\/]{1,1}\d+[\-\/]{1,1}\d+/,
                    hre = /^0x[0-9a-f]+$/i,
                    ore = /^0/,
                // convert all to strings and trim()
                    x = a.toString().replace(sre, '') || '',
                    y = b.toString().replace(sre, '') || '',

                    xD = Date.parse(x.match(dre2)),
                    yD = Date.parse(y.match(dre2));


                //dates
                if (xD && yD) {
                    if ( xD < yD ) return asc ? -1 : 1;
                    else if ( xD > yD )	return asc ? 1 : -1;
                    return 0;
                }

                // numeric, hex or date detection
                var
                    xH = parseInt(x.match(hre)),
                    yH = parseInt(y.match(hre));


                // first try and sort Hex codes
                if (xH && yH) {
                    if ( xH < yH ) return asc ? -1 : 1;
                    else if ( xH > yH )	return asc ? 1 : -1;
                    return 0;
                }

                // chunk/tokenize
                var
                    xN = x.replace(re, '\0$1\0').replace(/\0$/,'').replace(/^\0/,'').split('\0'),
                    yN = y.replace(re, '\0$1\0').replace(/\0$/,'').replace(/^\0/,'').split('\0');


                // natural sorting through split numeric strings and default strings
                for(var cLoc= 0, oFxNcL, oFyNcL, numS=Math.max(xN.length, yN.length); cLoc < numS; cLoc++) {
                    // find floats not starting with '0', string or 0 if not defined (Clint Priest)
                    oFxNcL = !(xN[cLoc] || '').match(ore) && parseFloat(xN[cLoc]) || xN[cLoc] || 0;
                    oFyNcL = !(yN[cLoc] || '').match(ore) && parseFloat(yN[cLoc]) || yN[cLoc] || 0;
                    // handle numeric vs string comparison - number < string - (Kyle Adams)
                    if (isNaN(oFxNcL) !== isNaN(oFyNcL)) return (isNaN(oFxNcL)) ? (asc ? 1 : -1) : (asc ? -1 : 1);
                    // rely on string comparison if different types - i.e. '02' < 2 != '02' < '2'
                    else if (typeof oFxNcL !== typeof oFyNcL) {
                        oFxNcL += '';
                        oFyNcL += '';
                    }
                    if (oFxNcL < oFyNcL) return asc ? -1 : 1;
                    if (oFxNcL > oFyNcL) return asc ? 1 : -1;
                }
                return 0;
            }

        }
    };

    window.List = List;
    window.ListJsHelpers = h;
})(window);