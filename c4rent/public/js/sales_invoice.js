frappe.ui.form.on("Sales Invoice", {
    onload: function(frm) {
    frm.doc.rent ? fetch_items(frm,frm.doc.rent) : console.log(frm.doc.rent);
	}
});

let fetch_items =  (frm, rent_name) => {
	if (frm.doc.__islocal && cur_frm.doc.selling_price_list == "Daily") {
		    frm.doc.items = [];
	frappe.call(
			{
			method: 'frappe.client.get_list',
			args: {
					'doctype': 'Rent Detail',
					"parent": "Rent",
					'filters': {'parent': frm.doc.rent,
					    "returned":0,
					},
					'fields': [
						'name',
						"item_name",
						"item_code",
						"rate",
						'income_account',
						"uom",
						"qty",
						"return_qty"
						
					]
				},
			callback:  (r) =>{
				if (r.message) {
				         let returnedrentdata = get_item_code(frm, frm.doc.rent);

					    r.message.forEach((value, idx, arr)=>{
					   if ((value.qty - value.return_qty)>0){
					       let items = frm.add_child("items");
						items.item_code=value.item_code;
						items.item_name=value.item_name;
						items.description=value.item_name;
						items.income_account='خدمة - EA';
						items.rate=value.rate;
						items.uom=value.uom;
						items.rent_detail = value.name;
						items.rent_qty = value.qty - value.return_qty;
					       
					   }
						


					});
					frm.refresh_field('items');
					// frm.save()
				    
				}
				
			},
			freeze: true,
			freeze_message: __(`Filling items Table ......`)
		});
	}



};

let get_item_code =  (frm, rent) => {
	if (frm.doc.__islocal && cur_frm.doc.selling_price_list == "Daily") {
		 const desk = {
   name: "4 feet",
   rent_item: "30 pounds",
   date: "brown",
 };
	frappe.call(
			{
			method: 'frappe.client.get_list',
			args: {
					'doctype': 'Rent',
					'filters': {'name': frm.doc.rent},
					'fields': [
						'name',
						"date",
					]
				},
			callback:  (r) =>{
				if (r.message) {
				    let date_1 = new Date(frm.doc.posting_date);
                    let date_2 = new Date(r.message[0].date);
                    const days = (date_1, date_2) =>{
                        let difference = date_1.getTime() - date_2.getTime();
                        let TotalDays = Math.ceil(difference / (1000 * 3600 * 24));
                        if (TotalDays === 0){
                            TotalDays = 1
                        }
                        return TotalDays;
                        
                    };
                    frm.doc.items.forEach((item, idx, arr)=> {
        			cur_frm.get_field("items").grid.grid_rows[idx].doc.days = days(date_1, date_2) 
        			cur_frm.get_field("items").grid.grid_rows[idx].doc.qty = days(date_1, date_2) * cur_frm.get_field("items").grid.grid_rows[idx].doc.rent_qty;


                    })

				}
				
			},
		});
	}


};


frappe.ui.form.on('Sales Invoice',"validate", function(frm, cdt, cdn) {
    $.each(frm.doc.items || [], function(i, d) {
        if(cur_frm.doc.rent && cur_frm.doc.selling_price_list == "Daily"){
         d.qty = d.rent_qty * d.days;
    }
    });
});