let orderTable = new Tabulator("#example", {
    pagination: true,
    paginationSize: 100,
    paginationCounter:"rows",
    layout: "fitColumns",
    responsiveLayout: "hide",
    columns: [
        { title: "Runner", field: "rn" },
        { title: "Price", field: "mp" },
        { title: "Size", field: "ms" },
        { title: "Customer", field: "bn" },
        { title: "Dealer", field: "mn" },
        { title: "Side", field: "bs", visible: false }  // Hide the 'Side' column in the table but keep the data
    ],
    rowFormatter: function (row) {
        let data = row.getData();

        // Apply classes based on the value of 'bs' (Side)
        if (data.bs === "L") {
            row.getElement().classList.add("order-l");
        } else if (data.bs === "B") {
            row.getElement().classList.add("order-b");
        }
    }
});