define([
    'Backbone',
    'jQuery',
    'Underscore',
    'text!templates/Pagination/PaginationTemplate.html',
    'text!templates/Alpabet/AphabeticTemplate.html',
    'text!templates/Notes/importTemplate.html',
    'views/pagination',
    'views/Notes/AttachView',
    'common',
    'dataService',
    'constants',
    'helpers'
], function (Backbone, $, _, paginationTemplate, aphabeticTemplate, importForm, Pagination, AttachView, common, dataService, CONSTANTS, helpers) {
    'use strict';

    var ListViewBase = Pagination.extend({
        el      : '#content-holder',
        /* defaultItemsNumber: null,
         listLength        : null,*/
        filter  : null,
        /* newCollection     : null,
         page              : null,*/
        viewType: 'list',

        events: {
            'click #previousPage, #nextPage, #firstShowPage, #lastShowPage': 'checkPage',
            'click .itemsNumber'                                           : 'switchPageCounter',
            'click .showPage'                                              : 'showPage',
            'change #currentShowPage'                                      : 'showPage',
            'click .checkbox'                                              : 'checked',
            'click .list td:not(.notForm)'                                 : 'gotoForm',
            'mouseover .currentPageList'                                   : 'showPagesPopup'
        },

        // to remove zombies was needed for event after recieveInvoice on projectInfo
        remove: function () {
            this.$el.empty().off();
            this.stopListening();

            return this;
        },

        gotoForm: function (e) {
            var id = $(e.target).closest('tr').data('id');

            if (!this.formUrl) {
                return;
            }

            App.ownContentType = true;
            Backbone.history.navigate(this.formUrl + id, {trigger: true});
        },

        checkPage: function (event) {
            var newRows = this.$el.find('#false');
            var elementId = $(event.target).attr('id');
            var data = {
                sort         : this.sort,
                filter       : this.filter,
                newCollection: this.newCollection
            };

            event.preventDefault();
            $('#check_all').prop('checked', false);

            if ((this.changedModels && Object.keys(this.changedModels).length) || (this.isNewRow ? this.isNewRow() : newRows.length)) {
                return App.render({
                    type   : 'notify',
                    message: 'Please, save previous changes or cancel them!'
                });
            }

            switch (elementId) {
                case 'previousPage':
                    this.previousPage(data);
                    break;

                case 'nextPage':
                    this.nextPage(data);
                    break;

                case 'firstShowPage':
                    this.firstPage(data);
                    break;

                case 'lastShowPage':
                    this.lastPage(data);
                    break;

                // skip default case
            }
        },

        switchPageCounter: function (event) {
            var newRows = this.$el.find('#false');

            event.preventDefault();

            if ((this.changedModels && Object.keys(this.changedModels).length) || (this.isNewRow ? this.isNewRow() : newRows.length)) {
                return App.render({
                    type   : 'notify',
                    message: 'Please, save previous changes or cancel them!'
                });
            }

            var targetEl = $(event.target);
            var itemsNumber;

            if (this.previouslySelected) {
                this.previouslySelected.removeClass("selectedItemsNumber");
            }

            this.previouslySelected = targetEl;
            targetEl.addClass("selectedItemsNumber");

            this.startTime = new Date();
            itemsNumber = targetEl.text();

            if (itemsNumber === 'all') {
                itemsNumber = this.listLength;
            }

            this.defaultItemsNumber = itemsNumber;

            this.getTotalLength(null, itemsNumber, this.filter);

            this.collection.showMore({
                count        : itemsNumber,
                page         : 1,
                filter       : this.filter,
                newCollection: this.newCollection
            });
            this.page = 1;

            $("#top-bar-deleteBtn").hide();
            $('#check_all').prop('checked', false);

            this.changeLocationHash(1, itemsNumber, this.filter);
        },

        showPagesPopup: function (e) {
            $(e.target).closest("button").next("ul").toggle();
            return false;
        },

        hidePagesPopup: function (e) {
            var el = $(e.target);

            if (this.selectView) {
                this.selectView.remove();
            }

            this.$el.find(".allNumberPerPage, .newSelectList").hide();
            if (!el.closest('.search-view')) {
                $('.search-content').removeClass('fa-caret-up');
                this.$el.find('.search-options').addClass('hidden');
            }

            if (typeof(this.setChangedValueToModel) === "function" && el.tagName !== 'SELECT') { //added for SetChangesToModel in ListView
                this.setChangedValueToModel();
            }
        },

        showFilteredPage: function (filter, context) {
            var itemsNumber = $("#itemsNumber").text();

            var alphaBet = this.$el.find('#startLetter');
            var selectedLetter = $(alphaBet).find('.current').length ? $(alphaBet).find('.current')[0].text : '';

            $("#top-bar-deleteBtn").hide();
            $('#check_all').prop('checked', false);

            if (selectedLetter === 'All') {
                selectedLetter = '';
            }

            context.startTime = new Date();
            context.newCollection = false;

            this.filter = Object.keys(filter).length === 0 ? {} : filter;

            context.changeLocationHash(1, itemsNumber, filter);
            // context.collection.showMore({count: itemsNumber, page: 1, filter: filter});
            // context.getTotalLength(null, itemsNumber, filter);
        },

        showPage: function (event) {
            var newRows = this.$el.find('#false');

            event.preventDefault();

            if ((this.changedModels && Object.keys(this.changedModels).length) || (this.isNewRow ? this.isNewRow() : newRows.length)) {
                return App.render({
                    type   : 'notify',
                    message: 'Please, save previous changes or cancel them!'
                });
            }
            this.showP(event, {filter: this.filter, newCollection: this.newCollection, sort: this.sort});
        },

        showMoreContent: function (newModels) {
            var $holder = this.$el;
            var itemView;
            var page = parseInt($holder.find('#currentShowPage').val(), 10) || 1; // if filter give 0 elements
            var pagenation;

            this.hideDeleteBtnAndUnSelectCheckAll();

            $holder.find('#listTable').empty();

            itemView = new this.ListItemView({
                collection : newModels,
                page       : page,
                itemsNumber: this.collection.pageSize
            });

            $holder.append(itemView.render());

            itemView.undelegateEvents();

            pagenation = $holder.find('.pagination');

            if (newModels.length !== 0) {
                pagenation.show();
            } else {
                pagenation.hide();
            }

            if (typeof (this.recalcTotal) === 'function') {
                this.recalcTotal();
            }

            $holder.find('#timeRecivingDataFromServer').remove();
            $holder.append("<div id='timeRecivingDataFromServer'>Created in " + (new Date() - this.startTime) + " ms</div>");
        },

        /* showMoreAlphabet: function (newModels) {
         var holder = this.$el;
         var alphaBet = holder.find('#startLetter');
         var created = holder.find('#timeRecivingDataFromServer');

         this.countPerPage = newModels.length;
         content.remove();
         holder.append(this.template({collection: newModels.toJSON()}));
         $("#top-bar-deleteBtn").hide();
         $('#check_all').prop('checked', false);
         this.getTotalLength(null, itemsNumber, this.filter);
         created.text("Created in " + (new Date() - this.startTime) + " ms");
         holder.prepend(alphaBet);
         holder.append(created);
         },*/

        renderContent: function () {
            var $currentEl = this.$el;
            var tBody = $currentEl.find('#listTable');
            var itemView;
            var pagenation;

            tBody.empty();
            $("#top-bar-deleteBtn").hide();
            $('#check_all').prop('checked', false);

            if (this.collection.length > 0) {
                itemView = new this.listItemView({
                    collection : this.collection,
                    page       : this.page,
                    itemsNumber: this.collection.namberToShow
                });
                tBody.append(itemView.render());
            }

            pagenation = this.$el.find('.pagination');

            if (this.collection.length === 0) {
                pagenation.hide();
            } else {
                pagenation.show();
            }

            if (this.editCollection) { // add for reset editCollection after sort
                this.editCollection.reset(this.collection.models);
            }

            App.stopPreload();
        },

        alpabeticalRender: function (e) {
            var target;
            var itemsNumber = $('#itemsNumber').text();
            var selectedLetter;

            this.startTime = new Date();

            if (e && e.target) {
                target = $(e.target);
                selectedLetter = $(e.target).text();

                if (!this.filter) {
                    this.filter = {};
                }
                this.filter.letter = {
                    key  : 'letter',
                    value: selectedLetter,
                    type : null
                };

                target.parent().find('.current').removeClass('current');
                target.addClass('current');
                if ($(e.target).text() === 'All') {
                    delete this.filter;
                    delete App.filter.letter;
                } else {
                    App.filter.letter = this.filter.letter;
                }
            }

            this.filter = App.filter;

            this.filterView.renderFilterContent(this.filter);
            _.debounce(
                function () {
                    this.trigger('filter', App.filter);
                }, 10);

            $("#top-bar-deleteBtn").hide();
            $('#check_all').prop('checked', false);

            this.changeLocationHash(1, itemsNumber, this.filter);
            this.collection.showMore({count: itemsNumber, page: 1, filter: this.filter});
            this.getTotalLength(null, itemsNumber, this.filter);
        },

        renderCheckboxes: function () {
            var self = this;

            $('#check_all').click(function () {
                $(':checkbox:not(.notRemovable)').prop('checked', this.checked);
                if ($("input.checkbox:checked").length > 0) {
                    $("#top-bar-deleteBtn").show();
                } else {
                    $("#top-bar-deleteBtn").hide();
                }
                if (typeof(self.setAllTotalVals) === "function") {   // added in case of existing setAllTotalVals method in View
                    self.setAllTotalVals();
                }
            });
        },

        renderAlphabeticalFilter: function () {
            var self = this;
            var currentLetter;

            this.hasAlphabet = true;

            common.buildAphabeticArray(this.collection, function (arr) {
                $("#startLetter").remove();
                self.alphabeticArray = arr;
                //$currentEl.prepend(_.template(aphabeticTemplate, { alphabeticArray: self.alphabeticArray, selectedLetter: (self.selectedLetter == "" ? "All" : self.selectedLetter), allAlphabeticArray: self.allAlphabeticArray }));
                $('#searchContainer').after(_.template(aphabeticTemplate, {
                    alphabeticArray   : self.alphabeticArray,
                    allAlphabeticArray: self.allAlphabeticArray
                }));

                currentLetter = (self.filter && self.filter.letter) ? self.filter.letter.value : "All";
                if (currentLetter) {
                    $('#startLetter').find('a').each(function () {
                        var target = $(this);
                        if (target.text() == currentLetter) {
                            target.addClass("current");
                        }
                    });
                }
            });
        },

        renderPagination: function ($currentEl, _self) {
            var self = _self || this;
            var countNumber;
            var pagination;

            $currentEl.append(_.template(paginationTemplate));

            pagination = self.$el.find('.pagination');

            if (self.collection.length === 0) {
                pagination.hide();
            } else {
                pagination.show();
                // This is for counterPages at start
                countNumber = (CONSTANTS.PAGINATION_ARRAY.indexOf(self.collection.pageSize) !== -1) ? self.collection.pageSize : 'all';
                this.previouslySelected = $('.itemsNumber:contains(' + countNumber + ')');
                this.previouslySelected.addClass('selectedItemsNumber');
                // end
            }

            $(document).on('click', function (e) {
                self.hidePagesPopup(e);
            });
        },

        renderFilter: function (self, baseFilter) {
            self.filterView = new this.filterView({
                contentType: self.contentType
            });

            self.filterView.bind('filter', function (filter) {
                if (baseFilter) {
                    filter[baseFilter.name] = baseFilter.value;
                }
                self.showFilteredPage(filter, self);
            });
            self.filterView.bind('defaultFilter', function (filter) {
                if (baseFilter) {
                    filter[baseFilter.name] = baseFilter.value;
                }
                self.showFilteredPage({}, self);
            });

            self.filterView.render();

        },

        deleteItemsRender: function (deleteCounter, deletePage) {
            $('#check_all').prop('checked', false);
            dataService.getData(this.totalCollectionLengthUrl, {
                filter       : this.filter,
                newCollection: this.newCollection,
                contentType  : this.contentType,
                mid          : this.mId
            }, function (response, context) {
                context.listLength = response.count || 0;
            }, this);

            this.deleteRender(deleteCounter, deletePage, {
                filter       : this.filter,
                newCollection: this.newCollection
            });

            var pagenation = this.$el.find('.pagination');
            if (this.collection.length === 0) {
                pagenation.hide();
            } else {
                pagenation.show();
            }
        },

        exportToCsv: function () {
            //todo change after routes refactoring
            var filterString = '';
            var tempExportToCsvUrl = '';

            if (this.exportToCsvUrl) {
                tempExportToCsvUrl = this.exportToCsvUrl;
                if (this.filter) {
                    tempExportToCsvUrl += '/' + encodeURIComponent(JSON.stringify(this.filter));
                }
                window.location = tempExportToCsvUrl;
            } else {
                if (this.collection) {
                    filterString += '/' + encodeURIComponent(JSON.stringify(this.filter));
                }
                window.location = this.collection.url + '/exportToCsv' + filterString;
            }
        },

        exportToXlsx: function () {
            var filterString = '';
            var tempExportToXlsxUrl = '';
            //todo change after routes refactoring
            if (this.exportToXlsxUrl) {
                tempExportToXlsxUrl = this.exportToXlsxUrl;
                if (this.filter) {
                    tempExportToXlsxUrl += '/' + encodeURIComponent(JSON.stringify(this.filter));
                }
                window.location = tempExportToXlsxUrl;
            } else {
                if (this.collection) {
                    if (this.filter) {
                        filterString += '/' + encodeURIComponent(JSON.stringify(this.filter));
                    }
                    window.location = this.collection.url + '/exportToXlsx' + filterString;
                }
            }
        },

        fileSizeIsAcceptable: function (file) {
            if (!file) {
                return false;
            }
            return file.size < App.File.MAXSIZE;
        },

        importFiles: function (context) {
            new AttachView({
                modelName: context.contentType,
                import   : true
            });
        }

    });

    ListViewBase.extend = function () {
        var view = Backbone.View.extend.apply(this, arguments);
        var key;
        var protoEvents = this.prototype.events;
        var protoKeys = Object.keys(protoEvents);
        var viewEvents = view.prototype.events;
        var length = protoKeys.length;
        var i;

        for (i = 0; i < length; i++) {
            key = protoKeys[i];

            if (viewEvents.hasOwnProperty(key)) {
                continue;
            }
            viewEvents[key] = protoEvents[key];
        }

        return view;
    };

    return ListViewBase;
});
