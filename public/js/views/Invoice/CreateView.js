define([
	"text!templates/Invoice/CreateTemplate.html",
    "models/InvoiceModel",
    "common",
	"populate",
    "views/Invoice/InvoiceProductItems",
    "views/Assignees/AssigneesView",
    "dataService"
    ],
    function (CreateTemplate, InvoiceModel, common, populate, InvoiceItemView, AssigneesView, dataService ) {

        var CreateView = Backbone.View.extend({
            el: "#content-holder",
            contentType: "Invoice",
            template: _.template(CreateTemplate),

            initialize: function (options) {
                _.bindAll(this, "saveItem", "render");
                this.model = new InvoiceModel();
				this.responseObj = {};
                this.render();
            },

            events: {
                'keydown': 'keydownHandler',
                'click .dialog-tabs a': 'changeTab',
                'click .dialog-tabs-n a': 'changeTab_n',
				"click .details":"showDetailsBox",
                "click .current-selected": "showNewSelect",
                "click": "hideNewSelect",
				"click .newSelectList li:not(.miniStylePagination)": "chooseOption",
                "click .newSelectList li.miniStylePagination": "notHide",
                "click .newSelectList li.miniStylePagination .next:not(.disabled)": "nextSelect",
                "click .newSelectList li.miniStylePagination .prev:not(.disabled)": "prevSelect"
            },
            showNewSelect:function(e,prev,next){
                populate.showSelect(e,prev,next,this);
                return false;
                
            },
            notHide: function () {
				return false;
            },
            hideNewSelect: function () {
                $(".newSelectList").hide();
            },
            chooseOption: function (e) {
                var holder = $(e.target).parents("dd").find(".current-selected");
                holder.text($(e.target).text()).attr("data-id", $(e.target).attr("id"));
            },

			nextSelect:function(e){
				this.showNewSelect(e,false,true);
			},
			prevSelect:function(e){
				this.showNewSelect(e,true,false);
			},
			showDetailsBox:function(e){
				$(e.target).parent().find(".details-box").toggle();
			},

            keydownHandler: function (e) {
                switch (e.which) {
                    case 27:
                        this.hideDialog();
                        break;
                    default:
                        break;
                }
            },

            changeTab: function (e) {
                var holder = $(e.target);
                holder.closest(".dialog-tabs").find("a.active").removeClass("active");
                holder.addClass("active");
                var n = holder.parents(".dialog-tabs").find("li").index(holder.parent());
                var dialog_holder = $(".dialog-tabs-items");
                dialog_holder.find(".dialog-tabs-item.active").removeClass("active");
                dialog_holder.find(".dialog-tabs-item").eq(n).addClass("active");
            },

            changeTab_n: function (e) {
                var holder = $(e.target);
                holder.closest(".dialog-tabs-n").find("a.active").removeClass("active");
                holder.addClass("active");
                var n = holder.parents(".dialog-tabs-n").find("li").index(holder.parent());
                var dialog_holder = $(".dialog-tabs-items-n");
                dialog_holder.find(".dialog-tabs-item-n.active").removeClass("active");
                dialog_holder.find(".dialog-tabs-item-n").eq(n).addClass("active");
            },

            saveItem: function () {
                var self = this;
                var mid = 56;
                var selectedProducts = this.$el.find('.productItem');
                var products = [];
                var selectedLength = selectedProducts.length;
                var targetEl;
                var productId;
                var quantity;
                var price;
                var amount;

                var supplierId = this.$("#supplierId").data("id");
                var invoiceDate = this.$("#invoice_date").val();
                var dueDate = this.$("#due_date").val();

                var total = parseFloat(this.$("#totalAmount").text());
                var untaxed = parseFloat(this.$("#totalUntaxes").text());
                var taxes = parseFloat(this.$("#taxes").text());
                var balance = parseFloat(this.$("#balance").text());

                var payments ={
                    total: total,
                    untaxed: untaxed,
                    taxes: taxes,
                    balance: balance
                };

                if (selectedLength) {
                    for (var i = selectedLength - 1; i >= 0; i--) {
                        targetEl = $(selectedProducts[i]);
                        productId = targetEl.data('id');
                        quantity = targetEl.find('[data-name="quantity"]').text();
                        price = targetEl.find('[data-name="price"]').text();
                        amount = targetEl.find('.amount').text();

                        products.push({
                            product: productId,
                            unitPrice: price,
                            quantity: quantity,
                            amount: amount
                        });
                    }
                }

                var usersId = [];
                var groupsId = [];
                $(".groupsAndUser tr").each(function () {
                    if ($(this).data("type") == "targetUsers") {
                        usersId.push($(this).data("id"));
                    }
                    if ($(this).data("type") == "targetGroups") {
                        groupsId.push($(this).data("id"));
                    }

                });

                var whoCanRW = this.$el.find("[name='whoCanRW']:checked").val();
                var data = {

                    supplierId: supplierId,
                    fiscalPosition: null,
                    sourceDocument: $.trim($('#source_document').val()),
                    supplierInvoiceNumber: $.trim($('#supplier_invoice_num').val()),
                    paymentReference: $.trim($('#payment_reference').val()),
                    invoiceDate: invoiceDate,
                    dueDate: dueDate,
                    account: null,
                    journal: null,

                    products: products,
                    paymentInfo: payments,

                    groups: {
                        owner: $("#allUsersSelect").data("id"),
                        users: usersId,
                        group: groupsId
                    },
                    whoCanRW: whoCanRW

                };

                var model = new InvoiceModel();
                model.save(data, {
                    headers: {
                        mid: mid
                    },
                    wait: true,
                    success: function () {
                        self.hideDialog();
                        Backbone.history.navigate("easyErp/Invoice", { trigger: true });
                    },
                    error: function (model, xhr) {
						self.errorNotification(xhr);
                    }
                });

            },

            hideDialog: function() {
                $(".edit-dialog").remove();
                $(".add-group-dialog").remove();
                $(".add-user-dialog").remove();
                $(".crop-images-dialog").remove();
            },

            render: function () {
                var formString = this.template();
                var self = this;
                var invoiceItemContainer;

                this.$el = $(formString).dialog({
					closeOnEscape: false,
                    autoOpen: true,
                    resizable: true,
                    dialogClass: "edit-dialog",
                    title: "Create Invoice",
                    width: "900px",
					position:{within:$("#wrapper")},
                    buttons: [
                        {
                            id: "create-invoice-dialog",
                            text: "Create",
                            click: function () {
                                self.saveItem();
                            }
                        },

						{
						    text: "Cancel",
						    click: function () {
                                self.hideDialog();
                            }
						}]

                });

                var notDiv = this.$el.find('#assignees-container');
                notDiv.append(
                    new AssigneesView({
                        model: this.currentModel
                    }).render().el
                );

                invoiceItemContainer = this.$el.find('#invoiceItemsHolder');
                invoiceItemContainer.append(
                    new InvoiceItemView().render().el
                );

                populate.getCompanies("#supplierId", "/supplier", {}, this, false, true);

                this.$el.find('#invoice_date').datepicker({
                    dateFormat: "d M, yy",
                    changeMonth: true,
                    changeYear: true
                });

                this.$el.find('#due_date').datepicker({
                    dateFormat: "d M, yy",
                    changeMonth: true,
                    changeYear: true
                });


                this.delegateEvents(this.events);

                return this;
            }

        });

        return CreateView;
    });
