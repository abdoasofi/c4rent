// Copyright (c) 2023, Connect 4 Systems and contributors
// For license information, please see license.txt

frappe.ui.form.on('Rent', {
	refresh: function(frm) {
		initialize_slider(frm);
	}
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


	
function initialize_slider(frm) {
    let html_field = frm.get_field('item_group_html');
    if (!html_field || html_field.slider_initialized) return;

    html_field.slider_initialized = true;

    if (!html_field.$wrapper.find('.swiper-container').length) {
        html_field.$wrapper.html(`
            <div class="swiper-container">
                <div class="swiper-wrapper" id="item_group-container"></div>
                <div class="swiper-button-next"></div>
                <div class="swiper-button-prev"></div>
                <div class="swiper-pagination"></div>
            </div>
        `);
    }

    load_item_group(frm);
}

function load_item_group(frm) {
    frappe.call({
        doc: frm.doc,
        method: "get_item_group",
        callback: function(r) {
            if (r.message) {
                const container = frm.get_field('item_group_html').$wrapper.find('#item_group-container');
                container.empty();

                if (frm.doc.docstatus === 1) { // إذا كان المستند معتمدًا
                    const selected_item_group = frm.doc.item_group ;
                    if (!selected_item_group) {
                        container.html("<p>لم يتم اختيار مجموعة الاصناف.</p>");
                        return;
                    }

                    // جلب تفاصيل مجموعة الاصناف المختارة
                    frappe.call({
                        doc: frm.doc,
                        method: "get_item_group_details",
                        args: {
                            item_group: selected_item_group
                        },
                        callback: function(res) {
                            if (res.message && Object.keys(res.message).length > 0) {
                                let ig = res.message;
                                let image_src = ig.file_image ? frappe.utils.get_file_link(ig.file_image) : '/assets/your_app/images/default.png';

                                const slide = `
                                    <div class="swiper-slide">
                                        <div class="card">
                                            <img src="${image_src}" class="card-img-top" alt="${ig.name}">
                                            <div class="card-body">
                                                <h5 class="card-title">${ig.name}</h5>
                                                <button class="btn btn-success" disabled>تم اختيار مجموعة الاصناف</button>
                                            </div>
                                        </div>
                                    </div>
                                `;
                                container.append(slide);
                                initialize_swiper(frm, true); // تمرير true لوضع القراءة
                            } else {
                                container.html("<p>مجموعة الاصناف المختارة غير موجودة.</p>");
                            }
                        },
                        error: function(error) {
                            container.html("<p>حدث خطأ أثناء جلب تفاصيل مجموعة الاصناف.</p>");
                            console.error(error);
                        }
                    });
                } else { // إذا كان المستند غير معتمدًا
                    if (r.message.length === 0) {
                        container.html("<p>لا توجد مجموعة اصناف متاحة.</p>");
                        return;
                    }

                    r.message.forEach(ig => {
                        let image_src = ig.file_image ? frappe.utils.get_file_link(ig.file_image) : '/assets/your_app/images/default.png';

                        const slide = `
                            <div class="swiper-slide">
                                <div class="card">
                                    <img src="${image_src}" class="card-img-top" alt="${ig.name}">
                                    <div class="card-body">
                                        <h5 class="card-title">${ig.name}</h5>
                                        <button class="btn selected_item_group" data-item_group="${ig.name}">اختار مجموعة الاصناف</button>
                                    </div>
                                </div>
                            </div>
                        `;
                        container.append(slide);
                    });

                    initialize_swiper(frm, false); // تمرير false لوضع التحرير
                }
            } else {
                frappe.msgprint(__("لم يتم العثور على مجموعة الاصناف لعرضها."));
            }
        },
        error: function(error) {
            frappe.msgprint(__("حدث خطأ أثناء جلب مجموعة الاصناف. يرجى المحاولة لاحقًا."));
            console.error(error);
        }
    });
}

function initialize_swiper(frm, read_only) {
    const html_field = frm.get_field('item_group_html');
    let swiperElement = html_field.$wrapper.find('.swiper-container')[0];

    // تأكد من تدمير السلايدر السابق إذا كان موجودًا
    if (html_field.swiper_instance) {
        html_field.swiper_instance.destroy(true, true);
    }

    // تهيئة السلايدر بناءً على الحالة (قراءة أو تحرير)
    html_field.swiper_instance = new Swiper(swiperElement, {
        slidesPerView: 1, // عرض بطاقة واحدة فقط
        spaceBetween: 30,
        effect: 'cube',
        cubeEffect: {
          shadow: true,
          slideShadows: true,
          shadowOffset: 20,
          shadowScale: 0.94,
        },
        loop: !read_only, // السماح بالتكرار إذا كان الوضع تحرير
        pagination: {
            el: html_field.$wrapper.find('.swiper-pagination')[0],
            clickable: true,
        },
        navigation: {
            nextEl: html_field.$wrapper.find('.swiper-button-next')[0],
            prevEl: html_field.$wrapper.find('.swiper-button-prev')[0],
            enabled: !read_only // تمكين التنقل إذا كان الوضع تحرير
        },
        keyboard: {
            enabled: !read_only,          // تمكين التحكم باللوحة المفاتيح إذا كان الوضع تحرير
            onlyInViewport: true,   // السماح بالتحكم فقط عندما يكون السلايدر في العرض
        },
        mousewheel: {
            invert: false,            // عكس اتجاه التمرير إذا لزم الأمر
            enabled: !read_only,     // تمكين التمرير بالماوس إذا كان الوضع تحرير
        },
    });

    if (read_only) {
        // إخفاء أزرار التنقل في وضع القراءة
        html_field.$wrapper.find('.swiper-button-next, .swiper-button-prev').hide();
    } else {
        // إظهار أزرار التنقل في وضع التحرير
        html_field.$wrapper.find('.swiper-button-next, .swiper-button-prev').show();

        // تعيين أحداث النقر على أزرار اختيار الحزمة فقط في وضع التحرير
        html_field.$wrapper.find('.selected_item_group').on('click', function() {
            const itemGroupName = $(this).data('item_group');
            if(itemGroupName) {
                frm.set_value('item_group', itemGroupName);
                frappe.msgprint(__("تم اختيار : " + itemGroupName));
                load_item_group(frm);
            } else {
                console.error("لا يوجد قيمة لاسم مجموعة الأصناف");
            }
        });
    }

    if (!document.getElementById('slider-styles')) {
        let style = document.createElement('style');
        style.id = 'slider-styles';
        style.innerHTML = `
            /* توحيد مقاسات البطاقات */
            .card {
                width: 100%; /* استخدام 100% ضمن السلايدر */
                max-width: 400px; /* أقصى عرض للبطاقة */
                height: 100%; /* استخدام 100% لضمان التناسب */
                min-height: 450px; /* ارتفاع أدنى */
                border: none;
                border-radius: 15px; 
                overflow: hidden;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                transition: transform 0.3s, box-shadow 0.3s;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                background: linear-gradient(to bottom, #ffffff, #f9f9f9);
            }
            .card:hover {
                transform: scale(1.05); 
                box-shadow: 0 15px 40px rgba(0,0,0,0.2);
            }
            .card img {
                width: 100%;
                height: 60%; 
                object-fit: cover; 
            }
            .card-body {
                padding: 15px;
                flex-grow: 1; 
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                text-align: center;
            }
            .card-title {
                font-family: 'Arial', sans-serif;
                font-size: 1.5rem; /* حجم أكبر للعناوين */
                color: #333;
                margin-bottom: 10px;
            }
            .card-text {
                font-size: 1rem;
                color: #666;
                flex-grow: 1;
            }
            .selected_item_group {
                width: 100%;
                margin-top: 20px;
                background-color: #28a745; 
                color: white;
                border: none;
                border-radius: 5px; 
                padding: 10px;
                transition: background-color 0.3s; 
                font-weight: bold; 
                cursor: pointer;
            }
            .selected_item_group:hover {
                background-color: #218838; 
            }
            .swiper-container {
                width: 100%;
                padding-top: 20px;
                padding-bottom: 50px;
            }
            .swiper-slide {
                display: flex;
                justify-content: center;
                align-items: center;
            }
            .swiper-button-next {
            background-color: #00b64a00;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            }
            .swiper-button-prev {
            background-color: #00b64a00;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            }  
            /* تحسين التجاوب */
            @media (max-width: 768px) {
                .card {
                    max-width: 90%;
                    min-height: 400px;
                }
                .card-title {
                    font-size: 1.3rem;
                }
                .card-text {
                    font-size: 0.95rem;
                }
                .selected_item_group {
                    padding: 8px;
                    margin-top: 15px;
                }
            }

            @media (max-width: 480px) {
                .card {
                    max-width: 100%;
                    min-height: 350px;
                }
                .card-title {
                    font-size: 1.1rem;
                }
                .card-text {
                    font-size: 0.9rem;
                }
                .selected_item_group {
                    padding: 6px;
                    margin-top: 10px;
                }
            }
        `;
        document.head.appendChild(style);
    } 
}

function make_slider_readonly(frm) {
    // إعادة تحميل السلايدر ليعرض الحزمة المختارة فقط وتعطيل التنقل
    load_item_group(frm);
    
}