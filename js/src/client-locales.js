//! client-locales.js
//! version : 0.0.1
//! authors : Vision
//! license : MIT
//! github

var minDate = '1/1/2025 12:00 AM';

function convertToclientTime(container) {
	$(container).find('.utctime').each(function (index, el) {
		convertToClientTime(el);
	});
}

function convertAllToClientTime() {
	$('.utctime').each(function (index, el) {
		convertToClientTime(el);
	});
}

function convertToClientTime(el) {
	var reqFormat = $(el).data('format');
	var isoDate = $(el).text().trim();
	
	var clientDateTime = moment(isoDate).format(reqFormat);
    
	$(el).prev('.market-time').text(clientDateTime);
}

function updateDates() {
	var utcFromDate = localDateToUtc($("#DisplayFrom").val());

	var fromD = moment.utc(utcFromDate);

	if (fromD < moment.utc(minDate)) {
		utcFromDate = moment.utc(minDate).format('MM/DD/YYYY hh:mm A');
    }

	$("#From").val(utcFromDate);

	var utcToDate = localDateToUtc($("#DisplayTo").val());
	$("#To").val(utcToDate);
	return true;
}

function localDateToUtc(date) {
	var utcDate = moment(date).utc().format('M/D/YYYY h:mm A');
	return utcDate;
}

$(document).ready(function () {
	convertAllToClientTime();

	var fromClientDate = $("#ReportFrom").siblings('.market-time').text();

	if (fromClientDate !== "") {
		var toClientDate = $("#ReportTo").siblings('.market-time').text();

		$('#ReportFrom').datetimepicker({
			defaultDate: fromClientDate,
			minDate: minDate
		});

		$('#ReportTo').datetimepicker({
			defaultDate: toClientDate
		});
	}
});