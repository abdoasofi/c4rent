// Copyright (c) 2023, Connect 4 Systems and contributors
// For license information, please see license.txt

frappe.ui.form.on('Rent', {
	// refresh: function(frm) {

	// }
});
frappe.ui.form.on("Rent", {
	refresh: function(frm, cdt, cdn) {
		if (frm.doc.docstatus == 1){
			frm.add_custom_button(__("Sales Invoice"), function() {
				var child = locals[cdt][cdn];
				frappe.route_options = {
					"rent": frm.doc.name,
					"customer": frm.doc.customer,
					"branch": frm.doc.branch,
					"cost_center": frm.doc.cost_center,
					"from_warehouse": frm.doc.target_warehouse,
					"to_warehouse": frm.doc.source_warehouse,
					"selling_price_list": "Daily"
				};
				frappe.new_doc("Sales Invoice");
			}, __("Create"));
		}
	}
});

frappe.ui.form.on("Rent", {
	refresh: function(frm, cdt, cdn) {
		if (frm.doc.docstatus == 1){
			frm.add_custom_button(__("Payment Entry"), function() {
				var child = locals[cdt][cdn];
				frappe.route_options = {
					"payment_type": "Receive",
					"party_type": "Customer",
					"party": frm.doc.customer,
				};
				frappe.new_doc("Payment Entry");
			}, __("Create"));
		}
	}
});

frappe.ui.form.on("Rent", "validate", function(){
    for (var i = 0; i < cur_frm.doc.time_logs.length; i++){
    cur_frm.doc.time_logs[i].uom= cur_frm.doc.rent_type;
    }
    cur_frm.refresh_field('time_logs');
});

frappe.ui.form.on("Rent Detail", "rate", function(frm, doctype, name) { let row = locals[doctype][name]; row.amount = row.rate * row.qty; refresh_field("time_logs"); });



// frappe.ui.form.on('Rent Detail',"qty", function(frm, cdt, cdn) {
//     $.each(frm.doc.time_logs || [], function(i, d) {

//          d.amount = d.qty * d.rate;

//     });
// });

// frappe.ui.form.on("Rent", {
// validate:function(frm, cdt, cdn){
// var dw = locals[cdt][cdn];
// var total = 0;
// var total2 = 0;

// frm.doc.time_logs.forEach(function(dw) { total += dw.qty; });
// frm.set_value("total_qty", total);
// refresh_field("total_qty");

// frm.doc.time_logs.forEach(function(dw) { total2 += dw.amount; });
// frm.set_value("price_per_day_or_month", total2);
// refresh_field("price_per_day_or_month");
// }, });

frappe.ui.form.on("Rent", "validate", function(){
	for (var i = 0; i < cur_frm.doc.time_logs.length; i++){
	cur_frm.doc.time_logs[i].source_warehouse= cur_frm.doc.source_warehouse;
	}
	cur_frm.refresh_field('time_logs');
	});

frappe.ui.form.on("Rent", "validate", function(frm, cdt, cdn) {
	$.each(frm.doc.time_logs || [], function(i, d) {
	 frappe.call({
		'method': 'frappe.client.get_value',
		'args': {
		'doctype': 'Bin',
		'fieldname': 'actual_qty',
		'filters': {
		'item_code': d.item_code,
		"warehouse": cur_frm.doc.source_warehouse
		}
		}
		,
		callback: function(r){
		d.actual_qty = r.message.actual_qty;
		}
	});
	});
	});

	frappe.ui.form.on("Rent Detail", "item_code", function(frm, cdt, cdn) {
		if (cur_frm.doc.rent_type == "Daily"){
			$.each(frm.doc.time_logs || [], function(i, d) {
				frappe.call({
				   'method': 'frappe.client.get_value',
				   'args': {
				   'doctype': 'Item Price',
				   'fieldname': 'price_list_rate',
				   'filters': {
				   'item_code': d.item_code,
				   "price_list": "Daily"
				   }
				   }
				   ,
				   callback: function(r){
				   d.rate = r.message.price_list_rate;
				   cur_frm.refresh_field('rate');
				   }
			   });
			   });
		}
		else {
			$.each(frm.doc.time_logs || [], function(i, d) {
				frappe.call({
				   'method': 'frappe.client.get_value',
				   'args': {
				   'doctype': 'Item Price',
				   'fieldname': 'price_list_rate',
				   'filters': {
				   'item_code': d.item_code,
				   "price_list": "Monthly"
				   }
				   }
				   ,
				   callback: function(r){
				   d.rate = r.message.price_list_rate;
				   cur_frm.refresh_field('rate');
				   }
				   
			   });
			   });
		}
		cur_frm.refresh_field('time_logs');
	});

	// frappe.ui.form.on("Rent", "return", function(frm) {
	// 	frappe.call({
	// 		method: "stop_auto_repeat",
	// 		args:{
	// 			"doc": frm.doc.name,
	// 		},
	// 		callback: function(r) {
	// 			frm.refresh_fields();
	// 		}
	// 	});
	// });
	// frappe.ui.form.on('Rent', {
	// 	refresh: function(frm) {
	// 		// Check if both 'field1' and 'field2' meet the conditions
	// 		if (frm.doc.rent_type === "Monthly"  && frm.doc.status==="Submitted") {
	// 			frm.toggle_display('return', true);
	// 		} else {
	// 			frm.toggle_display('return', false);
	// 		}
	// 	}
	// });