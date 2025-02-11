// Copyright (c) 2023, Connect 4 Systems and contributors
// For license information, please see license.txt

frappe.ui.form.on('Rent', {
    refresh: function(frm) {
        initialize_slider(frm);
        if (frm.doc.item_group) {
            load_items(frm, frm.doc.item_group);
        }

    },
    item_group: function(frm) {
        load_items(frm,frm.doc.item_group); // Load items based on the selected item group
    }
});

frappe.ui.form.on("Rent", {
    refresh: function(frm, cdt, cdn) {
        if (frm.doc.docstatus == 1) {
            frm.add_custom_button(__("Sales Invoice"), function() {
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
        if (frm.doc.docstatus == 1) {
            frm.add_custom_button(__("Payment Entry"), function() {
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

frappe.ui.form.on("Rent", "validate", function() {
    for (var i = 0; i < cur_frm.doc.time_logs.length; i++) {
        cur_frm.doc.time_logs[i].uom = cur_frm.doc.rent_type;
    }
    cur_frm.refresh_field('time_logs');
});

frappe.ui.form.on("Rent Detail", "rate", function(frm, doctype, name) {
    let row = locals[doctype][name];
    row.amount = row.rate * row.qty; 
    refresh_field("time_logs");
});

frappe.ui.form.on("Rent", "validate", function(frm, cdt, cdn) {
    $.each(frm.doc.time_logs || [], function(i, d) {
        d.source_warehouse = frm.doc.source_warehouse;
    });
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
    frm.refresh_field('time_logs');
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
            },
            callback: function(r) {
                d.actual_qty = r.message.actual_qty;
            }
        });
    });
});

frappe.ui.form.on("Rent Detail", "item_code", function(frm, cdt, cdn) {
    const priceList = cur_frm.doc.rent_type == "Daily" ? "Daily" : "Monthly";
    $.each(frm.doc.time_logs || [], function(i, d) {
        frappe.call({
            'method': 'frappe.client.get_value',
            'args': {
                'doctype': 'Item Price',
                'fieldname': 'price_list_rate',
                'filters': {
                    'item_code': d.item_code,
                    "price_list": priceList
                }
            },
            callback: function(r) {
                d.rate = r.message.price_list_rate;
                cur_frm.refresh_field('rate');
            }
        });
    });
    cur_frm.refresh_field('time_logs');
});

//----------------------------------------------------------------------------------
// سلايدر مجموعات الأصناف
//----------------------------------------------------------------------------------

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

                if (frm.doc.docstatus === 1) {
                    const selected_item_group = frm.doc.item_group;
                    if (!selected_item_group) {
                        container.html("<p>لم يتم اختيار مجموعة الاصناف.</p>");
                        return;
                    }

                    frappe.call({
                        doc: frm.doc,
                        method: "get_item_group_details",
                        args: {
                            item_group: selected_item_group
                        },
                        callback: function(res) {
                            if (res.message) {
                                let ig = res.message;
                                let image_src = ig.image ? frappe.utils.get_file_link(ig.image) : '/assets/your_app/images/default.png';

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
                                initialize_swiper(frm, true);
                            } else {
                                container.html("<p>مجموعة الاصناف المختارة غير موجودة.</p>");
                            }
                        }
                    });
                } else {
                    if (r.message.length === 0) {
                        container.html("<p>لا توجد مجموعة اصناف متاحة.</p>");
                        return;
                    }

                    r.message.forEach(ig => {
                        let image_src = ig.image ? frappe.utils.get_file_link(ig.image) : '/assets/your_app/images/default.png';

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

                    initialize_swiper(frm, false);
                }
            } else {
                frappe.msgprint(__("لم يتم العثور على مجموعة الاصناف لعرضها."));
            }
        }
    });
}

function initialize_swiper(frm, read_only) {
    const html_field = frm.get_field('item_group_html');
    let swiperElement = html_field.$wrapper.find('.swiper-container')[0];

    if (html_field.swiper_instance) {
        html_field.swiper_instance.destroy(true, true);
    }

    html_field.swiper_instance = new Swiper(swiperElement, {
        slidesPerView: 3,
        spaceBetween: 30,
        // effect: 'cube',
        // cubeEffect: {
        //     shadow: true,
        //     slideShadows: true,
        //     shadowOffset: 20,
        //     shadowScale: 0.94,
        // },
        loop: !read_only,
        pagination: {
            el: html_field.$wrapper.find('.swiper-pagination')[0],
            clickable: true,
        },
        navigation: {
            nextEl: html_field.$wrapper.find('.swiper-button-next')[0],
            prevEl: html_field.$wrapper.find('.swiper-button-prev')[0],
            enabled: !read_only
        },
        keyboard: {
            enabled: !read_only,
            onlyInViewport: true,
        },
        mousewheel: {
            invert: false,
            enabled: !read_only,
        },
    });

    if (read_only) {
        html_field.$wrapper.find('.swiper-button-next, .swiper-button-prev').hide();
    } else {
        html_field.$wrapper.find('.swiper-button-next, .swiper-button-prev').show();

        html_field.$wrapper.find('.selected_item_group').on('click', function() {
            const itemGroupName = $(this).data('item_group');
            if (itemGroupName) {
                frm.set_value('item_group', itemGroupName);
                
                frm.save().then(() => {
                    frappe.msgprint(__("تم اختيار : " + itemGroupName + " وتم حفظ المستند بنجاح."));
                    load_item_group(frm);
                }).catch(err => {
                    console.error("خطأ في حفظ المستند: ", err);
                    frappe.msgprint(__("حدث خطأ أثناء حفظ المستند."));
                });
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
                border: 4px solid #7E546F;
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
                color: #7E546F;;
                margin-bottom: 10px;
            }
            .card-text {
                font-size: 1rem;
                color: #7E546F;
                flex-grow: 1;
            }
            .selected_item_group {
                width: 100%;
                margin-top: 20px;
                background-color: #7E546F; 
                color: white;
                border: none;
                border-radius: 5px; 
                padding: 10px;
                color:rgb(233, 218, 228);;
                transition: background-color 0.3s; 
                font-weight: bold; 
                cursor: pointer;
            }
            .selected_item_group:hover {
                background-color:rgb(124, 56, 100); 
                color:rgb(233, 218, 228);;

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
            color:#7E546F;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            }
            .swiper-button-prev {
            color:#7E546F;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            }  
            .swiper-pagination-bullet {
                background: #ddd; /* لون النقاط غير النشطة */
                opacity: 1; /* تأكد من أنها مرئية */
            }

            .swiper-pagination-bullet-active {
                background: #7E546F; /* لون النقطة النشطة */
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

//----------------------------------------------------------------------------------
// سلايدر الأصناف
//----------------------------------------------------------------------------------

function load_items(frm, item_group) {
    if (!item_group) return;

    frappe.call({
        doc: frm.doc,
        method: "get_items",
        args: { item_group: item_group },
        callback: function(response) {
            const items = response.message;
            const container = frm.get_field('item_html').$wrapper;

            // إعداد بنية HTML للسلايدر
            container.html(`
                <div class="swiper-container">
                    <div class="swiper-wrapper" id="item-container"></div>
                    <div class="swiper-button-next"></div>
                    <div class="swiper-button-prev"></div>
                    <div class="swiper-pagination"></div>
                </div>
            `);

            const itemContainer = container.find('#item-container');

            if (items && items.length) {
                items.forEach(function(item) {
                    const slide = `
                    <div class="swiper-slide">
                        <div class="card">
                            <img src="${item.image || '/assets/your_app/images/default.png'}" class="card-img-top" alt="${item.item_name}">
                            <div class="card-body">
                                <h5 class="card-title">${item.item_name}</h5>
                                <button data-item_code="${item.name}" class="btn btn-success select_item" style="background-color: #7E546F; border-color: #7E546F; color: white;">اختيار العنصر</button>
                            </div>
                        </div>
                    </div>
                `;
                    itemContainer.append(slide);
                });

                // تهيئة سلايدر العناصر
                initialize_item_slider(frm ,container);
            } else {
                itemContainer.html("<p>لا توجد عناصر مرتبطة بمجموعة الأصناف المختارة.</p>");
            }
        },
        error: function(error) {
            console.error("Error loading items: ", error);
            frm.get_field('item_html').$wrapper.html("<p>حدث خطأ أثناء جلب العناصر.</p>");
        }
    });
}
// تهيئة سلايدر العناصر
function initialize_item_slider(frm, container) {
    const swiperContainer = container.find('.swiper-container')[0];

    const swiper = new Swiper(swiperContainer, {
        slidesPerView: 5,
        // spaceBetween: 30,
        // effect: 'cube',
        // cubeEffect: {
        //     shadow: true,
        //     slideShadows: true,
        //     shadowOffset: 20,
        //     shadowScale: 0.94,
        // },
        loop: false,
        pagination: {
            el: container.find('.swiper-pagination')[0],
            clickable: true,
        },
        navigation: {
            nextEl: container.find('.swiper-button-next')[0],
            prevEl: container.find('.swiper-button-prev')[0],
        },
    });

    container.find('.select_item').on('click', (function(current_frm) { // Create a closure
        return function() {
            const itemCode = $(this).data('item_code');

            if (itemCode) {
                add_item_to_table(current_frm, itemCode); // Use the captured 'current_frm'
            }
        };
    })(frm));
}

//----------------------------------------------------------------------------------
// Add item to sub-table
//----------------------------------------------------------------------------------

function add_item_to_table(frm, item_code) {
    const priceList = frm.doc.rent_type === "Daily" ? "Daily" : "Monthly"; 
    frappe.call({
        method: 'frappe.client.get',
        args: {
            doctype: 'Item',
            name: item_code
        },
        callback: function(item_response) {
            const item_details = item_response.message;

            if (item_details) {
                frappe.call({
                    method: 'frappe.client.get_value',
                    args: {
                        doctype: 'Item Price',
                        filters: {
                            item_code: item_details.name,
                            price_list: priceList
                        },
                        fieldname: 'price_list_rate'
                    },
                    callback: function(price_response) {
                        const price = price_response.message ? price_response.message.price_list_rate : 0;

                        let item_found = false;
                        let row_name = null; 

                        // Search for existing item in the table and store the row name if found
                        frm.doc.time_logs.forEach(function(log) {
                            if (log.item_code === item_details.name) {
                                item_found = true;
                                row_name = log.name;
                            }
                        });

                        if (item_found && row_name) {
                            // Get the existing row by name to update it
                            frappe.model.set_value(
                                'Rent Detail', row_name, 'qty',
                                frappe.model.get_value('Rent Detail', row_name, 'qty') + 1
                            );

                            frappe.model.set_value(
                                'Rent Detail', row_name, 'amount',
                                frappe.model.get_value('Rent Detail', row_name, 'qty') * price
                            );
                        } else {
                            // Add a new row if the item is not found
                            const new_row = frm.add_child('time_logs');
                            new_row.item_code = item_details.name;
                            new_row.item_name = item_details.item_name;
                            new_row.rate = price;
                            new_row.qty = 1;
                            new_row.amount = new_row.qty * new_row.rate;
                        }

                        // Refresh the field to show updated data
                        frm.refresh_field('time_logs');

                        // Save the form
                        frm.save_or_update().then(() => {
                            frappe.msgprint(__('تم حفظ التغييرات بنجاح.'));
                        }).catch(err => {
                            frappe.msgprint(__('حدث خطأ أثناء حفظ التغييرات.'));
                        });
                    },
                    error: function(err) {
                        console.error("Error fetching item price: ", err);
                        frappe.msgprint(__('Could not fetch item price.'));
                    }
                });
            } else {
                frappe.msgprint(__('Item not found or invalid item code.'));
            }
        },
        error: function(err) {
            console.error("Error fetching item details: ", err);
            frappe.msgprint(__('Could not fetch item details.'));
        }
    });
}