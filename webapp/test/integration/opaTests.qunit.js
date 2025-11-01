/* global QUnit */
QUnit.config.autostart = false;

sap.ui.require(["zbankrecoapp/test/integration/AllJourneys"
], function () {
	QUnit.start();
});
