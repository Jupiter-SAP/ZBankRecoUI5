sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/format/DateFormat",
    "sap/ui/core/BusyIndicator",
    "sap/ui/comp/valuehelpdialog/ValueHelpDialog",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/BusyDialog",
    "sap/ui/comp/filterbar/FilterBar",



], (Controller, JSONModel, MessageToast, MessageBox, DateFormat, BusyIndicator, ValueHelpDialog, Filter, FilterOperator, BusyDialog, FilterBar, FilterGroupItem) => {
    "use strict";

    return Controller.extend("zbankrecoapp.controller.View1", {
        onInit() {
            var that = this;
            this.ODataModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZUI_BANKRECO/");

            // Create model and set to view
            this.oModel = new JSONModel({
                BankRecoId: "",
                Bank: "",
                Company: "",
                Statementdate: "",
                BookTransactions: [],
                StatementTransactions: [],
                isEditable: true,
                Status: "",
                FiscalYear: "",
                BankName: "",
                isButton1Visible: true,
                isButton2Visible: true,

            });

            const oView = this.getView();
            oView.setModel(this.oModel);

            oView.setModel(new JSONModel({
                rowMode: "Interactive"
            }), "ui");

            const oTable1 = this.byId("_IDGenTable");
            const oTable2 = this.byId("_IDGenTable2");

            oTable1.attachSort((oEvent) => {
                this.bookSortOrder = oEvent.getParameter("sortOrder");
                that._loadBookTransactions();
            });

            oTable2.attachSort((oEvent) => {
                this.statementSortOrder = oEvent.getParameter("sortOrder");
                that._loadStatementTransactions();
            });

        },

        _loadBookTransactions: function () {
            var that = this;

            that.ODataModel.read(`/BankReco('${that.oModel.getProperty("/BankRecoId")}')/to_Booktrans`, {
                filters: [
                    that.oModel.getProperty("/Remaining") && new Filter("ClearedVoucherno", FilterOperator.EQ, "")
                ],
                urlParameters: {
                    "$top": "500"
                },

                success: function (data) {
                    const sortedData = data.results
                        .map((item) => ({
                            ...item,
                            Dates: sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(new Date(item.Dates)),
                            ClearedDate: item.ClearedDate ? DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(new Date(item.ClearedDate)) : "",
                        }))
                        .sort((a, b) => that.bookSortOrder === "Ascending"
                            ? (a.Amount - b.Amount)
                            : (b.Amount - a.Amount));

                    that.oModel.setProperty("/BookTransactions", sortedData);
                    console.log(that.oModel.getProperty("/BookTransactions"))
                }
            });
        },

        _loadStatementTransactions: function () {
            var that = this;

            that.ODataModel.read(`/BankReco('${that.oModel.getProperty("/BankRecoId")}')/to_StatementTrans`, {
                filters: [
                    that.oModel.getProperty("/Remaining") && new sap.ui.model.Filter("ClearedVoucherno", sap.ui.model.FilterOperator.EQ, "")
                ].filter(Boolean),

                success: function (data) {
                    const sortedData = data.results
                        .map((item) => ({
                            ...item,
                            Dates: sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(new Date(item.Dates))
                        }))
                        .sort((a, b) => that.statementSortOrder === "Ascending"
                            ? (a.Amount - b.Amount)
                            : (b.Amount - a.Amount));

                    that.oModel.setProperty("/StatementTransactions", sortedData);
                    console.log(that.oModel.getProperty("/StatementTransactions"))
                }
            });
        },

        _loadBankRecoData: function (sBankRecoId) {
            var that = this;
            BusyIndicator.show();

            // Load Book Transactions
            that.ODataModel.read(`/BankReco('${sBankRecoId}')/to_Booktrans`, {
                filters: [
                    that.oModel.getProperty("/Remaining") && new Filter("ClearedVoucherno", FilterOperator.EQ, "")
                ],
                urlParameters: {
                    "$top": "500"
                },
                success: function (oData) {
                    that.oModel.setProperty("/BookTransactions", oData.results.map((item) => {
                        return {
                            ...item,
                            Dates: item.Dates ? DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(new Date(item.Dates)) : "",
                            ClearedDate: item.ClearedDate ? DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(new Date(item.ClearedDate)) : "",
                            NumericAmount: parseFloat(item.Amount)
                        };
                    }));
                },

                error: function () {
                    MessageBox.error("Failed to load Book transactions");
                }
            });


            // Load Statement Transactions
            that.ODataModel.read(`/BankReco('${sBankRecoId}')/to_StatementTrans`, {
                filters: [
                    that.oModel.getProperty("/Remaining") && new Filter("ClearedVoucherno", FilterOperator.EQ, "")
                ],
                urlParameters: {
                    "$top": "500"
                },
                success: function (oData) {
                    that.oModel.setProperty("/StatementTransactions", oData.results.map((item) => {
                        return {
                            ...item,
                            Dates: item.Dates ? DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(new Date(item.Dates)) : "",
                            DecimalAmount: parseFloat(item.Amount)
                        };
                    }));
                    BusyIndicator.hide();
                    MessageToast.show("Data loaded for BankRecoId: " + sBankRecoId);
                },
                error: function () {
                    BusyIndicator.hide();
                    MessageBox.error("Failed to load Statement transactions");
                }
            });

            // Load header data
            that.ODataModel.read(`/BankReco('${sBankRecoId}')`, {
                success: function (oData) {

                    that.oModel.setProperty("/BankRecoId", oData.Bankrecoid);
                    that.oModel.setProperty("/Bank", oData.Bank);
                    that.oModel.setProperty("/Company", oData.Company);
                    that.oModel.setProperty("/Statementdate", oData.Statementdate ? DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(new Date(oData.Statementdate)) : "");
                    that.oModel.setProperty("/Status", oData.Status || "");
                    that.oModel.setProperty("/FiscalYear", oData.FiscalYear);
                    that.oModel.setProperty("/BankName", oData.BankName);
                    that.oModel.setProperty("/isEditable", false);

                    if (that.oModel.getProperty("/Status") === "Posted" || that.oModel.getProperty("/Status") === "Released") {
                        that.oModel.setProperty("/isButton1Visible", false);
                    }
                    else if (that.oModel.getProperty("/Status") === "Posted") {
                        that.oModel.setProperty("/isButton2Visible", false);
                    }
                    else {

                    }


                },
                error: function () {
                    MessageBox.error("Failed to load BankReco header data");
                }
            });

            //      var sStatus = that.oModel.getProperty("/Status");

            // if (sStatus === "Released" || sStatus === "Posted") {

            //     var aButtonIds = [
            //     "_IDGenButton",
            //     "_IDGenButton1",
            //     "_IDGenButton5",
            //     "_IDGenButton6",
            //     "_IDGenButton7",
            //     "_IDGenButton8",
            //     "delete"
            // ];

            // aButtonIds.forEach(function (sId) {
            //     var oBtn = this.getView().byId(sId);
            //     if (oBtn) {
            //         oBtn.setVisible(false);
            //     }
            // });
            // }
        },

        onDownload: function () {
            var that = this;
            this.bankRecoId = that.oModel.getProperty('/BankRecoId');
            let urlSuffix = `&bankRecoId=${this.bankRecoId}`;
            let selectedData = [];
            let datas = [];
            BusyIndicator.show(),
                $.ajax({
                    url: `/sap/bc/http/sap/ZHTTP_LOADEXCEL?${urlSuffix}`,
                    type: "GET",
                    success: (response) => {

                        BusyIndicator.hide();

                        if (Array.isArray(response)) {
                            datas = response;
                        } else {

                            datas.push(response);
                        }

                        for (let i = 0; i < datas.length; i++) {
                            const data = datas[i];
                            if (data) {

                                let valueDateDay = data.VALUE_DATE.substring(8);
                                let valueDateMonth = data.VALUE_DATE.substring(5, 7);
                                let valueDateYear = data.VALUE_DATE.substring(0, 4);

                                let fullDate = `${valueDateDay}.${valueDateMonth}.${valueDateYear}`;

                                let rowData = {}
                                rowData['Manual Transaction'] = data.MANUAL_TRANSACTION || '';
                                rowData['External Transaction'] = data.EXTERNAL_TRANSACTION || '';
                                rowData['Value Date'] = fullDate || '';
                                rowData['Amount'] = data.AMOUNT || '';
                                rowData['Account Currency'] = data.ACCOUNT_CURRENCY || '';
                                rowData['Memo Line'] = data.MEMO_LINE || '';
                                rowData['Check Number'] = data.CHECK_NUMBER || '';
                                rowData['Payment Medium Reference'] = data.PAYMENT_MEDIUM_REFERENCE || '';
                                rowData['Customer Reference Number'] = data.CUSTOMER_REFERENCE_NUMBER || '';
                                rowData['Item Reference'] = data.ITEM_REFERENCE || '';
                                rowData['Payment Amount'] = data.PAYMENT_AMOUNT || '';
                                rowData['Payment Currency'] = data.PAYMENT_CURRENCY || '';
                                rowData['Partner Name'] = data.PARTNER_NAME || '';
                                rowData['Partner National Bank Code'] = data.PARTNER_NATIONAL_BANK_CODE || '';
                                rowData['Partner Bank Country/Region'] = data.PARTNER_BANK_COUNTRY_REGION || '';
                                rowData['Partner Bank Acct:IBAN'] = data.PARTNER_BANK_ACCT_IBAN || '';
                                rowData['Partner SWIFT Code'] = data.PARTNER_SWIFT_CODE || '';
                                rowData['Partner bank account'] = data.PARTNER_BANK_ACCOUNT || '';
                                rowData['Customer'] = data.CUSTOMER || '';
                                rowData['Supplier'] = data.SUPPLIER || '';
                                rowData['G/L Account'] = data.GL_ACCOUNT || '';
                                rowData['Description'] = data.DESCRIPTION || '';
                                rowData['Assignment'] = data.ASSIGNMENT || '';
                                rowData['Reference'] = data.REFERENCE || '';
                                rowData['Cost Center'] = data.COST_CENTER || '';
                                rowData['Payment Reference'] = data.PAYMENT_REFERENCE || '';
                                rowData['Profit Center'] = data.PROFITCENTER || '';


                                selectedData.push(rowData);
                            }
                        }

                        if (selectedData.length === 0) {
                            MessageBox.show("No data found");
                            return;
                        }

                        const csv = this.convertToCSV(selectedData);
                        MessageBox.show("Data processed successfully");
                    },
                    error: (error) => {
                        console.error(error);
                        BusyIndicator.hide();
                        MessageBox.error("Failed to fetch data: " + error.statusText);
                    }
                });
            datas = [];
            selectedData = [];
        },
        convertToCSV: function (objArray, fileName = `${this.bankRecoId}.xlsx`) {
            const array = typeof objArray !== "object" ? JSON.parse(objArray) : objArray;

            // Create worksheet from JSON array
            const worksheet = XLSX.utils.json_to_sheet(array);

            // Create a new workbook and append the worksheet
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

            // Export to Excel file
            XLSX.writeFile(workbook, fileName);
        },

        //getrecoidbutton
        onGetBankrecoid: function () {

            var that = this;

            this.oInput = new sap.m.Input({
                width: "100%",
                placeholder: "Enter BankRecoId",
                showValueHelp: true,
                valueHelpRequest: function () {
                    that.onBankRecoValueHelp();
                }
            });

            var Dialog = new sap.m.Dialog({
                title: "Enter BankRecoId",
                type: "Message",
                content: [
                    new sap.m.Label({
                        text: "BankrecoId :"
                    }),
                    that.oInput


                ],
                beginButton: new sap.m.Button({

                    text: "OK",
                    press: function () {

                        var sBankRecoId = that.oInput.getValue();

                        if (!sBankRecoId) {
                            MessageBox.error("Please enter BankRecoId.");

                            return;

                        }

                        Dialog.close();
                        BusyIndicator.show();
                        that._loadBankRecoData(sBankRecoId);

                    }
                }),

                endButton: new sap.m.Button({
                    text: "Cancel",
                    press: function () {
                        Dialog.close();
                    }

                }),
                afterClose: function () {
                    // Dialog.destroy();
                }
            });

            Dialog.open();
        },









        //FETCH AND SAVe




        onfetchandsave() {
            var oData = this.oModel.getData();
            if (!oData.Bank || !oData.Company || !oData.Statementdate) {
                MessageBox.warning("Please fill Bank, Company, and Statement Upto before fetching data.");
                return;
            };
            let that = this;

            var oPayload = {
                "Bank": oData.Bank,
                "Company": oData.Company,
                "Statementdate": oData.Statementdate,
                "BankRecoId": oData.BankRecoId,
                "FiscalYear": oData.FiscalYear,
                "BankName": oData.BankName,
            };
            BusyIndicator.show();
            $.ajax({
                url: "/sap/bc/http/sap/ZHTTP_FETCHANDSAVE",
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(oPayload),
                dataType: "json",
                success: (response) => {
                    that.oModel.setProperty("/BankRecoId", response.BankRecoId);
                    that.oModel.setProperty("/Status", "Pending");
                    that.oModel.setProperty("/isEditable", false);
                    that.ODataModel.read(`/BankReco('${response.BankRecoId}')/to_Booktrans`, {
                        filters: [
                            that.oModel.getProperty("/Remaining") && new Filter("ClearedVoucherno", FilterOperator.EQ, "")
                        ],
                        urlParameters: {
                            "$top": "500"
                        },
                        success: function (data) {
                            that.oModel.setProperty("/BookTransactions", data.results.map((item) => {
                                return {
                                    ...item,
                                    Dates: DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(new Date(item.Dates)),
                                    ClearedDate: DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(new Date(item.ClearedDate)),
                                }
                            }));
                        },
                        error: function (error) {
                        }
                    });
                    that.ODataModel.read(`/BankReco('${response.BankRecoId}')/to_StatementTrans`, {
                        filters: [
                            that.oModel.getProperty("/Remaining") && new Filter("ClearedVoucherno", FilterOperator.EQ, "")
                        ],
                        success: function (data) {
                            that.oModel.setProperty("/StatementTransactions", data.results.map((item) => {
                                return {
                                    ...item,
                                    Dates: DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(new Date(item.Dates))
                                }
                            }));
                            BusyIndicator.hide();
                            MessageToast.show("Data fetched & saved successfully!");
                        },
                        error: function (error) {
                        }
                    });
                },
                error: (xhr, error) => {

                    MessageBox.error("Failed to fetch & save: " + error);
                }
            });
        },

        //MARK DATA
        onMark() {
            var oTable1 = this.byId("_IDGenTable");
            var oTable2 = this.byId("_IDGenTable2");
            let that = this;

            var aSelectedIndices1 = oTable1.getSelectedIndices();
            var aSelectedIndices2 = oTable2.getSelectedIndices();

            if (aSelectedIndices1.length === 0 || aSelectedIndices2.length === 0) {
                MessageBox.error("Please select one row from Book and Statement tables.");
                return;
            }
            var oBookContext = [];
            var oStatementContext = [];
            for (let index = 0; index < aSelectedIndices1.length; index++) {
                oBookContext.push(oTable1.getContextByIndex(aSelectedIndices1[index]).getObject());

            }
            for (let index = 0; index < aSelectedIndices2.length; index++) {
                oStatementContext.push(oTable2.getContextByIndex(aSelectedIndices2[index]).getObject());

            }

            if (!oBookContext || !oStatementContext) {
                MessageBox.error("Unable to read selected rows' context.");
                return;
            }



            // var oBookData = oBookContext.getObject();
            // var oStatementData = oStatementContext.getObject();

            var pPayload = {
                bookTransactions: oBookContext.map((data) => {
                    return {
                        ...data,
                        Dates: (data.Dates || "").toString().replace(/-/g, "")
                    }
                }),
                statements: oStatementContext.map((data) => {
                    return {
                        ...data,
                        Dates: (data.Dates || "").toString().replace(/-/g, "")
                    }
                }),
                mark: "true"
            };

            // var pPayload = {
            //     bookTransactions: {
            //         ...oBookData,
            //         Dates: oBookData.Dates.replace("-", "")
            //     },
            //     statements: {
            //         ...oStatementData,
            //         Dates: oStatementData.Dates.replace("-", "")
            //     },
            //     mark: "true"
            // };
            BusyIndicator.show();
            $.ajax({
                url: "/sap/bc/http/sap/ZHTTP_MARKDATA",
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(pPayload),
                dataType: "json",
                success: (response) => {

                    if (response.Status === 'E') {
                        MessageBox.error(response.Message);
                        return;
                    }
                    else if (response.status === 'S') {
                        this.byId("_IDGenTable").getBinding("rows").refresh();
                        this.byId("_IDGenTabled2").getBinding("rows").refresh();

                        MessageBox.show(response.Message);

                    }

                    that.ODataModel.read(`/BankReco('${that.oModel.getProperty("/BankRecoId")}')/to_StatementTrans`, {
                        filters: [
                            that.oModel.getProperty("/Remaining") && new Filter("ClearedVoucherno", FilterOperator.EQ, "")
                        ],
                        success: function (data) {
                            const sortedData = data.results
                                .map((item) => {
                                    return {
                                        ...item,
                                        Dates: DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(new Date(item.Dates))
                                    };
                                })
                                .sort((a, b) => that.statementSortOrder === 'Ascending' ? (a.Amount - b.Amount) : (b.Amount - a.Amount));

                            that.oModel.setProperty("/StatementTransactions", sortedData);
                            BusyIndicator.hide();

                        },
                        error: function (error) {
                            MessageBox.error(error);
                        }
                    });

                    that.ODataModel.read(`/BankReco('${that.oModel.getProperty("/BankRecoId")}')/to_Booktrans`, {
                        filters: [
                            that.oModel.getProperty("/Remaining") && new Filter("ClearedVoucherno", FilterOperator.EQ, "")
                        ],
                        urlParameters: {
                            "$top": "500"
                        },
                        success: function (data) {
                            const sortedData = data.results
                                .map((item) => {
                                    return {
                                        ...item,
                                        Dates: DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(new Date(item.Dates))
                                    };
                                })
                                .sort((a, b) => that.bookSortOrder === 'Ascending' ? (a.Amount - b.Amount) : (b.Amount - a.Amount));
                            that.oModel.setProperty("/BookTransactions", sortedData);

                            BusyIndicator.hide();
                            MessageToast.show(response.Message || "Book transactions updated successfully!");
                        },
                        error: function (err) {
                            BusyIndicator.hide();
                            MessageToast.show(response.Message || "Transaction processed, but failed to reload book transactions.");
                        }
                    });



                },
                error: (xhr, status, error) => {

                    MessageBox.error(error);
                    return;
                }
            });
            BusyIndicator.hide();

        },

        onUnMark() {
            var oTable1 = this.byId("_IDGenTable");
            var oTable2 = this.byId("_IDGenTable2");
            var that = this;

            var aSelectedIndices1 = oTable1.getSelectedIndices();
            var aSelectedIndices2 = oTable2.getSelectedIndices();

            if (aSelectedIndices1.length === 0 || aSelectedIndices2.length === 0) {
                MessageBox.error("Please select one row from Book and Statement tables to unmark.");
                return;
            }

            var oBookContext = [];
            var oStatementContext = [];
            for (let index = 0; index < aSelectedIndices1.length; index++) {
                oBookContext.push(oTable1.getContextByIndex(aSelectedIndices1[index]).getObject());

            }
            for (let index = 0; index < aSelectedIndices2.length; index++) {
                oStatementContext.push(oTable2.getContextByIndex(aSelectedIndices2[index]).getObject());

            }

            if (!oBookContext || !oStatementContext) {
                MessageBox.error("Unable to read selected rows' context.");
                return;
            }


            // var bookDates = (oBookData.Dates || "").toString().replace(/-/g, "");
            // var stmtDates = (oStatementData.Dates || "").toString().replace(/-/g, "");

            var pPayload = {
                bookTransactions: oBookContext.map((data) => {
                    return {
                        ...data,
                        Dates: (data.Dates || "").toString().replace(/-/g, "")
                    }
                }),
                statements: oStatementContext.map((data) => {
                    return {
                        ...data,
                        Dates: (data.Dates || "").toString().replace(/-/g, "")
                    }
                }),
                mark: "false"
            };



            $.ajax({
                url: "/sap/bc/http/sap/ZHTTP_MARKDATA",
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(pPayload),
                dataType: "json",
                success: function (response) {


                    if (response && response.Status === "S") {

                        that.oModel.setProperty("/Status", "Pending");

                        // Reload BookTransactions
                        that.ODataModel.read(`/BankReco('${that.oModel.getProperty("/BankRecoId")}')/to_StatementTrans`, {
                            filters: [
                                that.oModel.getProperty("/Remaining") && new Filter("ClearedVoucherno", FilterOperator.EQ, "")
                            ],
                            success: function (data) {
                                const sortedData = data.results
                                    .map((item) => {
                                        return {
                                            ...item,
                                            Dates: DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(new Date(item.Dates))
                                        };
                                    })
                                    .sort((a, b) => that.statementSortOrder === 'Ascending' ? (a.Amount - b.Amount) : (b.Amount - a.Amount));

                                that.oModel.setProperty("/StatementTransactions", sortedData);
                                BusyIndicator.hide();

                            },
                            error: function (error) {
                                MessageBox.error(error);
                            }
                        });

                        that.ODataModel.read(`/BankReco('${that.oModel.getProperty("/BankRecoId")}')/to_Booktrans`, {
                            filters: [
                                that.oModel.getProperty("/Remaining") && new Filter("ClearedVoucherno", FilterOperator.EQ, "")
                            ],
                            urlParameters: {
                                "$top": "500"
                            },
                            success: function (data) {
                                const sortedData = data.results
                                    .map((item) => {
                                        return {
                                            ...item,
                                            Dates: DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(new Date(item.Dates))
                                        };
                                    })
                                    .sort((a, b) => that.bookSortOrder === 'Ascending' ? (a.Amount - b.Amount) : (b.Amount - a.Amount));
                                that.oModel.setProperty("/BookTransactions", sortedData);

                                BusyIndicator.hide();
                                MessageToast.show(response.Message || "Book transactions updated successfully!");
                            },

                        })
                    } else {
                        BusyIndicator.hide();
                        MessageBox.error(response && response.Message ? response.Message : "Failed to unmark transaction");
                    }
                },
                error: function (xhr, status, error) {
                    BusyIndicator.hide();

                    MessageBox.error("Failed to unmark transaction: " + (error || status));
                }
            });
        },

        onValidate: function () {
            var that = this;
            var sBankRecoId = that.oModel.getProperty("/BankRecoId");

            if (!sBankRecoId) {
                sap.m.MessageBox.warning("Please enter BankRecoId before validation.");
                return;
            }

            BusyIndicator.show();
            that.ODataModel.callFunction("/validateData", {
                method: "POST",
                urlParameters: {
                    Bankrecoid: sBankRecoId
                },
                headers: {
                    "If-Match": "*"
                },
                success: function (oData, response) {
                    BusyIndicator.hide();
                    sap.m.MessageToast.show(JSON.parse(response.headers["sap-message"]).message);

                    that.ODataModel.read(`/BankReco('${sBankRecoId}')/to_Booktrans`, {
                        filters: [
                            that.oModel.getProperty("/Remaining") && new Filter("ClearedVoucherno", FilterOperator.EQ, "")
                        ],
                        urlParameters: {
                            "$top": "500"
                        },
                        success: function (data) {
                            that.oModel.setProperty("/BookTransactions", data.results.map((item) => {
                                return {
                                    ...item,

                                    Dates: item.Dates ? DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(new Date(item.Dates)) : "",

                                    ClearedDate: item.Cleared ? DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(new Date(item.ClearedDate)) : "",

                                };
                            }));


                            that.oModel.setProperty("/Status", "Released");
                            that.ODataModel.read(`/BankReco('${that.oModel.getProperty("/BankRecoId")}')/to_Booktrans`, {
                                filters: [
                                    that.oModel.getProperty("/Remaining") && new Filter("ClearedVoucherno", FilterOperator.EQ, "")
                                ],
                                urlParameters: {
                                    "$top": "500"
                                },
                                success: function (data) {
                                    that.oModel.setProperty("/BookTransactions", data.results.map((item) => {
                                        return {
                                            ...item,
                                            Dates: DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(new Date(item.Dates)),
                                            ClearedDate: DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(new Date(item.ClearedDate)),
                                        }
                                    }));
                                },
                                error: function (error) {
                                    MessageBox.error(response.Message, error);

                                }
                            });

                        },
                        error: function () {
                            MessageBox.error("Failed to reload Book transactions after validation");
                        }
                    });
                    that.ODataModel.read(`/BankReco('${sBankRecoId}')/to_StatementTrans`, {
                        success: function (data) {
                            that.oModel.setProperty("/StatementTransactions", data.results.map((item) => {
                                return {
                                    ...item,

                                    Dates: item.Dates ? DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(new Date(item.Dates)) : ""



                                };

                            }));

                            BusyIndicator.hide();
                        },
                        error: function () {
                            BusyIndicator.hide();
                            MessageBox.error("Failed to reload Statement transactions after validation");
                        }
                    });

                },
                error: function (oError) {
                    BusyIndicator.hide();
                    sap.m.MessageBox.error("Validation failed!");
                },
            });




        },

        onUTRMarking: function () {
            var that = this;
            var sBankRecoId = that.oModel.getProperty("/BankRecoId");

            if (!sBankRecoId) {
                sap.m.MessageBox.warning("Please enter BankRecoId before validation.");
                return;
            }

            BusyIndicator.show();
            that.ODataModel.callFunction("/utrBasedReco", {
                method: "POST",
                urlParameters: {
                    Bankrecoid: sBankRecoId
                },
                headers: {
                    "If-Match": "*"
                },
                success: function (oData, response) {
                    that.onRemainingSelect();
                    BusyIndicator.hide();
                    sap.m.MessageToast.show(JSON.parse(response.headers["sap-message"]).message);
                },
                error: function (oError) {
                    BusyIndicator.hide();
                    sap.m.MessageBox.error("Validation failed!");
                },

            });
        },


        onBankValueHelp() {
            var oView = this.getView();
            var that = this;
            var oBusyDialog = new sap.m.BusyDialog({
                title: "Loading...",
                text: "Please wait while loading Bank",
                supportMultiselect: false
            });
            if (!this._oBankdialog) {
                this._oBankdialog = new sap.ui.comp.valuehelpdialog.ValueHelpDialog({

                    title: "Bank Selection",
                    key: "ChargeAccount",

                    ok: function (oEvent) {
                        var aTokens = oEvent.getParameter("tokens");
                        if (aTokens && aTokens.length > 0) {
                            var selectedBank = aTokens[0].getKey();



                            var oTable = that._oBankdialog.getTable();
                            var aSelectedIndices = oTable.getSelectedIndices();
                            if (aSelectedIndices.length > 0) {
                                var oContext = oTable.getContextByIndex(aSelectedIndices[0]);
                                var oSelectedData = oContext.getObject();
                                var selectedCompany = oSelectedData.CompanyCode;
                                var selectedBankName = oSelectedData.BankName;

                                var oInput = oView.byId("_IDGenInput");
                                if (oInput) {
                                    oInput.setValue(selectedBank);
                                }

                                that.oModel.setProperty("/Bank", selectedBank);


                                var oInputCompany = oView.byId("_IDGenInput1");
                                if (oInputCompany) {
                                    oInputCompany.setValue(selectedCompany);
                                }

                                that.oModel.setProperty("/Company", selectedCompany);


                                var oInputBankName = oView.byId("_IDGenInput6");
                                if (oInputBankName) {
                                    oInputBankName.setValue(selectedBankName);
                                }

                                that.oModel.setProperty("/BankName", selectedBankName);



                            }


                        }
                        that._oBankdialog.close();
                    },
                    cancel: function () {
                        that._oBankdialog.close();
                    }

                });
                oBusyDialog.open();
                var oFilterBar = new sap.ui.comp.filterbar.FilterBar({
                    advancedMode: true,
                    filterBarExpanded: true,
                    showGoOnFB: !sap.ui.Device.system.phone,
                    filterGroupItems: [
                        new sap.ui.comp.filterbar.FilterGroupItem({
                            groupTitle: "Bank Filter",
                            groupName: "gn1",
                            name: "n1",
                            label: "Bank",
                            control: new sap.m.Input()
                        })
                    ],
                    search: function (oEvt) {
                        oBusyDialog.open();
                        var searchValue = oEvt.getParameter("selectionSet")[0].getValue();
                        var oTable = that._oBankdialog.getTable();

                        if (searchValue === "") {
                            oTable.bindRows({
                                path: "/HouseBankVH",
                                parameters: { "$top": "5000" },
                            });
                        } else {
                            var selectedBank = oModel.getProperty("/SelectedBank") || "";

                            oTable.bindRows({
                                path: "/HouseBankVH",
                                parameters: { "$top": "5000" },
                                filters: selectedBank ?
                                    [new sap.ui.model.Filter("Bank", sap.ui.model.FilterOperator.EQ, selectedBank)] : []

                            });
                        }
                        oBusyDialog.close();
                    }
                });
                this._oBankdialog.setFilterBar(oFilterBar);

                this._oBankdialog.getTableAsync().then(function (oTable) {
                    var oColModel = new sap.ui.model.json.JSONModel({
                        cols: [
                            { label: "Account Number", template: "ChargeAccount", width: "10rem" },
                            { label: "HouseBank", template: "HouseBank", width: "20rem" },



                        ]
                    });
                    oTable.setModel(oColModel, "columns");

                    oTable.setModel(that.getOwnerComponent().getModel());

                    oTable.bindRows("/HouseBankVH");





                    oBusyDialog.close();
                }).catch(function (error) {
                    oBusyDialog.close();
                    sap.m.MessageBox.error("Failed to load BankName: " + error.message);
                });
            }

            this._oBankdialog.open();





        },
        onCompanyValueHelp() {
            var oView = this.getView();
            var that = this;
            var oBusyDialog = new sap.m.BusyDialog({
                title: "Loading...",
                text: "Please wait while loading company"
            });
            if (!this._oCompanydialog) {
                this._oCompanydialog = new sap.ui.comp.valuehelpdialog.ValueHelpDialog({

                    title: "Company Selection",
                    key: "CompanyCode",
                    ok: function (oEvent) {
                        var aTokens = oEvent.getParameter("tokens");
                        if (aTokens && aTokens.length > 0) {
                            var oInput = oView.byId("_IDGenInput1");
                            if (oInput) {
                                oInput.setValue(aTokens[0].getKey());

                            }
                            that.oModel.setProperty("/Company", aTokens[0].getKey());


                        }
                        that._oCompanydialog.close();
                    },
                    cancel: function () {
                        that._oCompanydialog.close();
                    }

                });
                oBusyDialog.open();
                var oFilterBar = new sap.ui.comp.filterbar.FilterBar({
                    advancedMode: true,
                    filterBarExpanded: true,
                    showGoOnFB: !sap.ui.Device.system.phone,
                    filterGroupItems: [
                        new sap.ui.comp.filterbar.FilterGroupItem({
                            groupTitle: "Company Filter",
                            groupName: "gn1",
                            name: "n1",
                            label: "CompanyCode",
                            control: new sap.m.Input()
                        })
                    ],
                    search: function (oEvt) {
                        oBusyDialog.open();
                        var searchValue = oEvt.getParameter("selectionSet")[0].getValue();
                        var oTable = that._oCompanydialog.getTable();

                        if (searchValue === "") {
                            oTable.bindRows({
                                path: "/CompanyCodeVH",
                                parameters: { "$top": "5000" },
                            });
                        } else {
                            oTable.bindRows({
                                path: "/CompanyCodeVH",
                                parameters: { "$top": "5000" },
                                filters: [new sap.ui.model.Filter("CompanyCode",
                                    sap.ui.model.FilterOperator.Contains,
                                    searchValue)]
                            });
                        }
                        oBusyDialog.close();
                    }
                });
                this._oCompanydialog.setFilterBar(oFilterBar);

                this._oCompanydialog.getTableAsync().then(function (oTable) {
                    var oColModel = new sap.ui.model.json.JSONModel({
                        cols: [
                            { label: "CompanyCode", template: "CompanyCode", width: "10rem" },
                            { label: "CompanyCodeName", template: "CompanyCodeName", width: "20rem" }
                        ]
                    });
                    oTable.setModel(oColModel, "columns");

                    oTable.setModel(that.getOwnerComponent().getModel());

                    oTable.bindRows("/CompanyCodeVH");

                    oBusyDialog.close();
                }).catch(function (error) {
                    oBusyDialog.close();
                    sap.m.MessageBox.error("Failed to load CompanyCode: " + error.message);
                });
            }

            this._oCompanydialog.open();





        },



        onBankRecoValueHelp: function (oInputField) {

            var oView = this.getView();
            var that = this;
            var oBusyDialog = new sap.m.BusyDialog({
                title: "Loading...",
                text: "Please wait while loading bankrecoid",
                supportMultiselect: false
            });
            if (!this._oBankrecodialog) {
                this._oBankrecodialog = new ValueHelpDialog({
                    supportMultiselect: false,
                    supportRangesOnly: false,
                    // stretch: Device.system.phone,
                    filterMode: true,
                    title: "BankrecoID Selection",
                    key: "bankrecoid",
                    ok: function (oEvent) {


                        var aTokens = oEvent.getParameter("tokens");

                        if (aTokens && aTokens.length > 0) {
                            const otoken = aTokens[0].getCustomData()[0].getValue();
                            that.oInput.setValue(otoken.bankrecoid);

                        }
                        that._oBankrecodialog.close();
                    },
                    cancel: function () {

                        that._oBankrecodialog.close();
                    }

                });
                oBusyDialog.open();
                var oFilterBar = new sap.ui.comp.filterbar.FilterBar({
                    advancedMode: true,
                    filterBarExpanded: true,
                    showGoOnFB: !sap.ui.Device.system.phone,
                    filterGroupItems: [
                        new sap.ui.comp.filterbar.FilterGroupItem({
                            groupTitle: "BANKRECOID",
                            groupName: "gn1",
                            name: "n1",
                            label: "bankrecoid",
                            control: new sap.m.Input()
                        })
                    ],
                    search: function (oEvt) {
                        oBusyDialog.open();
                        var searchValue = oEvt.getParameter("selectionSet")[0].getValue();
                        var oTable = that._oBankrecodialog.getTable();

                        if (searchValue === "") {
                            oTable.bindRows({
                                path: "/BANKRECOIDVH",
                                parameters: { "$top": "5000" },
                            });
                        } else {
                            oTable.bindRows({
                                path: "/BANKRECOIDVH",
                                parameters: { "$top": "5000" },
                                filters: [new sap.ui.model.Filter("bankrecoid",
                                    sap.ui.model.FilterOperator.Contains,
                                    searchValue)]
                            });
                        }
                        oBusyDialog.close();
                    }
                });
                this._oBankrecodialog.setFilterBar(oFilterBar);

                this._oBankrecodialog.getTableAsync().then(function (oTable) {
                    var oColModel = new sap.ui.model.json.JSONModel({
                        cols: [
                            { label: "BankRecoId", template: "bankrecoid", width: "10rem" },
                            { label: "Bank", template: "bank", width: "20rem" },
                            { label: "StatementUpto", template: "statementdate", width: "20rem" },
                            {
                                label: "Status", template: "status", width: "10rem",
                            },
                        ]
                    });
                    oTable.setModel(oColModel, "columns");

                    oTable.setModel(that.getOwnerComponent().getModel());

                    oTable.bindRows("/BANKRECOIDVH");
                    if (oTable.removeSelections) {
                        oTable.removeSelections();
                    } else if (oTable.removeSelectionInterval) {
                        var selected = oTable.getSelectedIndices();
                        selected.forEach(function (iIndex) {
                            oTable.removeSelectionInterval(iIndex, iIndex);
                        });
                    }

                    oBusyDialog.close();
                }).catch(function (error) {
                    oBusyDialog.close();
                    sap.m.MessageBox.error("Failed to load Bankrecoid: " + error.message);
                });
            }

            this._oBankrecodialog.open();

        },






        onRemainingSelect() {
            let that = this;
            let sBankRecoId = that.oModel.getProperty("/BankRecoId");
            // Load Book Transactions
            that.ODataModel.read(`/BankReco('${sBankRecoId}')/to_Booktrans`, {
                filters: [
                    that.oModel.getProperty("/Remaining") && new Filter("ClearedVoucherno", FilterOperator.EQ, "")
                ],
                urlParameters: {
                    "$top": "500"
                },
                success: function (oData) {
                    that.oModel.setProperty("/BookTransactions", oData.results.map((item) => {
                        return {
                            ...item,
                            Dates: item.Dates ? DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(new Date(item.Dates)) : "",
                            ClearedDate: item.ClearedDate ? DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(new Date(item.ClearedDate)) : ""
                        };
                    }));
                },
                error: function () {
                    MessageBox.error("Failed to load Book transactions");
                }
            });

            // Load Statement Transactions
            that.ODataModel.read(`/BankReco('${sBankRecoId}')/to_StatementTrans`, {
                filters: [
                    that.oModel.getProperty("/Remaining") && new Filter("ClearedVoucherno", FilterOperator.EQ, "")
                ],
                urlParameters: {
                    "$top": "500"
                },
                success: function (oData) {
                    that.oModel.setProperty("/StatementTransactions", oData.results.map((item) => {
                        return {
                            ...item,
                            Dates: item.Dates ? DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(new Date(item.Dates)) : ""
                        };
                    }));
                    BusyIndicator.hide();
                    MessageToast.show("Data loaded for BankRecoId: " + sBankRecoId);
                },
                error: function () {
                    BusyIndicator.hide();
                    MessageBox.error("Failed to load Statement transactions");
                }
            });


        },

        onClear: function () {
            var oModel = this.getView().getModel();
            //clear inpur field 
            oModel.setProperty("/Bank", "");
            oModel.setProperty("/Company", "");
            oModel.setProperty("/Status", "");
            oModel.setProperty("/BankRecoId", "");
            oModel.setProperty("/FiscalYear", "");
            oModel.setProperty("/BankName", "");
            oModel.setProperty("/Statementdate", null);
            oModel.setProperty("/isEditable", true);
            oModel.setProperty("/Remaining", false);
            oModel.setProperty("/BookTransactions", []);
            oModel.setProperty("/StatementTransactions", []);
            oModel.refresh(true);
            MessageToast.show("All Fields clear successfully!");


        },
        onDelete: function () {
            var that = this;
            var sBankRecoId = that.oModel.getProperty("/BankRecoId");

            if (!sBankRecoId) {
                sap.m.MessageBox.warning("Please enter BankRecoId before validation.");
                return;
            }
            BusyIndicator.show();
            that.ODataModel.callFunction("/deleteRecords", {
                method: "POST",
                urlParameters: {
                    Bankrecoid: sBankRecoId
                },
                headers: {
                    "If-Match": "*"
                },
                success: function (oData, response) {
                    BusyIndicator.hide();
                    sap.m.MessageToast.show(JSON.parse(response.headers["sap-message"]).message);





                    that.onClear();
                },


                error: function (oError) {
                    BusyIndicator.hide();
                    sap.m.MessageBox.error("Delete failed!");
                },


            })




        }


    });
});
